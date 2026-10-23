// Funções compartilhadas: formatação, armazenamento local e notificações.
window.AppUtils = (() => {
  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
  function money(value) { return currency.format(Number.isFinite(Number(value)) ? Number(value) : 0); }
  function decimal(value, digits = 2) {
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value) || 0);
  }
  function time(date = new Date()) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(date)); }
  function dateShort(date = new Date()) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(date)); }
  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem("energiaSmartSettings") || "{}");
      return {
        tariff: Number.isFinite(saved.tariff) && saved.tariff > 0 ? saved.tariff : 0.92,
        goal: Number.isFinite(saved.goal) && saved.goal > 0 ? saved.goal : 250
      };
    } catch { return { tariff: 0.92, goal: 250 }; }
  }
  function saveSettings(settings) { localStorage.setItem("energiaSmartSettings", JSON.stringify(settings)); }
  function toast(message) {
    const region = document.getElementById("toastRegion");
    if (!region) return;
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    region.appendChild(item);
    setTimeout(() => item.remove(), 3400);
  }
  function download(filename, content, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    URL.revokeObjectURL(url);
  }
  return { money, decimal, time, dateShort, loadSettings, saveSettings, toast, download };
})();
