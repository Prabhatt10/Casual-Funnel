import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Pause, RotateCcw, Clock, MousePointer, Monitor, Layers, ArrowLeft, Maximize, Minimize, ExternalLink, Settings, Navigation, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import { useReplay } from '../hooks/useReplay';
import { useTimeline } from '../hooks/useTimeline';

// ----------------------------------------------------
// ReplayLoader component
// ----------------------------------------------------
const ReplayLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400 space-y-4">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10"></div>
      <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
    </div>
    <div className="text-center">
      <h3 className="font-bold text-white text-base">Reconstructing Session</h3>
      <p className="text-xs text-slate-500 mt-1">Interpreting cursor coordinates and scroll heights...</p>
    </div>
  </div>
);

// ----------------------------------------------------
// ReplayStats component
// ----------------------------------------------------
const ReplayStats = ({ stats }) => {
  const formatDuration = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-6 space-y-6">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#1e293b] pb-3">Session Metrics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Duration</span>
          <span className="text-lg font-black text-white mt-1 block">{formatDuration(stats.duration)}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Clicks</span>
          <span className="text-lg font-black text-amber-400 mt-1 block">{stats.clicks}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Mouse Moves</span>
          <span className="text-lg font-black text-indigo-400 mt-1 block">{stats.moves}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Scroll Events</span>
          <span className="text-lg font-black text-emerald-400 mt-1 block">{stats.scrolls}</span>
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-[#1e293b]">
        <div>
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-2">Routes Visited</span>
          <div className="flex flex-wrap gap-2">
            {stats.pages.map((p, idx) => (
              <span key={idx} className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Avg Click Interval</span>
          <span className="text-xs font-semibold text-slate-300 block mt-1">
            {stats.clicks > 1 ? `${(stats.avgClickInterval / 1000).toFixed(2)} seconds` : 'N/A (Single click)'}
          </span>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// ReplayCanvas component (Browser Viewport frame simulation)
// ----------------------------------------------------
const ReplayCanvas = ({
  activePage,
  cursorPos,
  activeScroll,
  activeResize,
  activeTooltip,
  clickRipples,
  isPlaying
}) => {
  const containerRef = useRef(null);

  // We scale the virtual screen resolution proportionally to fit neatly inside the screen width
  const baseWidth = activeResize.windowWidth || 1280;
  const baseHeight = activeResize.windowHeight || 800;

  // Let's compute proportion scale relative to current parent container boundaries
  const scale = 0.45; // default scale down multiplier

  return (
    <div className="bg-slate-950 rounded-2xl border border-slate-800 flex-1 flex flex-col min-h-[480px] overflow-hidden relative shadow-inner">
      {/* Mock Browser URL address bar header */}
      <div className="bg-[#0f172a] border-b border-[#1e293b] px-4 py-3 flex items-center gap-2.5 select-none">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60"></span>
        </div>
        <div className="flex-1 bg-slate-900 rounded-lg px-4 py-1.5 font-mono text-[10px] text-slate-400 border border-slate-850 flex items-center justify-between min-w-0">
          <span className="truncate">http://localhost:3000{activePage}</span>
          <Navigation className="w-3 h-3 text-indigo-400 shrink-0 ml-2" />
        </div>
        <div className="text-[9px] font-black uppercase text-indigo-400 tracking-wider bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 shrink-0">
          Resolution: {baseWidth}x{baseHeight}
        </div>
      </div>

      {/* Replay Viewport Content box */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-auto bg-[#0a0d16]">
        
        {/* Mock Screen scaling layer */}
        <div
          ref={containerRef}
          style={{
            width: `${baseWidth}px`,
            height: `${baseHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'width 0.3s, height 0.3s'
          }}
          className="relative bg-slate-900 border border-slate-700 shadow-2xl flex-shrink-0 overflow-hidden"
        >
          {/* Scrollable mockup content wrapper */}
          <div
            style={{
              transform: `translateY(-${activeScroll.scrollY}px)`,
              transition: 'transform 0.15s ease-out',
              height: '2000px' // long page mock representation
            }}
            className="absolute inset-x-0 top-0 p-8"
          >
            {/* Visual HTML Elements to simulate tracking items of demo site */}
            <div className="space-y-12">
              
              {/* Header navbar mock */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <span className="h-4 w-28 bg-indigo-500/30 rounded"></span>
                <div className="flex gap-4">
                  <span className="h-3 w-12 bg-slate-700 rounded"></span>
                  <span className="h-3 w-12 bg-slate-700 rounded"></span>
                  <span className="h-3 w-12 bg-slate-700 rounded text-indigo-400">Pricing</span>
                </div>
              </div>

              {/* Page Route Banner */}
              <div className="py-8 bg-slate-850/40 border border-slate-800 rounded-xl text-center space-y-4">
                <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-widest">Navigation View</span>
                <h4 className="text-xl font-bold text-white tracking-wide">Navigated route: {activePage}</h4>
                <div className="w-40 h-8 bg-indigo-600/20 border border-indigo-500/20 rounded-md mx-auto"></div>
              </div>

              {/* Grid content mockup */}
              <div className="grid grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-slate-850 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="h-20 bg-slate-800 rounded-lg"></div>
                    <div className="h-3 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-2 bg-slate-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>

              {/* Deep Footer scrolls */}
              <div className="pt-24 border-t border-slate-800 space-y-4 text-center">
                <span className="h-3 w-32 bg-slate-800 rounded mx-auto block"></span>
                <span className="text-[10px] text-slate-600 font-mono block">Scroll y-depth: {activeScroll.scrollY}px ({activeScroll.scrollPercentage}%)</span>
              </div>

            </div>
          </div>

          {/* Canvas click ripples indicator */}
          {clickRipples.map((ripple) => (
            <div
              key={ripple.id}
              style={{
                left: `${ripple.x}px`,
                top: `${ripple.y - activeScroll.scrollY}px`,
                transform: 'translate(-50%, -50%)',
                animation: 'pulseGlow 0.6s ease-out forwards',
                backgroundColor: 'rgba(245, 158, 11, 0.25)'
              }}
              className="absolute w-12 h-12 border-2 border-amber-500 rounded-full pointer-events-none z-30"
            ></div>
          ))}

          {/* ReplayCursor representation */}
          <div
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y - activeScroll.scrollY}px`,
              transform: 'translate(-2px, -2px)',
              transition: isPlaying ? 'none' : 'left 0.2s, top 0.2s' // smooth transition on manual drag jump
            }}
            className="absolute pointer-events-none z-40 text-amber-400 filter drop-shadow-md flex flex-col items-start"
          >
            <MousePointer className="w-5 h-5 fill-current text-amber-400 stroke-slate-900" />
            
            {/* ReplayTooltip showing event descriptions (Bonus) */}
            {activeTooltip && (
              <span className="mt-2 bg-slate-900 text-white font-mono text-[9px] font-bold px-2 py-1 rounded shadow-lg border border-slate-700 whitespace-nowrap block">
                {activeTooltip}
              </span>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

// ----------------------------------------------------
// ReplayControls component
// ----------------------------------------------------
const ReplayControls = ({
  isPlaying,
  playbackSpeed,
  isFullscreen,
  play,
  pause,
  restart,
  setPlaybackSpeed,
  setIsFullscreen
}) => {
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] px-6 py-4 rounded-xl flex items-center justify-between select-none">
      {/* Play actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={restart}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Restart replay from beginning"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={isPlaying ? pause : play}
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-bold text-xs transition duration-150 ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/10'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
      </div>

      {/* Speed multipliers */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Speed</span>
        {[0.5, 1, 2, 4].map((spd) => (
          <button
            key={spd}
            onClick={() => setPlaybackSpeed(spd)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              playbackSpeed === spd
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {spd}x
          </button>
        ))}
      </div>

      {/* View settings */}
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Replay'}
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </button>
    </div>
  );
};

// ----------------------------------------------------
// ReplayTimeline component (Timeline progress and tick marks)
// ----------------------------------------------------
const ReplayTimeline = ({
  currentTime,
  duration,
  timelineTicks,
  jumpTo
}) => {
  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSliderChange = (e) => {
    const selectPercent = Number(e.target.value);
    const selectTime = (selectPercent / 100) * duration;
    jumpTo(selectTime);
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] p-6 rounded-xl space-y-4 select-none">
      {/* Time indicators */}
      <div className="flex justify-between text-xs font-mono font-semibold text-slate-400">
        <span>Current Time: <span className="text-white">{formatTime(currentTime)}</span></span>
        <span>Total Replay: <span className="text-white">{formatTime(duration)}</span></span>
      </div>

      {/* Progress container with tick overlays */}
      <div className="relative pt-3 pb-5">
        {/* Visual tick overlays */}
        <div className="absolute inset-x-0 top-3.5 h-1.5 pointer-events-none z-10">
          {timelineTicks.map((tick) => (
            <div
              key={tick.id}
              style={{ left: `${tick.positionPercent}%` }}
              className={`absolute w-1.5 h-3.5 rounded-full transform -translate-x-1/2 -translate-y-1 ${tick.colorClass} cursor-pointer group`}
            >
              {/* Tooltip on hovering tick mark */}
              <div className="hidden group-hover:block absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold font-mono px-2 py-1 rounded shadow-lg border border-slate-700 whitespace-nowrap z-50">
                {tick.badgeLabel}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Slider */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progressPercent}
          onChange={handleSliderChange}
          className="w-full bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 relative z-20"
        />
      </div>

      {/* Legend index */}
      <div className="flex flex-wrap gap-4 justify-center text-[10px] font-semibold text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          <span>Page View</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Click</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Scroll</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>Resize</span>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// Main Replay Page Component
// ----------------------------------------------------
const Replay = () => {
  const { sessionId } = useParams();

  const {
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
    setIsFullscreen,
    jumpTo
  } = useReplay(sessionId);

  // Organize tick events on timeline (views, clicks, scrolls, resizes)
  const timelineTicks = useTimeline(events, duration);

  const renderContent = () => {
    if (loading) return <ReplayLoader />;
    
    if (error) {
      return (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-12 text-center text-slate-500 flex flex-col items-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
          <h3 className="text-white font-bold text-base">Session Reconstruct Failed</h3>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
          <Link
            to="/sessions"
            className="mt-6 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-[#1e293b]"
          >
            Return to Sessions
          </Link>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* LEFT: Stats summary card */}
        <div className="xl:col-span-1 space-y-6">
          <ReplayStats stats={stats} />
          
          <div className="bg-[#0f172a] border border-[#1e293b] p-5 rounded-2xl">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Replay Instructions</h4>
            <ul className="text-[11px] text-slate-400 space-y-2 list-disc list-inside">
              <li>Use speed adjustments (0.5x to 4x) to pace events.</li>
              <li>Hover over timeline ticks to view exact action parameters.</li>
              <li>Mouse movements are smoothly interpolated between coordinates using LERP calculations.</li>
              <li>Press fullscreen mode button for full interface expansion.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT: Visual simulation screen */}
        <div className="xl:col-span-2 space-y-6 flex flex-col">
          {/* Mock Canvas browser */}
          <ReplayCanvas
            activePage={activePage}
            cursorPos={cursorPos}
            activeScroll={activeScroll}
            activeResize={activeResize}
            activeTooltip={activeTooltip}
            clickRipples={clickRipples}
            isPlaying={isPlaying}
          />

          {/* Timeline slider */}
          <ReplayTimeline
            currentTime={currentTime}
            duration={duration}
            timelineTicks={timelineTicks}
            jumpTo={jumpTo}
          />

          {/* Replay action buttons */}
          <ReplayControls
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            isFullscreen={isFullscreen}
            play={play}
            pause={pause}
            restart={restart}
            setPlaybackSpeed={setPlaybackSpeed}
            setIsFullscreen={setIsFullscreen}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-[#0b0f19] p-8 overflow-y-auto' : ''}>
      {isFullscreen ? (
        <div className="max-w-7xl mx-auto flex flex-col space-y-6 min-h-screen">
          <div className="flex justify-between items-center border-b border-[#1e293b] pb-4">
            <h2 className="text-white font-extrabold text-lg tracking-wide flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span>Replay Session: {sessionId}</span>
            </h2>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
            >
              Exit Fullscreen
            </button>
          </div>
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      ) : (
        <Layout title={`Session Replay Player`}>
          {/* Navigation breadcrumb */}
          <div className="mb-6 flex justify-between items-center">
            <Link
              to="/sessions"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Session Logs</span>
            </Link>
          </div>

          {renderContent()}
        </Layout>
      )}
    </div>
  );
};

export default Replay;
