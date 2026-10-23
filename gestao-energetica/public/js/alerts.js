// Alertas simples e explicáveis a partir dos dados simulados.
window.Alerts = (() => {
  let previousPower = 0;
  let alerts = [];
  const seen = new Set();
  function add(type, title, message, key) {
    if (seen.has(key)) return;
    seen.add(key);
    alerts.unshift({ type, title, message, time: new Date() });
    alerts = alerts.slice(0, 5);
  }
  function evaluate(state) {
    if (!state.latest) return;
    const power = Number(state.latest.powerKw || 0);
    if (power > 4.5) add("danger", "Pico de consumo", `A potência simulada atingiu ${AppUtils.decimal(power, 2)} kW. Verifique os equipamentos ativos.`, `peak-${Math.floor(Date.now() / 60000)}`);
    const current = new Map((state.latest.devices || []).map((d) => [d.id, d]));
    state.devices.forEach((device) => {
      const reading = current.get(device.id);
      if (reading && reading.watts > Number(device.expectedWatts || device.watts) * 1.35) {
        add("warning", "Consumo acima do esperado", `${device.name} está usando ${reading.watts} W na simulação.`, `device-${device.id}-${Math.floor(Date.now() / 60000)}`);
      }
    });
    const modelDaily = state.devices.reduce((sum, d) => sum + Number(d.watts) * Number(d.hoursPerDay) / 1000, 0);
    const monthEstimate = modelDaily * 30;
    const settings = AppUtils.loadSettings();
    if (monthEstimate > settings.goal) add("warning", "Meta mensal em risco", `A projeção (${AppUtils.decimal(monthEstimate, 0)} kWh) supera a meta de ${AppUtils.decimal(settings.goal, 0)} kWh.`, "monthly-goal");
    if (previousPower > 0 && power > previousPower * 1.8 && power > 1.5) add("warning", "Variação brusca", "A potência aumentou rapidamente em relação à leitura anterior.", `surge-${Math.floor(Date.now() / 60000)}`);
    previousPower = power;
    render();
  }
  function render() {
    const target = document.getElementById("alertList");
    document.getElementById("alertCount").textContent = alerts.length;
    document.getElementById("alertPill").textContent = alerts.length ? `${alerts.length} ativo(s)` : "Tudo tranquilo";
    if (!alerts.length) {
      target.innerHTML = '<div class="empty-state">Nenhum alerta novo. O monitoramento continua ativo.</div>';
      return;
    }
    target.innerHTML = alerts.map((alert) => `<div class="alert-item"><span class="alert-symbol ${alert.type === "danger" ? "danger" : ""}"><i data-lucide="${alert.type === "danger" ? "zap" : "alert-triangle"}"></i></span><div><strong>${escapeHtml(alert.title)}</strong><p>${escapeHtml(alert.message)}</p></div><span class="alert-time">${AppUtils.time(alert.time)}</span></div>`).join("");
    if (window.lucide) lucide.createIcons();
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
  function init() {
    document.getElementById("alertsShortcut").addEventListener("click", () => document.getElementById("alerts").scrollIntoView({ behavior: "smooth" }));
  }
  return { init, evaluate, render };
})();
