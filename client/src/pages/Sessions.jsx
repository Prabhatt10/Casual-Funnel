import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, FileDown, Calendar, ArrowUpRight, Eye, MonitorPlay } from 'lucide-react';
import Layout from '../components/Layout';
import { getSessions } from '../services/api';

const Sessions = () => {
  const navigate = useNavigate();
  
  // States
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const limit = 10;

  // Fetch Sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSessions({
        search,
        startDate,
        endDate,
        page,
        limit
      });
      setSessions(data.sessions);
      setTotalPages(data.pagination.totalPages);
      setTotalSessions(data.pagination.totalSessions);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load session aggregation data.');
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate, page]);

  // Refetch when dependencies change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Reset page to 1 when search or dates change
  useEffect(() => {
    setPage(1);
  }, [search, startDate, endDate]);

  // Export to CSV Functionality (Bonus Feature)
  const exportToCSV = async () => {
    try {
      // Fetch a larger page size to capture all matched logs for export
      const data = await getSessions({
        search,
        startDate,
        endDate,
        page: 1,
        limit: 1000
      });

      const exportList = data.sessions;
      if (exportList.length === 0) {
        alert('No session records to export.');
        return;
      }

      // Define CSV columns
      const headers = ['Session ID', 'Total Events', 'Page Views', 'Clicks', 'First Seen', 'Last Seen'];
      const csvRows = [headers.join(',')];

      for (const row of exportList) {
        const values = [
          row.sessionId,
          row.totalEvents,
          row.pageViews || 0,
          row.clicks || 0,
          new Date(row.firstSeen).toISOString(),
          new Date(row.lastSeen).toISOString()
        ];
        csvRows.push(values.join(','));
      }

      // Trigger file download
      const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `session_analytics_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleSessionClick = (sessionId) => {
    navigate(`/sessions/${sessionId}`);
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Layout onRefresh={fetchSessions} title="Session Explorer">
      {/* Top Filter Panel */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-[#0f172a] p-5 rounded-2xl border border-[#1e293b]">
        {/* Search Bar */}
        <div className="relative w-full xl:w-96">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Session ID..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Date Controls & Export */}
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto xl:ml-0">
            {(startDate || endDate || search) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Reset
              </button>
            )}

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/10 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-600/10 border border-rose-500/25 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Main Aggregations Table */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e293b] bg-slate-900/35">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Session ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Events</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Views / Clicks</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">First Active</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading ? (
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-40"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-10"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-28"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-28"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-6 bg-slate-800 rounded w-12 ml-auto"></div></td>
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-sm">
                    No active sessions found matching criteria.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr
                    key={sess.sessionId}
                    onClick={() => handleSessionClick(sess.sessionId)}
                    className="hover:bg-slate-800/20 cursor-pointer transition duration-150 group"
                  >
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-300">
                      {sess.sessionId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        {sess.totalEvents}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-400">
                      <span>{sess.pageViews || 0} views / {sess.clicks || 0} clicks</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-medium">
                      {formatDate(sess.firstSeen)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-medium">
                      {formatDate(sess.lastSeen)}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/replay/${sess.sessionId}`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/10 transition duration-150"
                      >
                        <MonitorPlay className="w-3.5 h-3.5" />
                        <span>Replay</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSessionClick(sess.sessionId);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-[#1e293b] text-slate-300 text-xs font-semibold transition duration-150"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && totalSessions > 0 && (
          <div className="px-6 py-4 bg-slate-900/35 border-t border-[#1e293b] flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">
              Showing Page {page} of {totalPages} (Total {totalSessions} sessions)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-[#1e293b] text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-[#1e293b] text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sessions;
