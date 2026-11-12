document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = location.pathname.startsWith("/zu")
    ? "zu-ZA"
    : "en-ZA";

  document
    .querySelector("[data-locale-picker]")
    ?.addEventListener("change", (event) => {
      location.assign(event.currentTarget.value);
    });

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.register("/sw.js");
  }
});