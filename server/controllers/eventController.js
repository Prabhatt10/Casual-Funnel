import Event from '../models/Event.js';

// @desc    Store incoming tracking event
// @route   POST /api/events
// @access  Public
export const createEvent = async (req, res, next) => {
  try {
    const {
      session_id,
      event_type,
      page_url,
      timestamp,
      x,
      y,
      scrollY,
      scrollPercentage,
      windowWidth,
      windowHeight
    } = req.body;

    // Basic Validation
    if (!session_id || !event_type || !page_url || !timestamp) {
      res.status(400);
      throw new Error('Please provide all required fields: session_id, event_type, page_url, timestamp');
    }

    const eventData = {
      sessionId: session_id,
      eventType: event_type,
      pageUrl: page_url,
      timestamp: new Date(timestamp)
    };

    if (event_type === 'click' || event_type === 'mouse_move') {
      eventData.coordinates = {
        x: x !== undefined ? Number(x) : null,
        y: y !== undefined ? Number(y) : null
      };
    }

    if (event_type === 'scroll') {
      eventData.scroll = {
        scrollY: scrollY !== undefined ? Number(scrollY) : null,
        scrollPercentage: scrollPercentage !== undefined ? Number(scrollPercentage) : null
      };
    }

    if (event_type === 'window_resize') {
      eventData.resize = {
        windowWidth: windowWidth !== undefined ? Number(windowWidth) : null,
        windowHeight: windowHeight !== undefined ? Number(windowHeight) : null
      };
    }

    const event = await Event.create(eventData);

    // Emit live update using Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.emit('newEvent', event);
      
      // Heatmap real-time socket click broadcaster
      if (event.eventType === 'click') {
        io.emit('click_received', event);
      }
    }

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated list of sessions
// @route   GET /api/sessions
// @access  Public
export const getSessions = async (req, res, next) => {
  try {
    const { search, startDate, endDate, page = 1, limit = 10 } = req.query;

    const matchQuery = {};

    // Filter by search (sessionId match)
    if (search) {
      matchQuery.sessionId = { $regex: search, $options: 'i' };
    }

    // Filter by dates
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.timestamp.$lte = end;
      }
    }

    // Get total unique sessions for pagination calculations
    // To do this accurately with matching filters, we can aggregate
    const countPipeline = [
      { $match: matchQuery },
      { $group: { _id: '$sessionId' } },
      { $count: 'count' }
    ];
    
    const countResult = await Event.aggregate(countPipeline);
    const totalSessions = countResult.length > 0 ? countResult[0].count : 0;

    // Main Aggregation Pipeline
    const pagenum = parseInt(page);
    const limitnum = parseInt(limit);
    const skipnum = (pagenum - 1) * limitnum;

    const aggregationPipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$sessionId',
          totalEvents: { $sum: 1 },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
          pageViews: {
            $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] }
          },
          clicks: {
            $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] }
          }
        }
      },
      { $sort: { lastSeen: -1 } },
      { $skip: skipnum },
      { $limit: limitnum },
      {
        $project: {
          _id: 0,
          sessionId: '$_id',
          totalEvents: 1,
          firstSeen: 1,
          lastSeen: 1,
          pageViews: 1,
          clicks: 1
        }
      }
    ];

    const sessions = await Event.aggregate(aggregationPipeline);

    res.json({
      sessions,
      pagination: {
        page: pagenum,
        limit: limitnum,
        totalSessions,
        totalPages: Math.ceil(totalSessions / limitnum)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed events list for a session
// @route   GET /api/sessions/:sessionId
// @access  Public
export const getSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const events = await Event.find({
      sessionId,
      eventType: { $in: ['page_view', 'click'] }
    }).sort({ timestamp: 1 });

    if (!events || events.length === 0) {
      res.status(404);
      throw new Error(`Session ID '${sessionId}' not found.`);
    }

    res.json(events);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all events for session replay
// @route   GET /api/replay/:sessionId
// @access  Public
export const getSessionReplay = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const events = await Event.find({ sessionId }).sort({ timestamp: 1 });

    if (!events || events.length === 0) {
      res.status(404);
      throw new Error(`Replay session ID '${sessionId}' not found.`);
    }

    res.json(events);
  } catch (error) {
    next(error);
  }
};

// @desc    Get heatmap click coordinates for a page url
// @route   GET /api/heatmap
// @access  Public
export const getHeatmapData = async (req, res, next) => {
  try {
    const { page } = req.query;

    if (!page) {
      res.status(400);
      throw new Error('Please specify a page parameter, e.g. /api/heatmap?page=/home');
    }

    // Find all clicks for the specified pageUrl
    // We clean or handle relative vs absolute pageUrl matching
    const matchQuery = {
      eventType: 'click',
      pageUrl: page
    };

    const clicks = await Event.find(matchQuery, {
      'coordinates.x': 1,
      'coordinates.y': 1,
      _id: 0
    });

    // Map to coordinates list format expected
    const coordinates = clicks
      .filter(c => c.coordinates && c.coordinates.x !== null && c.coordinates.y !== null)
      .map(c => ({
        x: c.coordinates.x,
        y: c.coordinates.y
      }));

    res.json(coordinates);
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard metrics & charts statistics
// @route   GET /api/stats
// @access  Public
export const getDashboardStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const matchQuery = {};

    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.timestamp.$lte = end;
      }
    }

    // 1. Total Events
    const totalEvents = await Event.countDocuments(matchQuery);

    // 2. Total Sessions
    const distinctSessions = await Event.distinct('sessionId', matchQuery);
    const totalSessions = distinctSessions.length;

    // 3. Today's Events
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const todaysEvents = await Event.countDocuments({
      ...matchQuery,
      timestamp: { $gte: startOfToday, $lte: endOfToday }
    });

    // 4. Most Visited Page & Clicks counts, Top Pages List
    const pageAggregation = await Event.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$pageUrl',
          views: {
            $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] }
          },
          clicks: {
            $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { views: -1 } }
    ]);

    const mostVisitedPage = pageAggregation.length > 0 ? pageAggregation[0]._id : 'N/A';
    const topPages = pageAggregation.map(p => ({
      pageUrl: p._id,
      views: p.views,
      clicks: p.clicks,
      total: p.total
    }));

    // 5. Total Clicks & Average clicks per session
    const totalClicks = await Event.countDocuments({ ...matchQuery, eventType: 'click' });
    const avgClicksPerSession = totalSessions > 0 ? parseFloat((totalClicks / totalSessions).toFixed(2)) : 0;

    // 6. Active sessions (with events in the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeSessionsList = await Event.distinct('sessionId', {
      timestamp: { $gte: fiveMinutesAgo }
    });
    const activeSessions = activeSessionsList.length;

    // 7. Most active sessions (sessions sorted by total events)
    const sessionActivityAgg = await Event.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$sessionId',
          eventCount: { $sum: 1 },
          clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] } },
          pageViews: { $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] } }
        }
      },
      { $sort: { eventCount: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          sessionId: '$_id',
          eventCount: 1,
          clicks: 1,
          pageViews: 1
        }
      }
    ]);

    // 8. Events per day chart data (last 7 days or filtered range)
    // If no date filters, we default to the last 7 days
    let chartMatchQuery = { ...matchQuery };
    if (!startDate) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0,0,0,0);
      chartMatchQuery.timestamp = { $gte: sevenDaysAgo };
    }

    const dailyStats = await Event.aggregate([
      { $match: chartMatchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          views: {
            $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] }
          },
          clicks: {
            $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          views: 1,
          clicks: 1,
          total: 1
        }
      }
    ]);

    // Recent activity (latest 10 events)
    const recentActivity = await Event.find(matchQuery)
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      metrics: {
        totalEvents,
        totalSessions,
        todaysEvents,
        mostVisitedPage,
        avgClicksPerSession,
        activeSessions,
        totalClicks
      },
      topPages,
      mostActiveSessions: sessionActivityAgg,
      dailyStats,
      recentActivity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all event data (helper for demo testing)
// @route   DELETE /api/events
// @access  Public
export const clearAllEvents = async (req, res, next) => {
  try {
    await Event.deleteMany({});
    res.json({ message: 'All analytics data cleared successfully' });
  } catch (error) {
    next(error);
  }
};
