/* ============================================================
   PLANEJAMENTO DIMAN-BHZ — Core: Event Bus
   ============================================================ */

window.events = (() => {
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => off(event, callback); // returns unsubscribe fn
  }

  function once(event, callback) {
    const unsub = on(event, (...args) => { callback(...args); unsub(); });
    return unsub;
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => { try { cb(data); } catch(e) { console.error(`Event error [${event}]:`, e); } });
  }

  function clear(event) {
    if (event) delete listeners[event];
    else Object.keys(listeners).forEach(k => delete listeners[k]);
  }

  return { on, once, off, emit, clear };
})();
