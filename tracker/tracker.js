/**
 * User Analytics Tracking SDK
 * Captures page views and clicks on any website.
 */
(function (global) {
  'use strict';

  // Config defaults
  const DEFAULT_CONFIG = {
    endpoint: 'http://localhost:5000/api/events',
    autoTrack: true
  };

  // Merge custom configurations if defined on the window
  const config = Object.assign({}, DEFAULT_CONFIG, global.trackerConfig || {});

  // Generate unique session ID using crypto if available, otherwise fallback
  function generateSessionId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback generator
    return 'sess_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
  }

  // Retrieve or generate persistent session ID
  let sessionId = localStorage.getItem('ua_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('ua_session_id', sessionId);
  }

  // Internal state
  const tracker = {
    sessionId: sessionId,
    config: config,
    
    // Core function to transmit events to API backend
    sendEvent: function (eventType, data = {}) {
      const payload = {
        session_id: this.sessionId,
        event_type: eventType,
        page_url: window.location.pathname || '/',
        timestamp: new Date().toISOString(),
        ...data
      };

      // Send event using standard browser fetch API
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        mode: 'cors'
      })
      .then(response => {
        if (!response.ok) {
          console.warn('Analytics SDK: Event delivery failed', response.statusText);
        }
      })
      .catch(error => {
        console.error('Analytics SDK: Error sending event', error);
      });
    },

    // Method to manually log a page view
    trackPageView: function () {
      this.sendEvent('page_view');
    },

    // Method to manually log a click
    trackClick: function (x, y) {
      this.sendEvent('click', { x: Math.round(x), y: Math.round(y) });
    }
  };

  // Throttle helper to limit trigger frequencies (reducing database/network load)
  function throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Automatic click, page view, mouse_move, scroll, and resize hookup
  if (config.autoTrack) {
    // 1. Log initial page view and dimensions when DOM is ready/loaded
    const onInitialLoad = () => {
      tracker.trackPageView();
      // Record starting viewport boundaries
      tracker.sendEvent('window_resize', {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });
    };

    if (document.readyState === 'complete') {
      onInitialLoad();
    } else {
      window.addEventListener('load', onInitialLoad);
    }

    // 2. Global click listener
    document.addEventListener('click', function (event) {
      const x = event.pageX;
      const y = event.pageY;
      tracker.trackClick(x, y);
    });

    // 3. Mouse Movement listener (throttled to 200ms)
    document.addEventListener(
      'mousemove',
      throttle(function (event) {
        tracker.sendEvent('mouse_move', {
          x: Math.round(event.pageX),
          y: Math.round(event.pageY)
        });
      }, 200)
    );

    // 4. Scroll offset listener (throttled to 200ms)
    window.addEventListener(
      'scroll',
      throttle(function () {
        const scrollY = window.scrollY || window.pageYOffset;
        const totalDocHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercentage = totalDocHeight > 0 
          ? parseFloat(((scrollY / totalDocHeight) * 100).toFixed(2)) 
          : 0;

        tracker.sendEvent('scroll', {
          scrollY: Math.round(scrollY),
          scrollPercentage: scrollPercentage
        });
      }, 200)
    );

    // 5. Window Resize listener (throttled to 500ms)
    window.addEventListener(
      'resize',
      throttle(function () {
        tracker.sendEvent('window_resize', {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight
        });
      }, 500)
    );

    // 6. SPA Route change support: Hijack history.pushState and history.replaceState
    const hijackHistory = (type) => {
      const orig = history[type];
      return function () {
        const result = orig.apply(this, arguments);
        const e = new Event(type.toLowerCase());
        e.arguments = arguments;
        window.dispatchEvent(e);
        return result;
      };
    };

    history.pushState = hijackHistory('pushState');
    history.replaceState = hijackHistory('replaceState');

    // Trigger page view and initial page size on state changes
    const onSpaRouteChange = () => {
      tracker.trackPageView();
      tracker.sendEvent('window_resize', {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
      });
    };

    window.addEventListener('pushstate', onSpaRouteChange);
    window.addEventListener('replacestate', onSpaRouteChange);
    window.addEventListener('popstate', onSpaRouteChange);
  }

  // Export module or attach globally
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = tracker;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () { return tracker; });
  } else {
    global.tracker = tracker;
  }

})(typeof window !== 'undefined' ? window : this);
