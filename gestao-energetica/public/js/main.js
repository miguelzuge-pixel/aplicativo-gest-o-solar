// Inicialização da aplicação: cada módulo mantém sua responsabilidade.
(() => {
  function initTheme() {
    const saved = localStorage.getItem("energiaSmartTheme");
    document.documentElement.dataset.theme = saved === "dark" ? "dark" : "light";
    document.getElementById("themeToggle").addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("energiaSmartTheme", next);
      Dashboard.refreshTheme();
      if (window.lucide) lucide.createIcons();
    });
  }
  function initNavigation() {
    const sidebar = document.getElementById("sidebar");
    document.getElementById("menuToggle").addEventListener("click", () => sidebar.classList.toggle("open"));
    document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("active", item === link));
      sidebar.classList.remove("open");
    }));
  }
  function initConnectionLabel() {
    Simulator.onStatus((connected) => {
      const label = document.getElementById("connectionLabel");
      label.textContent = connected ? "Sensores conectados" : "Reconectando...";
      label.style.color = connected ? "var(--green)" : "var(--yellow)";
    });
  }
  function start() {
    initTheme();
    initNavigation();
    Dashboard.init();
    Analytics.init();
    Alerts.init();
    Settings.init();
    initConnectionLabel();
    if (window.lucide) lucide.createIcons();
    Simulator.subscribe((state) => {
      Dashboard.setState(state);
      Alerts.evaluate(state);
      Analytics.updateSavings();
    });
    Simulator.start();
  }
  document.addEventListener("DOMContentLoaded", start);
})();
