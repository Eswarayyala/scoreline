(function () {
  try {
    var key = "grindinfo-theme";
    var stored = localStorage.getItem(key);
    var theme = (stored === "light" || stored === "dark")
      ? stored
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    var bg = theme === "light" ? "#f6f4ef" : "#12141a";
    var fg = theme === "light" ? "#1a1714" : "#eef0f4";
    document.documentElement.style.background = bg;
    document.documentElement.style.color = fg;
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
