document.documentElement.lang =
  location.pathname === "/zu" ||
  new URLSearchParams(location.search).get("lang") === "zu"
    ? "zu-ZA"
    : "en-ZA";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
