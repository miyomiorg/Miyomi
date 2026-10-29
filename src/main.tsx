import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// The old per-logo image cache (removed) grew without bound — free it.
if ("caches" in window) {
  caches.delete("miyomi-image-cache-v1").catch(() => {});
}

// PWA service worker — production only, so local dev never caches stale code.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => console.warn("Service worker registration failed:", error));
  });
}
