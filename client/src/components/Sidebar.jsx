import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Users, Flame, Settings, Zap } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: BarChart3 },
    { name: 'Sessions', path: '/sessions', icon: Users },
    { name: 'Heatmap', path: '/heatmap', icon: Flame },
  ];

  return (
    <aside className="w-64 bg-[#0f172a] border-r border-[#1e293b] flex flex-col h-screen fixed left-0 top-0 z-35 select-none">
      {/* Logo Branding */}
      <div className="h-16 flex items-center px-6 border-b border-[#1e293b] gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Zap className="w-4 h-4 text-white fill-current" />
        </div>
        <div>
          <span className="font-extrabold text-white text-lg tracking-wider block">CausalFunnel</span>
          <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase block -mt-1">Analytics API</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/25 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 transition-colors duration-200 ${
                  isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              />
              <span>{item.name}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer / Metadata */}
      <div className="p-4 border-t border-[#1e293b]">
        <div className="bg-[#131d35] rounded-xl p-3 border border-indigo-500/10 text-center">
          <p class="text-[11px] text-slate-400 font-medium">Tracking Agent Status</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Listening</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
