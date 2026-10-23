// Cliente WebSocket: recebe leituras geradas no backend, sem criar dados de consumo localmente.
window.Simulator = (() => {
  let socket;
  let retryTimer;
  const listeners = new Set();
  const statusListeners = new Set();
  let latest = null;
  let history = [];
  let devices = [];
  function notify() { listeners.forEach((fn) => fn({ latest, history: [...history], devices: [...devices] })); }
  function setStatus(connected) { statusListeners.forEach((fn) => fn(connected)); }
  async function loadFallback() {
    try {
      const response = await fetch("/api/consumption");
      if (!response.ok) throw new Error("API indisponível");
      const data = await response.json();
      latest = data.reading; history = data.history || [];
      const deviceResponse = await fetch("/api/devices");
      const deviceData = await deviceResponse.json();
      devices = deviceData.devices || [];
      notify();
    } catch (error) { console.error("Não foi possível carregar dados:", error); }
  }
  function connect() {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${protocol}//${location.host}`);
    socket.addEventListener("open", () => setStatus(true));
    socket.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "initial") {
          latest = payload.reading; history = payload.history || [];
          loadDevices().finally(notify);
        } else if (payload.type === "consumption") {
          latest = payload;
          history.push(payload);
          if (history.length > 240) history.shift();
          notify();
        } else if (payload.type === "devices-updated") {
          devices = payload.devices || [];
          notify();
        }
      } catch (error) { console.error("Mensagem WebSocket inválida:", error); }
    });
    socket.addEventListener("close", () => {
      setStatus(false);
      clearTimeout(retryTimer);
      retryTimer = setTimeout(connect, 2500);
    });
    socket.addEventListener("error", () => socket.close());
  }
  async function loadDevices() {
    try { const r = await fetch("/api/devices"); const data = await r.json(); devices = data.devices || []; }
    catch (error) { console.error(error); }
  }
  async function refreshDevices() { await loadDevices(); notify(); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); }
  function start() { loadFallback().finally(connect); }
  return { start, subscribe, onStatus, refreshDevices, getState: () => ({ latest, history: [...history], devices: [...devices] }) };
})();
