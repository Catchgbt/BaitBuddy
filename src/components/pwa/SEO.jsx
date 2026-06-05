import { useEffect } from "react";

export default function SEO() {
  useEffect(() => {
    const setMeta = (attr, key, value) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    const setLink = (rel, href, type) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
      if (type) el.setAttribute("type", type);
    };

    // Title und Description
    document.title = "BaitBuddy – Angeln smarter: Fangbuch, Spots, KI & mehr";
    setMeta("name", "description", "BaitBuddy: Fangbuch, Spots, Wetter, Analyse, Community und KI-Fangberatung – DSGVO-freundlich, Dark Mode, offline nutzbar.");
    setMeta("name", "theme-color", "#0b1324");
    setMeta("name", "robots", "index, follow");

    // Open Graph
    setMeta("property", "og:title", "BaitBuddy");
    setMeta("property", "og:description", "Fangbuch, Spots, Wetter, Analyse, Community und KI-Fangberatung – alles in einer App.");
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", window.location.origin);
    setMeta("property", "og:image", "https://images.unsplash.com/photo-1502720705749-3cfa5f823cdf?q=80&w=1200&auto=format&fit=crop");

    // App Icons
    setLink("icon", "/favicon.ico");
    setLink("apple-touch-icon", "/apple-touch-icon.png");
    
    // PWA Manifest - zeigt auf unsere Backend-Funktion
    setLink("manifest", "/api/functions/manifest", "application/manifest+json");
  }, []);

  return null;
}