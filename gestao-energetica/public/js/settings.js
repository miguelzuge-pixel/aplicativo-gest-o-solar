// Configurações locais do usuário: tarifa e meta ficam no localStorage deste navegador.
window.Settings = (() => {
  let settings = AppUtils.loadSettings();
  const dialog = () => document.getElementById("settingsDialog");
  function open() {
    document.getElementById("tariffInput").value = settings.tariff;
    document.getElementById("goalInput").value = settings.goal;
    if (typeof dialog().showModal === "function") dialog().showModal();
    else AppUtils.toast("Seu navegador não suporta a janela de configurações.");
  }
  function save(event) {
    event.preventDefault();
    const tariff = Number(document.getElementById("tariffInput").value);
    const goal = Number(document.getElementById("goalInput").value);
    if (!Number.isFinite(tariff) || tariff <= 0 || tariff > 10 || !Number.isFinite(goal) || goal < 10 || goal > 100000) {
      AppUtils.toast("Informe uma tarifa e uma meta dentro dos limites permitidos.");
      return;
    }
    settings = { tariff, goal };
    AppUtils.saveSettings(settings);
    Dashboard.setSettings(settings);
    Analytics.updateSavings();
    dialog().close();
    AppUtils.toast("Configurações salvas neste navegador.");
  }
  function init() {
    document.getElementById("openSettings").addEventListener("click", open);
    document.getElementById("settingsForm").addEventListener("submit", save);
    document.getElementById("settingsForm").addEventListener("click", (event) => {
      if (event.target.id === "saveSettings") save(event);
    });
    // O botão de salvar também é submit; o listener de submit é a rota principal.
  }
  return { init, open, get: () => ({ ...settings }) };
})();
