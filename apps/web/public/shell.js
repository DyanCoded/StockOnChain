document.documentElement.lang =
  location.pathname === "/zu" ||
  new URLSearchParams(location.search).get("lang") === "zu"
    ? "zu-ZA"
    : "en-ZA";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

document.querySelectorAll("[data-onboarding-form]").forEach((form) => {
  form.addEventListener("submit", () => {
    try {
      sessionStorage.setItem(
        "stockonchain-onboarding-started-at",
        String(Date.now()),
      );
    } catch {
      // Timing falls back to the onboarding page mount.
    }
  });
});
