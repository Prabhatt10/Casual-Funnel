import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, MousePointer, ShieldAlert, MonitorPlay, Eye, Navigation } from 'lucide-react';
import Layout from '../components/Layout';
import { getSessionDetails } from '../services/api';

const SessionDetails = () => {
  const { sessionId } = useParams();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Playback Simulation States (Bonus)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x, 8x
  const [ripple, setRipple] = useState(null); // click ripple coordination {x, y}
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const data = await getSessionDetails(sessionId);
        setEvents(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching session details:', err);
        setError(`Failed to retrieve timeline details for session '${sessionId}'.`);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [sessionId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Playback engine
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Stop if reached the end
    if (currentIndex >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = currentIndex + 1;
    const currentEvent = events[currentIndex >= 0 ? currentIndex : 0];
    const nextEvent = events[nextIndex];

    // Compute delay based on timestamp difference (or default to 1s if initial)
    let delay = 1000;
    if (currentIndex >= 0) {
      const currentMs = new Date(currentEvent.timestamp).getTime();
      const nextMs = new Date(nextEvent.timestamp).getTime();
      delay = Math.max(200, (nextMs - currentMs) / playbackSpeed); // apply speed up divisor, cap minimum wait at 200ms
    }

    timerRef.current = setTimeout(() => {
      setCurrentIndex(nextIndex);

      // Trigger ripple if click event
      if (nextEvent.eventType === 'click' && nextEvent.coordinates) {
        setRipple({
          x: nextEvent.coordinates.x,
          y: nextEvent.coordinates.y
        });
        setTimeout(() => setRipple(null), 600); // clear ripple animation
      }

      // Schedule next event
      if (nextIndex < events.length - 1) {
        // Trigger re-render loop
      } else {
        setIsPlaying(false); // finished play
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, events, playbackSpeed]);

  const handlePlayToggle = () => {
    if (currentIndex >= events.length - 1) {
      // Loop reset
      setCurrentIndex(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(-1);
    setRipple(null);
  };

  const getEventBadgeStyles = (type) => {
    if (type === 'click') {
      return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
    return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
  };

  const formatEventTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Safe checks for simulated canvas cursor
  const activeEvent = currentIndex >= 0 ? events[currentIndex] : null;
  const currentSimulatedPage = activeEvent
    ? activeEvent.pageUrl
    : events.length > 0
    ? events[0].pageUrl
    : '/';

  // Find last coordinates for cursor plotting
  let simulatedCursor = { x: 400, y: 300 }; // screen center default
  if (activeEvent && activeEvent.eventType === 'click' && activeEvent.coordinates) {
    simulatedCursor = {
      x: activeEvent.coordinates.x,
      y: activeEvent.coordinates.y
    };
  } else {
    // Walk backward to find last known click position for logical cursor positioning
    for (let index = currentIndex; index >= 0; index--) {
      const e = events[index];
      if (e && e.eventType === 'click' && e.coordinates && e.coordinates.x !== null) {
        simulatedCursor = { x: e.coordinates.x, y: e.coordinates.y };
        break;
      }
    }
  }

  // To fit coordinates inside the mock screen, we map them proportionally
  // Let's assume standard page width was ~1200px and height ~1000px
  // We will scale down to fit mock frame (which is ~100% width, height ~450px)
  const scaleX = (x) => {
    if (x === null || x === undefined) return 0;
    // Cap or scale to percentage width
    return Math.min(95, Math.max(5, (x / 1200) * 100));
  };
  const scaleY = (y) => {
    if (y === null || y === undefined) return 0;
    return Math.min(95, Math.max(5, (y / 1000) * 100));
  };

  return (
    <Layout title={`Session Details: ${sessionId?.substring(0, 12)}...`}>
      {/* Navigation breadcrumb */}
      <div className="mb-6">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sessions</span>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-600/10 border border-rose-500/25 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="h-20 bg-slate-800/40 rounded-xl animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-96 bg-slate-800/40 rounded-xl animate-pulse lg:col-span-1"></div>
            <div className="h-96 bg-slate-800/40 rounded-xl animate-pulse lg:col-span-2"></div>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-12 text-center text-slate-500">
          <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p>No logged events available for this session identifier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: Timeline details list */}
          <div className="lg:col-span-1 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 flex flex-col max-h-[600px]">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Event Timeline</span>
            </h3>

            {/* Scrollable list wrapper */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {events.map((evt, idx) => {
                const isCurrent = idx === currentIndex;
                const isPast = idx < currentIndex;
                const isClick = evt.eventType === 'click';

                return (
                  <div
                    key={evt._id || idx}
                    onClick={() => { setCurrentIndex(idx); setIsPlaying(false); }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 relative ${
                      isCurrent
                        ? 'bg-indigo-600/10 border-indigo-500 text-white font-semibold'
                        : isPast
                        ? 'bg-slate-850/40 border-[#1e293b]/70 text-slate-400'
                        : 'bg-slate-900 border-[#1e293b] text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${getEventBadgeStyles(evt.eventType)}`}>
                        {evt.eventType === 'click' ? 'Click' : 'Pageview'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono font-medium">
                        {formatEventTime(evt.timestamp)}
                      </span>
                    </div>

                    <div className="mt-2 text-xs font-mono break-all font-semibold">
                      {isClick ? (
                        <span>Clicked coordinates ({evt.coordinates?.x}, {evt.coordinates?.y})</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-indigo-400 inline" />
                          Viewed {evt.pageUrl}
                        </span>
                      )}
                    </div>
                    
                    {/* Visual status bar connection line indicator */}
                    {isCurrent && (
                      <span className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1.5 h-6 bg-indigo-500 rounded-r"></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Replay Simulation Player panel */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 flex flex-col">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b border-[#1e293b] pb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <MonitorPlay className="w-4.5 h-4.5 text-indigo-400" />
                  <span>Session Replay Player</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Simulate actual click actions and viewport routes</p>
              </div>

              {/* Player control buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Reset playback"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePlayToggle}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition duration-150 ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/10'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play Simulation'}</span>
                </button>

                {/* Speed Multiplier selectors */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={1}>1x Speed</option>
                  <option value={2}>2x Speed</option>
                  <option value={4}>4x Speed</option>
                  <option value={8}>8x Speed</option>
                </select>
              </div>
            </div>

            {/* Simulated Replay Browser Box Viewport */}
            <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden min-h-[400px] flex flex-col relative select-none shadow-inner">
              
              {/* Browser Address Bar Header */}
              <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center gap-2 text-xs">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60"></span>
                </div>
                <div className="flex-1 bg-slate-950 rounded-lg px-3 py-1 font-mono text-[10px] text-slate-400 border border-slate-800 text-center select-all truncate">
                  http://localhost:3000{currentSimulatedPage}
                </div>
                <span className="text-[10px] text-indigo-400 font-extrabold tracking-widest uppercase bg-indigo-500/10 px-2 py-0.5 rounded">
                  Replay
                </span>
              </div>

              {/* Viewport content */}
              <div className="flex-1 relative bg-[#111827]/40 flex items-center justify-center overflow-hidden">
                
                {/* Mock Page Content layout representation */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between opacity-30 pointer-events-none">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="h-3 w-16 bg-slate-700 rounded"></span>
                    <div className="flex gap-2">
                      <span className="h-3 w-8 bg-slate-700 rounded"></span>
                      <span className="h-3 w-8 bg-slate-700 rounded"></span>
                    </div>
                  </div>
                  <div className="space-y-3 my-auto">
                    <div className="h-4 w-3/4 bg-slate-700 rounded mx-auto"></div>
                    <div className="h-3 w-1/2 bg-slate-700 rounded mx-auto"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-4">
                    <span className="h-8 bg-slate-800 rounded"></span>
                    <span className="h-8 bg-slate-800 rounded"></span>
                    <span className="h-8 bg-slate-800 rounded"></span>
                  </div>
                </div>

                {/* Active page name display label */}
                <div className="absolute top-4 bg-slate-900 border border-[#1e293b] rounded-xl px-4 py-2 text-center shadow-lg pointer-events-none">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Active URL</span>
                  <span className="text-xs text-indigo-400 font-semibold font-mono">{currentSimulatedPage}</span>
                </div>

                {/* Event status center notice */}
                <div className="text-center space-y-2 pointer-events-none">
                  {activeEvent ? (
                    <div className="animate-fade-in">
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Current Replaying Action</p>
                      <h4 className="text-xl font-black text-white mt-1">
                        {activeEvent.eventType === 'click' ? '🖱️ CLICK INTERACTION' : '📄 PAGE VIEW ROUTE'}
                      </h4>
                      {activeEvent.eventType === 'click' && activeEvent.coordinates && (
                        <p className="text-indigo-400 font-mono font-bold text-xs mt-1">
                          Triggered click at (x: {activeEvent.coordinates.x}, y: {activeEvent.coordinates.y})
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="opacity-60 flex flex-col items-center">
                      <Play className="w-8 h-8 text-indigo-400 animate-pulse mb-2" />
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Click Play to Begin Simulation</p>
                    </div>
                  )}
                </div>

                {/* Simulated Click Ripple Pointer */}
                {ripple && (
                  <div
                    className="absolute w-8 h-8 border-2 border-amber-500 rounded-full pointer-events-none"
                    style={{
                      left: `${scaleX(ripple.x)}%`,
                      top: `${scaleY(ripple.y)}%`,
                      transform: 'translate(-50%, -50%)',
                      animation: 'pulseGlow 0.6s ease-out forwards',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)'
                    }}
                  ></div>
                )}

                {/* Simulated Mouse Cursor Pointer Icon */}
                {activeEvent && (
                  <div
                    className="absolute pointer-events-none transition-all duration-300 ease-out z-40 text-amber-400"
                    style={{
                      left: `${scaleX(simulatedCursor.x)}%`,
                      top: `${scaleY(simulatedCursor.y)}%`,
                      transform: 'translate(-2px, -2px)'
                    }}
                  >
                    <MousePointer className="w-5 h-5 fill-current filter drop-shadow-md text-amber-400" />
                    {activeEvent.eventType === 'click' && (
                      <span className="absolute left-4 top-4 bg-slate-900 border border-slate-700 text-[9px] font-bold text-white px-1.5 py-0.5 rounded font-mono shadow-md">
                        X:{simulatedCursor.x} Y:{simulatedCursor.y}
                      </span>
                    )}
                  </div>
                )}

              </div>

              {/* Progress Slider Bar */}
              <div className="bg-slate-900 px-4 py-2 border-t border-slate-800 flex items-center gap-3">
                <span className="text-[10px] text-slate-500 font-mono">{currentIndex + 1} / {events.length}</span>
                <input
                  type="range"
                  min="-1"
                  max={events.length - 1}
                  value={currentIndex}
                  onChange={(e) => {
                    setCurrentIndex(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="flex-1 bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[10px] text-indigo-400 font-semibold font-mono">
                  {events.length > 0 && currentIndex >= 0 ? Math.round(((currentIndex + 1) / events.length) * 100) : 0}%
                </span>
              </div>

            </div>
          </div>

        </div>
      )}
    </Layout>
  );
};

export default SessionDetails;
