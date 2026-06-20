import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, ZoomIn, ZoomOut, Trash2, Sliders, Info, HelpCircle, Activity, Radio, AlertCircle, RefreshCw, X, Bell } from 'lucide-react';
import Layout from '../components/Layout';
import { getHeatmapData } from '../services/api';
import { useHeatmapSocket } from '../hooks/useHeatmapSocket';

const PAGES_LIST = [
  '/home',
  '/about',
  '/pricing',
  '/contact',
  '/features',
  '/blog'
];

const Heatmap = () => {
  const canvasRef = useRef(null);

  // Filter States
  const [selectedPage, setSelectedPage] = useState('/home');
  const [sessionSearch, setSessionSearch] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Main clicks data state (master record loaded from DB + live appends)
  const [clicks, setClicks] = useState([]);
  const [filteredClicks, setFilteredClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Canvas visual variables
  const [zoom, setZoom] = useState(1);
  const [dotRadius, setDotRadius] = useState(25);
  const [opacity, setOpacity] = useState(0.65);

  // Real-Time / Sockets settings
  const [isLiveMode, setIsLiveMode] = useState(true); // Live Mode Toggle (Bonus)
  const [transientRipples, setTransientRipples] = useState([]); // Animated pulsing HTML overlays (x, y, id)
  const [newestClick, setNewestClick] = useState(null); // Highlight indicator
  const [toasts, setToasts] = useState([]); // Array of floating notifications: { id, sessionId, pageUrl }

  // Live Statistics States
  const [clicksThisMinute, setClicksThisMinute] = useState(0);
  const [lastClickDetail, setLastClickDetail] = useState(null);

  // 1. Fetch baseline clicks history from MongoDB
  const fetchBaseline = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHeatmapData(selectedPage);
      // Map baseline to generic structure { sessionId, pageUrl, timestamp, x, y }
      const mapped = data.map((c) => ({
        sessionId: c.sessionId || 'historic_sess',
        pageUrl: selectedPage,
        timestamp: c.timestamp || new Date(),
        x: c.x,
        y: c.y
      }));
      setClicks(mapped);
      setError(null);
    } catch (err) {
      console.error('Error loading heatmap base:', err);
      setError(`Failed to retrieve click data for route: ${selectedPage}`);
    } finally {
      setLoading(false);
    }
  }, [selectedPage]);

  useEffect(() => {
    fetchBaseline();
    setNewestClick(null);
  }, [fetchBaseline]);

  // 2. Socket Event listener hook (useHeatmapSocket)
  const handleLiveClick = useCallback((newEvent) => {
    // Fired for global toast alerts, regardless of route page matching
    const toastId = `${newEvent._id || Math.random()}-${Date.now()}`;
    setToasts((prev) => [...prev, { id: toastId, sessionId: newEvent.sessionId, pageUrl: newEvent.pageUrl }]);
    
    // Clear toast notification after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 3500);

    // If it matches our current page selection, trigger transient pulse coordinates animation
    if (newEvent.pageUrl === selectedPage) {
      const rippleId = `${newEvent._id || Math.random()}-ripple`;
      const coords = {
        x: newEvent.coordinates?.x || 0,
        y: newEvent.coordinates?.y || 0
      };

      setTransientRipples((prev) => [...prev, { id: rippleId, ...coords }]);
      setNewestClick(coords);

      // Auto clear visual pulse element after 1.5 seconds
      setTimeout(() => {
        setTransientRipples((prev) => prev.filter((r) => r.id !== rippleId));
      }, 1500);
    }
  }, [selectedPage]);

  // Consumer socket hook
  const { liveClicks, clearLiveClicks } = useHeatmapSocket(selectedPage, isLiveMode, handleLiveClick);

  // Sync liveClicks state array appends to the master clicks list
  useEffect(() => {
    if (liveClicks.length > 0) {
      const lastLive = liveClicks[liveClicks.length - 1];
      const parsedClick = {
        sessionId: lastLive.sessionId,
        pageUrl: lastLive.pageUrl,
        timestamp: lastLive.timestamp,
        x: lastLive.coordinates?.x || 0,
        y: lastLive.coordinates?.y || 0
      };

      // Append new click immediately to local state and update Last Click panel
      setClicks((prev) => [...prev, parsedClick]);
      setLastClickDetail(parsedClick);
      clearLiveClicks(); // clear buffer hook
    }
  }, [liveClicks, clearLiveClicks]);

  // 3. Instant client-side filters (Page URL, Session ID, Time Range)
  useEffect(() => {
    const filtered = clicks.filter((c) => {
      // Route filter
      if (c.pageUrl !== selectedPage) return false;

      // Session search input filter
      if (sessionSearch && !c.sessionId.toLowerCase().includes(sessionSearch.toLowerCase())) {
        return false;
      }

      // Time Range filter
      if (startTime) {
        const start = new Date(startTime).getTime();
        const clickTime = new Date(c.timestamp).getTime();
        if (clickTime < start) return false;
      }
      if (endTime) {
        const end = new Date(endTime).getTime();
        const clickTime = new Date(c.timestamp).getTime();
        if (clickTime > end) return false;
      }

      return true;
    });

    setFilteredClicks(filtered);
  }, [clicks, selectedPage, sessionSearch, startTime, endTime]);

  // 4. Calculate Clicks-per-minute dynamically on a 1-second ticking queue
  useEffect(() => {
    const calcCpm = () => {
      const oneMinuteAgo = Date.now() - 60000;
      const recent = clicks.filter((c) => new Date(c.timestamp).getTime() > oneMinuteAgo);
      setClicksThisMinute(recent.length);
    };

    calcCpm(); // initial
    const interval = setInterval(calcCpm, 1000);
    return () => clearInterval(interval);
  }, [clicks]);

  // 5. Draw Heatmap Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (filteredClicks.length === 0) return;

    // Use screen blend operations to highlight dense overlap click zones
    ctx.globalCompositeOperation = 'screen';

    filteredClicks.forEach((click) => {
      const { x, y } = click;

      const grad = ctx.createRadialGradient(x, y, 2, x, y, dotRadius);
      grad.addColorStop(0, `rgba(239, 68, 68, ${opacity})`);       // Inner red core
      grad.addColorStop(0.2, `rgba(245, 158, 11, ${opacity * 0.8})`); // Amber halo
      grad.addColorStop(0.5, `rgba(234, 179, 8, ${opacity * 0.4})`);   // Yellow halo
      grad.addColorStop(1, 'rgba(234, 179, 8, 0)');                 // Transparent edge

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [filteredClicks, dotRadius, opacity]);

  // Live Metric panel counts
  const liveUsersCount = [...new Set(clicks.map((c) => c.sessionId))].length;

  const getMostActivePage = () => {
    if (clicks.length === 0) return 'N/A';
    const counts = clicks.reduce((acc, c) => {
      acc[c.pageUrl] = (acc[c.pageUrl] || 0) + 1;
      return acc;
    }, {});
    let maxPage = 'N/A';
    let maxVal = -1;
    Object.keys(counts).forEach((p) => {
      if (counts[p] > maxVal) {
        maxVal = counts[p];
        maxPage = p;
      }
    });
    return maxPage;
  };

  const handleClearDisplay = () => {
    setClicks([]);
    setNewestClick(null);
  };

  return (
    <Layout onRefresh={fetchBaseline} title="Real-Time Click Heatmap">
      {/* Live Panel Indicators banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        
        {/* Live Users */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Live Users</span>
            <span className="text-xl font-black text-white mt-1 block">{liveUsersCount}</span>
          </div>
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
            <Radio className="w-4 h-4" />
          </div>
        </div>

        {/* Live Click Count */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Filtered Clicks</span>
            <span className="text-xl font-black text-white mt-1 block">{filteredClicks.length}</span>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Flame className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* Clicks This Minute */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Clicks / Min</span>
            <span className="text-xl font-black text-emerald-400 mt-1 block">{clicksThisMinute}</span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        {/* Last Click Location */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-xl shadow-lg col-span-1">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Last Click</span>
          <span className="text-xs font-semibold text-slate-300 mt-1 block truncate">
            {lastClickDetail ? `(${lastClickDetail.x}, ${lastClickDetail.y}) on ${lastClickDetail.pageUrl}` : 'Waiting...'}
          </span>
        </div>

        {/* Most Active Page */}
        <div className="bg-[#0f172a] border border-[#1e293b] p-4 rounded-xl shadow-lg col-span-1">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Active Page</span>
          <span className="text-xs font-semibold text-indigo-400 mt-1 block truncate font-mono">
            {getMostActivePage()}
          </span>
        </div>

      </div>

      {/* Control Configuration panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6">
        
        {/* Core dropdown selector & Live Switcher */}
        <div className="xl:col-span-2 bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl flex flex-col justify-between shadow-lg space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Select Page Route</label>
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="w-full bg-slate-900 border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
            >
              {PAGES_LIST.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Live Mode Toggle (Bonus Feature) */}
          <div className="flex justify-between items-center border-t border-[#1e293b]/70 pt-4">
            <div>
              <span className="text-sm font-bold text-white block">Real-time socket listening</span>
              <p className="text-[10px] text-slate-500 mt-0.5">Toggle live updates without reloads</p>
            </div>
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isLiveMode ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span className="sr-only">Live Mode Toggle</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isLiveMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dynamic Filters panel (Session searches & Time Ranges) */}
        <div className="xl:col-span-2 bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl shadow-lg space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-[#1e293b] pb-2 flex items-center justify-between">
            <span>Instant Filters (No API fetch)</span>
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          </h4>

          {/* Session Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Filter Session ID</label>
              <input
                type="text"
                placeholder="Search session..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            
            {/* Time range parameters */}
            <div>
              <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-1">Time Range</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500 w-1/2"
                />
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500 w-1/2"
                />
              </div>
            </div>
          </div>
          {(sessionSearch || startTime || endTime) && (
            <button
              onClick={() => { setSessionSearch(''); setStartTime(''); setEndTime(''); }}
              className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase block mt-1 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-600/10 border border-rose-500/25 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Heatmap Layout configurations toolbar */}
      <div className="bg-[#0f172a] border border-[#1e293b] px-6 py-4 rounded-t-2xl flex items-center justify-between shadow-lg select-none">
        
        {/* Sliders adjustments */}
        <div className="flex flex-wrap gap-6 items-center">
          <div>
            <span className="text-[10px] text-slate-500 font-semibold mr-2">Spot Size</span>
            <input
              type="range"
              min="10"
              max="60"
              value={dotRadius}
              onChange={(e) => setDotRadius(Number(e.target.value))}
              className="bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer accent-indigo-500 w-24 inline-block"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold mr-2">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="bg-slate-800 h-1 rounded-lg appearance-none cursor-pointer accent-indigo-500 w-24 inline-block"
            />
          </div>
        </div>

        {/* Zoom & Reset options */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
            className="p-1.5 rounded-lg bg-slate-900 border border-[#1e293b] text-slate-400 hover:text-white transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-400 px-2.5 py-1 bg-slate-900 border border-[#1e293b] rounded-lg">
            {Math.round(zoom * 100)}% Zoom
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-1.5 rounded-lg bg-slate-900 border border-[#1e293b] text-slate-400 hover:text-white transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleClearDisplay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/25 text-rose-400 text-[10px] font-bold transition"
            title="Clear points from display"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear View</span>
          </button>
        </div>

      </div>

      {/* Drawing board wrapper container */}
      <div className="bg-slate-950 border-x border-b border-[#1e293b] rounded-b-2xl overflow-auto h-[550px] relative shadow-inner flex items-start justify-start p-4">
        
        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-slate-400 text-xs font-semibold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></span>
              Synchronizing clicks database...
            </div>
          </div>
        )}

        {!loading && filteredClicks.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-500 select-none">
            <Info className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm">No click events match this filtered profile.</p>
            <p className="text-xs text-slate-600 mt-1">If Live Mode is ON, click on the Demo website to observe streams!</p>
          </div>
        )}

        {/* Scaled canvas overlay wrapper */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease-out'
          }}
          className="relative bg-slate-900/60 rounded-xl border border-slate-800 shadow-2xl flex-shrink-0"
        >
          {/* Mock background site representation */}
          <div className="absolute inset-0 flex flex-col justify-between p-8 opacity-10 pointer-events-none">
            <div className="h-10 bg-slate-600 rounded"></div>
            <div className="grid grid-cols-2 gap-12 my-auto">
              <div className="h-40 bg-slate-700 rounded"></div>
              <div className="h-40 bg-slate-700 rounded"></div>
            </div>
            <div className="h-20 bg-slate-600 rounded"></div>
          </div>

          {/* Absolute HTML overlays for transient click ripples (Pulse animation) */}
          {transientRipples.map((ripple) => (
            <div
              key={ripple.id}
              style={{
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                transform: 'translate(-50%, -50%)',
                animation: 'pulseGlow 0.6s ease-out forwards'
              }}
              className="absolute w-12 h-12 border-2 border-indigo-400 bg-indigo-400/10 rounded-full pointer-events-none z-30"
            ></div>
          ))}

          {/* Glowing cursor highlight pointer for newest click */}
          {newestClick && (
            <div
              style={{
                left: `${newestClick.x}px`,
                top: `${newestClick.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute w-6 h-6 border-2 border-amber-400 bg-amber-400/25 rounded-full animate-ping pointer-events-none z-30 flex items-center justify-center"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            </div>
          )}

          {/* Permanent points overlay canvas */}
          <canvas ref={canvasRef} width={1024} height={900} className="block" />
        </div>
      </div>

      {/* Guide footer notice */}
      <div className="mt-4 p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/10 flex gap-3 items-start select-none">
        <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-indigo-300 block mb-0.5">Real-time socket sync tips:</span>
          When <strong>Live Mode</strong> is ON, clicks anywhere on your site are intercepted by the tracker SDK and sent here. Visual animations (glowing circles and pulses) mark incoming coordinates instantly. Use search inputs and time parameters to segment patterns client-side without sending additional API queries.
        </div>
      </div>

      {/* FLOATING TOAST NOTIFICATION SLIDES (Bonus) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 bg-slate-900 border border-indigo-500/30 text-white rounded-xl p-4 shadow-2xl animate-fade-in border-l-4 border-l-indigo-500"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Bell className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-100">Live User Interaction</p>
              <p className="text-[10px] text-indigo-400 font-mono mt-0.5 truncate select-all">Session: {toast.sessionId}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">Clicked route: {toast.pageUrl}</p>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Heatmap;
