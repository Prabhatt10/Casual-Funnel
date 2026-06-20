import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';

/**
 * Custom hook to manage real-time click streaming for the Heatmap page.
 * @param {string} selectedPage Current page filter
 * @param {boolean} isLiveEnabled Toggle state for live data updates
 * @param {function} onNewClickReceived Callback fired whenever any click event is broadcasted
 */
export function useHeatmapSocket(selectedPage, isLiveEnabled, onNewClickReceived) {
  const socket = useSocket();
  const [liveClicks, setLiveClicks] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleClickBroadcast = (event) => {
      // 1. Check if Live Mode is enabled
      if (!isLiveEnabled) return;

      // 2. Filter by current page to update coordinate map state
      if (event.pageUrl === selectedPage) {
        setLiveClicks((prev) => [...prev, event]);
      }

      // 3. Fired for Toast notifications (regardless of page route)
      if (onNewClickReceived) {
        onNewClickReceived(event);
      }
    };

    socket.on('click_received', handleClickBroadcast);

    // Unsubscribe listener on unmount
    return () => {
      socket.off('click_received', handleClickBroadcast);
    };
  }, [socket, selectedPage, isLiveEnabled, onNewClickReceived]);

  const clearLiveClicks = () => {
    setLiveClicks([]);
  };

  return {
    liveClicks,
    setLiveClicks,
    clearLiveClicks
  };
}

export default useHeatmapSocket;
