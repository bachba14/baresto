// Service worker Monkomi : notifications de réservation sur téléphone (Web Push).
// Pas de cache hors ligne : le back-office a toujours besoin des données à jour.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Monkomi", {
      body: data.body || "",
      icon: "/app-icon/192",
      badge: "/app-icon/96",
      tag: data.tag,
      data: { url: data.url || "/admin" },
    }),
  );
});

// Toucher la notification : ouvre la page concernée, en réutilisant une fenêtre Monkomi déjà ouverte.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) return existing.focus().then((w) => (w && "navigate" in w ? w.navigate(url) : w));
      return self.clients.openWindow(url);
    }),
  );
});
