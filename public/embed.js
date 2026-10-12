/*!
 * Monkomi — script d'intégration
 *
 * Widget en ligne :
 *   <div data-monkomi="reservation"></div>   (ou "menu")
 *   <script src="https://monkomi.be/embed.js" data-restaurant="votre-restaurant" async></script>
 *
 * Bouton qui ouvre une fenêtre :
 *   <button data-monkomi-open="reservation">Réserver</button>
 *
 * Options (attributs) : data-theme="light|dark", data-color="#b45309"
 * Événement : window.addEventListener("monkomi:reservation", e => e.detail)
 *
 * Les anciens codes (data-baresto, data-baresto-open, « baresto:reservation ») restent compris.
 */
(function () {
  if (window.Monkomi) return;

  var script =
    document.currentScript ||
    document.querySelector('script[src*="embed.js"]');
  var BASE = new URL(script.src).origin;
  var WIDGETS = { menu: "menu", reservation: "reservation" };
  // Préfixes d'attributs acceptés : le nouveau, puis l'ancien nom du produit.
  var PREFIXES = ["data-monkomi", "data-baresto"];
  // Restaurant : attribut data-restaurant du widget, sinon celui du script.
  var DEFAULT_RESTAURANT = script.getAttribute("data-restaurant");
  var frames = {};
  var counter = 0;

  function attr(el, suffix) {
    for (var i = 0; i < PREFIXES.length; i++) {
      var value = el.getAttribute(PREFIXES[i] + suffix);
      if (value !== null) return value;
    }
    return null;
  }

  function widgetUrl(type, el, frameId) {
    var params = new URLSearchParams({ frame: frameId });
    var theme = el && el.getAttribute("data-theme");
    var color = el && el.getAttribute("data-color");
    if (theme) params.set("theme", theme);
    if (color) params.set("color", color.replace("#", ""));
    var slug = (el && el.getAttribute("data-restaurant")) || DEFAULT_RESTAURANT;
    if (!slug) console.error("[Monkomi] Attribut data-restaurant manquant sur le script.");
    return BASE + "/widget/" + encodeURIComponent(slug || "") + "/" + WIDGETS[type] + "?" + params.toString();
  }

  function createFrame(type, el) {
    var frameId = "monkomi-" + ++counter;
    var iframe = document.createElement("iframe");
    iframe.src = widgetUrl(type, el, frameId);
    iframe.title = type === "menu" ? "Notre carte" : "Réserver une table";
    iframe.loading = "lazy";
    iframe.setAttribute("allow", "clipboard-write");
    iframe.style.cssText =
      "width:100%;border:0;display:block;min-height:420px;color-scheme:normal;background:transparent;";
    frames[frameId] = iframe;
    return iframe;
  }

  function mount(root) {
    var nodes = (root || document).querySelectorAll(
      "[data-monkomi]:not([data-monkomi-ready]), [data-baresto]:not([data-monkomi-ready])"
    );
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var type = attr(el, "");
      if (!WIDGETS[type]) continue;
      el.setAttribute("data-monkomi-ready", "");
      el.appendChild(createFrame(type, el));
    }
  }

  // ── Fenêtre modale ──────────────────────────────────────────
  var overlay;

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.documentElement.style.overflow = "";
  }

  function open(type, el) {
    if (!WIDGETS[type]) return;
    close();
    overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:4vh 12px;";

    var box = document.createElement("div");
    box.style.cssText =
      "position:relative;width:100%;max-width:560px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.35);";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Fermer");
    btn.innerHTML = "&times;";
    btn.style.cssText =
      "position:absolute;top:8px;right:10px;z-index:1;width:32px;height:32px;border:0;border-radius:50%;background:rgba(0,0,0,.08);font:22px/32px sans-serif;cursor:pointer;color:#333;";
    btn.onclick = close;

    box.appendChild(btn);
    box.appendChild(createFrame(type, el));
    overlay.appendChild(box);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    btn.focus();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  document.addEventListener("click", function (e) {
    var trigger = e.target.closest && e.target.closest("[data-monkomi-open], [data-baresto-open]");
    if (!trigger) return;
    e.preventDefault();
    open(attr(trigger, "-open"), trigger);
  });

  // ── Messages venant des iframes ─────────────────────────────
  window.addEventListener("message", function (e) {
    if (e.origin !== BASE || !e.data || typeof e.data !== "object") return;
    var frame = frames[e.data.frameId];
    var type = String(e.data.type || "").replace(/^baresto:/, "monkomi:");
    if (type === "monkomi:resize" && frame) {
      frame.style.minHeight = "0";
      frame.style.height = e.data.height + "px";
    }
    if (type === "monkomi:reservation") {
      window.dispatchEvent(new CustomEvent("monkomi:reservation", { detail: e.data }));
      // Ancien nom de l'événement, pour les sites déjà intégrés.
      window.dispatchEvent(new CustomEvent("baresto:reservation", { detail: e.data }));
    }
  });

  window.Monkomi = { open: open, close: close, mount: mount };
  window.Baresto = window.Monkomi;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { mount(); });
  } else {
    mount();
  }
})();
