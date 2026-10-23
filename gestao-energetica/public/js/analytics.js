// Exportação de relatórios e simulador de economia.
window.Analytics = (() => {
  function exportJson() {
    const summary = Dashboard.getSummary();
    AppUtils.download(`energia-smart-relatorio-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(summary, null, 2), "application/json;charset=utf-8");
    AppUtils.toast("Relatório JSON exportado.");
  }
  function exportCsv() {
    const { devices, tariff } = Dashboard.getSummary();
    const rows = [["Equipamento", "Ambiente", "Categoria", "Potência nominal (W)", "Horas por dia", "Consumo estimado (kWh/dia)", "Custo estimado (R$/dia)"]];
    devices.forEach((d) => {
      const kwh = Number(d.watts) * Number(d.hoursPerDay) / 1000;
      rows.push([d.name, d.room, d.category, d.watts, d.hoursPerDay, kwh.toFixed(3), (kwh * tariff).toFixed(2)]);
    });
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n");
    AppUtils.download(`energia-smart-equipamentos-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
    AppUtils.toast("Relatório CSV exportado.");
  }
  function calculateSavings(hours) {
    const { devices, tariff } = Dashboard.getSummary();
    const ac = devices.find((d) => /ar-condicionado/i.test(d.name));
    if (!ac) return 0;
    return Number(ac.watts) / 1000 * Number(hours) * 30 * tariff;
  }
  function updateSavings() {
    const range = document.getElementById("hoursRange");
    if (!range) return;
    const hours = Number(range.value);
    document.getElementById("hoursValue").textContent = hours;
    document.getElementById("savingsValue").textContent = AppUtils.money(calculateSavings(hours));
  }
  function init() {
    document.getElementById("exportJson").addEventListener("click", exportJson);
    document.getElementById("exportCsv").addEventListener("click", exportCsv);
    document.getElementById("hoursRange").addEventListener("input", updateSavings);
    updateSavings();
  }
  return { init, updateSavings, exportJson, exportCsv };
})();
