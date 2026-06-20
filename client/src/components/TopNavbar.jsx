import React from 'react';
import { RefreshCw, Trash2, Database } from 'lucide-react';
import { clearAllEventsData } from '../services/api';

const TopNavbar = ({ onRefresh, title }) => {
  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all analytics tracking event data? This cannot be undone.')) {
      try {
        await clearAllEventsData();
        alert('All events cleared successfully. Seeding data is recommended to restore demo dashboards.');
        if (onRefresh) onRefresh();
      } catch (error) {
        alert('Failed to clear database events: ' + error.message);
      }
    }
  };

  return (
    <header className="h-16 border-b border-[#1e293b] bg-[#0f172a] px-8 flex items-center justify-between sticky top-0 z-30 select-none">
      <div>
        <h1 className="text-lg font-bold text-white tracking-wide">{title || 'Dashboard'}</h1>
      </div>

      <div className="flex items-center gap-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-[#1e293b] text-slate-300 text-xs font-semibold transition-all duration-150"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
        )}

        <button
          onClick={handleClearData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/25 border border-rose-500/25 text-rose-400 text-xs font-semibold transition-all duration-150"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          <span>Clear Database</span>
        </button>

        <div className="flex items-center gap-2 border-l border-[#1e293b] pl-4">
          <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-indigo-400">
            <Database className="w-4 h-4" />
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs text-white font-semibold">MongoDB Status</p>
            <p className="text-[10px] text-emerald-400 font-bold -mt-0.5">CONNECTED</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
