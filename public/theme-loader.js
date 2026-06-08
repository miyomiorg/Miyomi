(function () {
  try {
    const themeMode = localStorage.getItem("miyomi-theme-mode") || "auto";
    const cachedTheme = localStorage.getItem("miyomi-theme-cache");

    // 1. Handle Dark/Light Mode
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = themeMode === "dark" || (themeMode === "auto" && systemDark);

    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // 2. Handle Custom Theme Variables
    if (cachedTheme) {
      const themeData = JSON.parse(cachedTheme);
      const modeVars = isDark ? themeData.dark : themeData.light;

      if (modeVars) {
        Object.entries(modeVars).forEach(([key, val]) => {
          if (typeof val === "string") {
            document.documentElement.style.setProperty(key, val);
          }
        });
      }
    }
  } catch (e) {
    console.warn("Theme loader failed:", e);
  }
})();
