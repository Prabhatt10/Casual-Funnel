import { useMemo } from 'react';

/**
 * Custom hook to map timeline event ticks to percentage positions
 * @param {Array} events Mapped events with relative timestamps
 * @param {number} duration Total duration of replay in ms
 */
export function useTimeline(events, duration) {
  return useMemo(() => {
    if (!events || events.length === 0 || duration === 0) return [];

    return events
      .map((event) => {
        const positionPercent = (event.relativeTime / duration) * 100;

        // Visual mapping: timeline color codes
        let colorClass = 'bg-slate-400';
        let badgeLabel = '';
        
        switch (event.eventType) {
          case 'page_view':
            colorClass = 'bg-indigo-500 hover:bg-indigo-400 ring-2 ring-indigo-500/20';
            badgeLabel = `Viewed ${event.pageUrl}`;
            break;
          case 'click':
            colorClass = 'bg-amber-500 hover:bg-amber-400 ring-2 ring-amber-500/20';
            badgeLabel = `Clicked (${event.coordinates?.x}, ${event.coordinates?.y})`;
            break;
          case 'scroll':
            colorClass = 'bg-emerald-500 hover:bg-emerald-400 ring-2 ring-emerald-500/20';
            badgeLabel = `Scrolled to ${event.scroll?.scrollPercentage}%`;
            break;
          case 'window_resize':
            colorClass = 'bg-purple-500 hover:bg-purple-400 ring-2 ring-purple-500/20';
            badgeLabel = `Resized ${event.resize?.windowWidth}x${event.resize?.windowHeight}`;
            break;
          case 'mouse_move':
            colorClass = 'bg-slate-600/30';
            badgeLabel = `Moved cursor`;
            break;
          default:
            break;
        }

        return {
          id: event._id || Math.random().toString(),
          eventType: event.eventType,
          relativeTime: event.relativeTime,
          positionPercent,
          colorClass,
          badgeLabel,
          pageUrl: event.pageUrl,
          rawEvent: event
        };
      })
      // Filter out high-frequency mouse movements to prevent overcrowding the progress slider bar
      .filter((e) => e.eventType !== 'mouse_move');
  }, [events, duration]);
}
