import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessionReplay } from '../services/api';

export function useReplay(sessionId) {
  const [rawEvents, setRawEvents] = useState([]);
  const [events, setEvents] = useState([]); // events with pre-calculated relative offsets
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Replay states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // offset in ms from start
  const [duration, setDuration] = useState(0); // total duration in ms
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5, 1, 2, 4
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active state reconstructions at current playback position
  const [activePage, setActivePage] = useState('/');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [activeScroll, setActiveScroll] = useState({ scrollY: 0, scrollPercentage: 0 });
  const [activeResize, setActiveResize] = useState({ windowWidth: 1280, windowHeight: 800 });
  const [activeTooltip, setActiveTooltip] = useState('');
  const [clickRipples, setClickRipples] = useState([]);
  const [stats, setStats] = useState({
    duration: 0,
    clicks: 0,
    moves: 0,
    scrolls: 0,
    pages: [],
    avgClickInterval: 0
  });

  // Refs for tracking animation loops safely
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const currentTimeRef = useRef(0);
  const eventsRef = useRef([]);

  // Sync ref to avoid closure staleness in loop
  currentTimeRef.current = currentTime;
  eventsRef.current = events;

  // Load replay logs
  useEffect(() => {
    if (!sessionId) return;
    
    const loadLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSessionReplay(sessionId);
        if (!data || data.length === 0) {
          throw new Error('Replay session data is empty.');
        }

        const startMs = new Date(data[0].timestamp).getTime();
        const endMs = new Date(data[data.length - 1].timestamp).getTime();
        const sessionDuration = endMs - startMs;
        setDuration(sessionDuration);

        // Pre-compute relative timestamps
        const mapped = data.map((event) => ({
          ...event,
          relativeTime: new Date(event.timestamp).getTime() - startMs
        }));

        setEvents(mapped);
        setRawEvents(data);

        // Compute session statistics
        const clicks = data.filter(e => e.eventType === 'click');
        const moves = data.filter(e => e.eventType === 'mouse_move');
        const scrolls = data.filter(e => e.eventType === 'scroll');
        const pages = [...new Set(data.map(e => e.pageUrl))];
        
        let avgClickInterval = 0;
        if (clicks.length > 1) {
          let totalInterval = 0;
          for (let k = 1; k < clicks.length; k++) {
            totalInterval += new Date(clicks[k].timestamp).getTime() - new Date(clicks[k - 1].timestamp).getTime();
          }
          avgClickInterval = Math.round(totalInterval / (clicks.length - 1));
        }

        setStats({
          duration: sessionDuration,
          clicks: clicks.length,
          moves: moves.length,
          scrolls: scrolls.length,
          pages,
          avgClickInterval
        });

        // Set default starting configuration
        setActivePage(data[0].pageUrl);
        const firstResize = data.find(e => e.eventType === 'window_resize');
        if (firstResize && firstResize.resize) {
          setActiveResize({
            windowWidth: firstResize.resize.windowWidth || 1280,
            windowHeight: firstResize.resize.windowHeight || 800
          });
        }
      } catch (err) {
        console.error('Error loading session logs:', err);
        setError(err.message || 'Failed to fetch session replay data.');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [sessionId]);

  // Replay updates evaluator
  const evaluateState = useCallback((time) => {
    const evts = eventsRef.current;
    if (evts.length === 0) return;

    // 1. Page route path view resolution
    const latestPageView = [...evts]
      .reverse()
      .find(e => e.eventType === 'page_view' && e.relativeTime <= time);
    if (latestPageView) {
      setActivePage(latestPageView.pageUrl);
    }

    // 2. Resize dimension resolution
    const latestResize = [...evts]
      .reverse()
      .find(e => e.eventType === 'window_resize' && e.relativeTime <= time);
    if (latestResize && latestResize.resize) {
      setActiveResize({
        windowWidth: latestResize.resize.windowWidth || 1280,
        windowHeight: latestResize.resize.windowHeight || 800
      });
    }

    // 3. Scroll position resolution
    const latestScroll = [...evts]
      .reverse()
      .find(e => e.eventType === 'scroll' && e.relativeTime <= time);
    if (latestScroll && latestScroll.scroll) {
      setActiveScroll({
        scrollY: latestScroll.scroll.scrollY || 0,
        scrollPercentage: latestScroll.scroll.scrollPercentage || 0
      });
    }

    // 4. Cursor position evaluation with linear interpolation (LERP)
    const positionEvents = evts.filter(e => (e.eventType === 'mouse_move' || e.eventType === 'click') && e.coordinates);
    
    if (positionEvents.length > 0) {
      // Find bounding events A and B
      let idxA = -1;
      for (let k = 0; k < positionEvents.length; k++) {
        if (positionEvents[k].relativeTime <= time) {
          idxA = k;
        } else {
          break;
        }
      }

      if (idxA === -1) {
        // before first coordinate
        setCursorPos({
          x: positionEvents[0].coordinates.x,
          y: positionEvents[0].coordinates.y
        });
        setActiveTooltip(`Start Session`);
      } else if (idxA === positionEvents.length - 1) {
        // after last coordinate
        setCursorPos({
          x: positionEvents[idxA].coordinates.x,
          y: positionEvents[idxA].coordinates.y
        });
        setActiveTooltip(`Idle`);
      } else {
        // Interpolate between idxA and idxA + 1
        const eventA = positionEvents[idxA];
        const eventB = positionEvents[idxA + 1];
        
        const delta = eventB.relativeTime - eventA.relativeTime;
        const fraction = delta > 0 ? (time - eventA.relativeTime) / delta : 1;
        
        const lerpX = eventA.coordinates.x + (eventB.coordinates.x - eventA.coordinates.x) * fraction;
        const lerpY = eventA.coordinates.y + (eventB.coordinates.y - eventA.coordinates.y) * fraction;
        
        setCursorPos({ x: Math.round(lerpX), y: Math.round(lerpY) });

        // Tooltip detail (Bonus)
        if (eventB.eventType === 'click' && fraction > 0.8) {
          setActiveTooltip('Clicking CTA...');
        } else {
          setActiveTooltip(`Hovering (${Math.round(lerpX)}, ${Math.round(lerpY)})`);
        }
      }
    }

    // 5. Clicks tracking & Ripples creation
    // Find clicks that occurred in the immediate past frame window
    // (e.g. within 250ms behind current playhead timestamp)
    const clickEvents = evts.filter(e => e.eventType === 'click' && e.relativeTime <= time && e.relativeTime > time - 250);
    if (clickEvents.length > 0) {
      const newRipples = clickEvents.map(e => ({
        id: `${e._id}-${e.relativeTime}`,
        x: e.coordinates.x,
        y: e.coordinates.y
      }));
      
      setClickRipples((prev) => {
        // Filter out duplicate ripples
        const unique = [...prev];
        newRipples.forEach(nr => {
          if (!unique.some(u => u.id === nr.id)) {
            unique.push(nr);
          }
        });
        return unique;
      });

      // Clear ripples after 600ms
      newRipples.forEach(nr => {
        setTimeout(() => {
          setClickRipples(prev => prev.filter(r => r.id !== nr.id));
        }, 600);
      });
    }
  }, []);

  // Playback Loop Runner
  const runReplayLoop = useCallback((timestamp) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(runReplayLoop);
      return;
    }

    const elapsed = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    let nextTime = currentTimeRef.current + elapsed * playbackSpeed;
    if (nextTime >= duration) {
      nextTime = duration;
      setIsPlaying(false);
    }

    setCurrentTime(nextTime);
    evaluateState(nextTime);

    if (nextTime < duration) {
      animationFrameRef.current = requestAnimationFrame(runReplayLoop);
    }
  }, [duration, playbackSpeed, evaluateState]);

  // Handle loop bindings based on isPlaying state
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = null;
      animationFrameRef.current = requestAnimationFrame(runReplayLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, runReplayLoop]);

  // Player manual navigation utilities
  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);
  const restart = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    evaluateState(0);
    setClickRipples([]);
    setTimeout(() => setIsPlaying(true), 150);
  };
  
  const jumpTo = (timeMs) => {
    const clamped = Math.max(0, Math.min(duration, timeMs));
    setCurrentTime(clamped);
    evaluateState(clamped);
  };

  return {
    rawEvents,
    events,
    loading,
    error,
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    isFullscreen,
    activePage,
    cursorPos,
    activeScroll,
    activeResize,
    activeTooltip,
    clickRipples,
    stats,
    play,
    pause,
    restart,
    setPlaybackSpeed,
    setIsPlaying,
    setIsFullscreen,
    jumpTo
  };
}
