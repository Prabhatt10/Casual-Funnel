import React from 'react';

const StatsCard = ({ title, value, icon: Icon, trend, description, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'from-indigo-600/10 to-indigo-500/5 text-indigo-400 border-indigo-500/15',
    emerald: 'from-emerald-600/10 to-emerald-500/5 text-emerald-400 border-emerald-500/15',
    purple: 'from-purple-600/10 to-purple-500/5 text-purple-400 border-purple-500/15',
    sky: 'from-sky-600/10 to-sky-500/5 text-sky-400 border-sky-500/15',
    amber: 'from-amber-600/10 to-amber-500/5 text-amber-400 border-amber-500/15',
  };

  const bgStyles = colorMap[color] || colorMap.indigo;

  return (
    <div className={`bg-gradient-to-br ${bgStyles} border rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-black/20`}>
      <div className="flex justify-between items-start">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/55 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-extrabold text-white tracking-tight">{value}</h3>
        <div className="flex items-center gap-1.5 mt-2">
          {trend && (
            <span className={`text-xs font-semibold ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend}
            </span>
          )}
          <span className="text-slate-400 text-xs font-medium">{description}</span>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
