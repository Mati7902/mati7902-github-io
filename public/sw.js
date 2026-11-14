/* Service worker de la PWA "Psicología Matías Sánchez".
 * Estrategia conservadora y segura para una app de salud:
 *  - App shell y estáticos: cache-first con actualización en segundo plano.
 *  - Navegaciones (HTML): network-first; si no hay red, página /offline.
 *  - NUNCA cachea respuestas de API, rutas de autenticación ni datos del paciente.
 */
const VERSION = "v2";
const SHELL_CACHE = `psms-shell-${VERSION}`;
const RUNTIME_CACHE = `psms-runtime-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"];
const NEVER_CACHE = [/^\/api\//, /^\/auth\//, /^\/login/, /^\/recuperar/, /^\/restablecer/, /^\/bienvenida/, /supabase\.co/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(async (cache) => {
        await cache.addAll(PRECACHE);
        // La página sin conexión trae una respiración guiada: se guardan también sus scripts y estilos.
        try {
          const html = await (await cache.match(OFFLINE_URL)).text();
          const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+\.(?:js|css|woff2)/g) || [])];
          await Promise.all(assets.map((a) => cache.add(a).catch(() => undefined)));
        } catch (e) {
          // Sin los scripts, la página igual muestra el texto.
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL_CACHE, RUNTIME_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE.some((re) => re.test(url.pathname) || re.test(url.href))) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(OFFLINE_URL);
        return cached || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }),
    );
    return;
  }

  const isStatic = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:png|svg|ico|woff2?|css|js)$/.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

/* Notificaciones al celular (Web Push). El texto llega del servidor; al tocarla se abre la app. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Psicología Matías Sánchez", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Psicología Matías Sánchez";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || undefined,
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
