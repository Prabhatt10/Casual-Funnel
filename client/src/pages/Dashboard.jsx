import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, MousePointerClick, Calendar, Award, Flame, Monitor, RefreshCw, Layers } from 'lucide-react';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import { getDashboardStats } from '../services/api';
import useSocket from '../hooks/useSocket';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

const Dashboard = () => {
  const socket = useSocket();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch stats function
  const fetchStats = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getDashboardStats({ startDate, endDate });
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to fetch analytics statistics.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [startDate, endDate]);

  // Initial load & date filter load
  useEffect(() => {
    fetchStats(true);
  }, [fetchStats]);

  // Auto-refresh data every 10 seconds (Bonus feature requirement)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats(false); // background refresh
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Socket IO real-time updates listener (Bonus feature)
  useEffect(() => {
    if (!socket) return;

    const handleNewEvent = (newEvent) => {
      console.log('Real-time tracking event received:', newEvent);
      
      // Update statistics state directly without calling API
      setStats((prevStats) => {
        if (!prevStats) return prevStats;

        const isClick = newEvent.eventType === 'click';
        const isPageView = newEvent.eventType === 'page_view';

        // 1. Update basic totals
        const totalEvents = prevStats.metrics.totalEvents + 1;
        const totalClicks = prevStats.metrics.totalClicks + (isClick ? 1 : 0);
        
        // 2. Check if this is a new session
        // (Just a safe estimate or let it remain the same until auto-refresh)
        const totalSessions = prevStats.metrics.totalSessions;
        const avgClicksPerSession = totalSessions > 0 ? parseFloat((totalClicks / totalSessions).toFixed(2)) : 0;

        // 3. Append to activity log (max 10 items)
        const updatedActivity = [newEvent, ...prevStats.recentActivity].slice(0, 10);

        // 4. Update daily chart (match today's date if possible)
        const eventDateStr = new Date(newEvent.timestamp).toISOString().split('T')[0];
        const updatedDailyStats = [...prevStats.dailyStats];
        const dayRecord = updatedDailyStats.find(d => d.date === eventDateStr);
        if (dayRecord) {
          dayRecord.total += 1;
          if (isClick) dayRecord.clicks += 1;
          if (isPageView) dayRecord.views += 1;
        } else {
          updatedDailyStats.push({
            date: eventDateStr,
            views: isPageView ? 1 : 0,
            clicks: isClick ? 1 : 0,
            total: 1
          });
        }

        return {
          ...prevStats,
          metrics: {
            ...prevStats.metrics,
            totalEvents,
            totalClicks,
            avgClicksPerSession
          },
          recentActivity: updatedActivity,
          dailyStats: updatedDailyStats
        };
      });
    };

    socket.on('newEvent', handleNewEvent);

    return () => {
      socket.off('newEvent', handleNewEvent);
    };
  }, [socket]);

  if (loading && !stats) {
    return (
      <Layout title="Dashboard Overview">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-800/40 rounded-2xl animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-slate-800/40 rounded-2xl animate-pulse"></div>
            <div className="h-96 bg-slate-800/40 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const { metrics, topPages, mostActiveSessions, dailyStats, recentActivity } = stats || {
    metrics: { totalEvents: 0, totalSessions: 0, todaysEvents: 0, mostVisitedPage: 'N/A', avgClicksPerSession: 0, activeSessions: 0 },
    topPages: [],
    mostActiveSessions: [],
    dailyStats: [],
    recentActivity: []
  };

  // Format data for clicks vs page views pie chart
  const eventBreakdown = [
    { name: 'Page Views', value: metrics.totalEvents - metrics.totalClicks },
    { name: 'Clicks', value: metrics.totalClicks || 0 }
  ];

  return (
    <Layout onRefresh={() => fetchStats(true)} title="Dashboard Overview">
      {/* Date Filters Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-[#0f172a] p-4 rounded-2xl border border-[#1e293b]">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-300">Filter Analytics By Date</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-600/10 border border-rose-500/25 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Sessions"
          value={metrics.totalSessions}
          icon={Users}
          description="Unique user sessions tracked"
          color="indigo"
        />
        <StatsCard
          title="Total Events"
          value={metrics.totalEvents}
          icon={Layers}
          description="Total clicks and page views"
          color="sky"
        />
        <StatsCard
          title="Today's Events"
          value={metrics.todaysEvents}
          icon={Monitor}
          description="Logged during today's span"
          color="emerald"
        />
        <StatsCard
          title="Avg Clicks / Session"
          value={metrics.avgClicksPerSession}
          icon={MousePointerClick}
          description="Interaction density ratio"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Secondary metrics row inside column */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Top Page Route</h4>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white block truncate mb-1" title={metrics.mostVisitedPage}>
              {metrics.mostVisitedPage}
            </span>
            <span className="text-slate-400 text-xs font-medium">Most active webpage route</span>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Sessions</h4>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white block">
              {metrics.activeSessions}
            </span>
            <span className="text-slate-400 text-xs font-medium">Active in the last 5 minutes</span>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Data Synchronization</h4>
            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="mt-2">
            <span className="text-sm font-semibold text-slate-300 block">
              Socket + 10s Auto-Poll
            </span>
            <span className="text-slate-400 text-xs font-medium">Live dashboard status updating</span>
          </div>
        </div>
      </div>

      {/* Recharts Graphs Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        
        {/* Timeline Area Graph */}
        <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Events Logged Per Day</h3>
          <div className="h-80 w-full">
            {dailyStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No event timeline data in selected range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="views" name="Page Views" stroke="#6366f1" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#f59e0b" fillOpacity={1} fill="url(#colorClicks)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Clicks vs Page Views Breakdown */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl flex flex-col">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Interaction Share</h3>
          <div className="flex-1 h-60 w-full relative">
            {metrics.totalEvents === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No events recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {eventBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Events`]} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {metrics.totalEvents > 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-2xl font-black text-white">{metrics.totalEvents}</span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</p>
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {eventBreakdown.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></span>
                <span className="text-xs font-semibold text-slate-300">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid of details tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Most Active Sessions list */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl lg:col-span-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Most Active Sessions</h3>
          <div className="space-y-4">
            {mostActiveSessions.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                No session data available.
              </div>
            ) : (
              mostActiveSessions.map((session, index) => (
                <div key={session.sessionId} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="min-w-0">
                    <span className="text-xs text-indigo-400 font-bold font-mono truncate block max-w-[150px]">
                      {session.sessionId}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Index Rank #{index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold">
                      {session.pageViews} PV
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                      {session.clicks} Click
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Activity stream */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Event Stream</h3>
            <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-extrabold tracking-wider uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full animate-pulse border border-indigo-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              Live socket feeds
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Waiting for events... Launch the demo index and click widgets!
              </div>
            ) : (
              recentActivity.map((act) => {
                const date = new Date(act.timestamp);
                const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const isClick = act.eventType === 'click';

                return (
                  <div
                    key={act._id || Math.random().toString()}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                      isClick
                        ? 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30'
                        : 'bg-indigo-500/5 border-indigo-500/10 hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                          isClick
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                        }`}
                      >
                        {act.eventType === 'click' ? 'Click' : 'Pageview'}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-200 block truncate max-w-[200px]" title={act.pageUrl}>
                          {act.pageUrl}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate font-mono" title={act.sessionId}>
                          Sess: {act.sessionId}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="text-xs text-slate-400 font-medium font-mono">{timeString}</span>
                      {isClick && act.coordinates && (
                        <span className="text-[10px] text-slate-500 font-bold font-mono">
                          X:{act.coordinates.x} Y:{act.coordinates.y}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Dashboard;
