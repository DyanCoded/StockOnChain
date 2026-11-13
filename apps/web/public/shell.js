document.documentElement.lang = location.pathname === "/zu" ? "zu-ZA" : "en-ZA";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
