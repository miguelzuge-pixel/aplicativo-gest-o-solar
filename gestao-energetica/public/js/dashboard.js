// Cria e atualiza os gráficos e indicadores. Chart.js é carregado pela CDN no HTML.
window.Dashboard = (() => {
  let lineChart, roomChart, sparkChart;
  let state = { latest: null, history: [], devices: [] };
  let period = "24h";
  let settings = AppUtils.loadSettings();
  const palette = ["#0fa878", "#f2bd45", "#4b91df", "#8a78dc", "#e77e8a", "#45b9c7", "#91c65b"];
  const $ = (id) => document.getElementById(id);
  function chartColors() {
    const dark = document.documentElement.dataset.theme === "dark";
    return { text: dark ? "#98a8b7" : "#7a8796", grid: dark ? "#2a3948" : "#edf1f3" };
  }
  function chartDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = '"DM Sans", sans-serif';
    Chart.defaults.color = chartColors().text;
  }
  function makeLineData() {
    const count = period === "24h" ? 24 : period === "7d" ? 7 : 30;
    const rows = state.history;
    if (!rows.length) return { labels: Array.from({ length: count }, (_, i) => period === "24h" ? `${String(i).padStart(2, "0")}h` : `Dia ${i + 1}`), values: Array(count).fill(0) };
    if (period === "24h") {
      const groups = new Map();
      rows.forEach((r) => {
        const h = new Date(r.timestamp).getHours();
        if (!groups.has(h)) groups.set(h, []);
        groups.get(h).push(Number(r.powerKw || 0) * (3 / 3600));
      });
      const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}h`);
      // O histórico tem poucos minutos; para não fingir um histórico de 24 horas, os buckets vazios ficam nulos.
      const values = Array.from({ length: 24 }, (_, h) => groups.has(h) ? groups.get(h).reduce((a, b) => a + b, 0) : null);
      return { labels, values };
    }
    const buckets = new Map();
    rows.forEach((r) => {
      const date = new Date(r.timestamp);
      const key = period === "7d" ? date.toLocaleDateString("pt-BR") : date.toISOString().slice(0, 10);
      if (!buckets.has(key)) buckets.set(key, { energy: 0, count: 0 });
      const b = buckets.get(key); b.energy += Number(r.powerKw || 0) * (3 / 3600); b.count += 1;
    });
    const entries = [...buckets.entries()].slice(-count);
    return { labels: entries.map(([key]) => key.slice(0, 5)), values: entries.map(([, b]) => Number(b.energy.toFixed(3))) };
  }
  function ensureCharts() {
    if (!window.Chart) { AppUtils.toast("Não foi possível carregar Chart.js. Verifique sua conexão."); return; }
    chartDefaults();
    const lineCtx = $("consumptionChart");
    if (lineCtx && !lineChart) {
      lineChart = new Chart(lineCtx, {
        type: "line",
        data: { labels: [], datasets: [{ label: "Energia estimada (kWh)", data: [], borderColor: "#0fa878", backgroundColor: "rgba(15,168,120,.12)", fill: true, tension: .36, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2, spanGaps: true }] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: "index" }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${AppUtils.decimal(ctx.raw || 0, 3)} kWh estimados` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0, font: { size: 9 } }, border: { display: false } }, y: { beginAtZero: true, grid: { color: chartColors().grid }, ticks: { font: { size: 9 }, callback: (v) => `${v}` }, border: { display: false } } } }
      });
    }
    const roomCtx = $("roomChart");
    if (roomCtx && !roomChart) {
      roomChart = new Chart(roomCtx, { type: "doughnut", data: { labels: [], datasets: [{ data: [], backgroundColor: palette, borderWidth: 0, hoverOffset: 5 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: "75%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${AppUtils.decimal(ctx.raw, 2)} kWh/dia` } } } } });
    }
    const sparkCtx = $("sparkChart");
    if (sparkCtx && !sparkChart) {
      sparkChart = new Chart(sparkCtx, { type: "line", data: { labels: [], datasets: [{ data: [], borderColor: "#58e0b1", borderWidth: 2, tension: .4, pointRadius: 0, fill: true, backgroundColor: "rgba(88,224,177,.12)" }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { line: { capBezierPoints: true } } } });
    }
  }
  function dailyDeviceConsumption(device) { return Number(device.watts || 0) * Number(device.hoursPerDay || 0) / 1000; }
  function estimatedRoomData() {
    const map = new Map();
    state.devices.forEach((d) => map.set(d.room, (map.get(d.room) || 0) + dailyDeviceConsumption(d)));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }
  function renderRooms() {
    const rows = estimatedRoomData();
    const total = rows.reduce((sum, row) => sum + row[1], 0);
    $("donutTotal").textContent = AppUtils.decimal(total, 1);
    if (roomChart) {
      roomChart.data.labels = rows.map((r) => r[0]);
      roomChart.data.datasets[0].data = rows.map((r) => r[1]);
      roomChart.data.datasets[0].backgroundColor = palette.slice(0, rows.length);
      roomChart.update("none");
    }
    $("roomLegend").innerHTML = rows.slice(0, 6).map(([name, value], i) => `<div class="legend-row"><span class="legend-color" style="background:${palette[i % palette.length]}"></span><span class="room-name">${escapeHtml(name)}</span><strong>${AppUtils.decimal(value, 1)} kWh</strong></div>`).join("");
    const max = rows[0]?.[1] || 1;
    $("roomRanking").innerHTML = rows.slice(0, 5).map(([name, value], i) => `<div class="ranking-item"><span class="ranking-name">${escapeHtml(name)}</span><div class="ranking-track"><span style="width:${Math.max(2, value / max * 100)}%"></span></div><span class="ranking-value"><strong>${AppUtils.decimal(value, 2)}</strong> kWh</span></div>`).join("") || '<div class="empty-state">Sem dados de ambientes.</div>';
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
  function renderDevices() {
    const current = new Map((state.latest?.devices || []).map((d) => [d.id, d]));
    $("deviceCount").textContent = `${state.devices.length} dispositivos`;
    $("deviceTable").innerHTML = state.devices.map((device) => {
      const reading = current.get(device.id);
      const watts = reading ? reading.watts : 0;
      const daily = dailyDeviceConsumption(device);
      const anomaly = watts > Number(device.expectedWatts || device.watts) * 1.35;
      const status = watts > 0 ? `<span class="status-pill ${anomaly ? "warn" : ""}"><i></i>${anomaly ? "Pico detectado" : "Em operação"}</span>` : '<span class="status-pill off"><i></i>Baixo / repouso</span>';
      const icon = /ar-condicionado|geladeira/i.test(device.name) ? "snowflake" : /chuveiro/i.test(device.name) ? "droplets" : /tv|notebook/i.test(device.name) ? "monitor" : /luz|iluminação/i.test(device.name) ? "lightbulb" : "plug";
      return `<tr><td><div class="device-name"><span class="device-icon"><i data-lucide="${icon}"></i></span>${escapeHtml(device.name)}</div></td><td class="muted-cell">${escapeHtml(device.room)}</td><td><strong>${AppUtils.decimal(watts, 0)} W</strong></td><td><strong>${AppUtils.decimal(daily, 2)} kWh</strong></td><td>${status}</td><td class="analysis-text ${anomaly ? "warning" : ""}">${anomaly ? "Consumo acima do esperado" : "Dentro do padrão simulado"}</td></tr>`;
    }).join("");
    if (window.lucide) lucide.createIcons();
  }
  function renderMetrics() {
    const latest = state.latest;
    const readings = state.history;
    const currentKw = latest?.powerKw || 0;
    $("currentPower").textContent = AppUtils.decimal(currentKw, 2);
    $("lastUpdate").textContent = latest ? AppUtils.time(latest.timestamp) : "aguardando...";
    // Integração da potência (kW) ao longo do tempo; cada tick representa aproximadamente 3 segundos.
    const recentKwh = readings.reduce((sum, r) => sum + Number(r.powerKw || 0) * 3 / 3600, 0);
    const modelDaily = state.devices.reduce((sum, d) => sum + dailyDeviceConsumption(d), 0);
    const dayEstimate = Math.max(recentKwh, modelDaily * .42);
    const monthEstimate = dayEstimate * 30;
    $("todayKwh").textContent = AppUtils.decimal(dayEstimate, 1);
    $("monthKwh").textContent = AppUtils.decimal(monthEstimate, 0);
    $("monthCost").textContent = AppUtils.money(monthEstimate * settings.tariff);
    $("monthComparison").textContent = "Estimativa a partir do perfil cadastrado";
    const progress = Math.min(100, monthEstimate / settings.goal * 100);
    $("goalProgress").style.width = `${progress}%`;
    $("goalStatus").textContent = `${AppUtils.decimal(progress, 0)}% da meta`;
    $("goalProgress").style.background = progress >= 100 ? "var(--red)" : "var(--green)";
    if (sparkChart) {
      const data = readings.slice(-30).map((r) => r.powerKw);
      sparkChart.data.labels = data.map((_, i) => i);
      sparkChart.data.datasets[0].data = data;
      sparkChart.update("none");
    }
    if (lineChart) {
      const data = makeLineData();
      lineChart.data.labels = data.labels;
      lineChart.data.datasets[0].data = data.values;
      lineChart.options.scales.y.grid.color = chartColors().grid;
      lineChart.update("none");
    }
    return { dayEstimate, monthEstimate, currentKw, recentKwh };
  }
  function setSettings(next) { settings = next; render(); }
  function setPeriod(next) { period = next; renderMetrics(); }
  function render() { ensureCharts(); renderMetrics(); renderRooms(); renderDevices(); }
  function setState(next) { state = next; render(); }
  function init() {
    $("todayLabel").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date());
    document.querySelectorAll(".period-button").forEach((button) => button.addEventListener("click", () => {
      document.querySelectorAll(".period-button").forEach((b) => b.classList.toggle("active", b === button));
      setPeriod(button.dataset.period);
    }));
    ensureCharts();
  }
  function getSummary() {
    const metrics = renderMetrics();
    return { ...metrics, tariff: settings.tariff, goal: settings.goal, devices: state.devices, history: state.history, generatedAt: new Date().toISOString(), simulated: true };
  }
  function refreshTheme() {
    chartDefaults();
    [lineChart, roomChart, sparkChart].filter(Boolean).forEach((chart) => {
      chart.options.plugins.legend.labels && (chart.options.plugins.legend.labels.color = chartColors().text);
      if (chart.options.scales?.x) chart.options.scales.x.ticks.color = chartColors().text;
      if (chart.options.scales?.y) { chart.options.scales.y.ticks.color = chartColors().text; chart.options.scales.y.grid.color = chartColors().grid; }
      chart.update("none");
    });
  }
  return { init, setState, setSettings, render, getSummary, refreshTheme, dailyDeviceConsumption };
})();
