/* 声境 · Service Worker（仅缓存应用外壳 + 运行时缓存音频，离线可用） */
const CACHE = "shengjing-v4";
const SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 音频：运行时 cache-first（首次加载后离线可播）
  if (url.pathname.endsWith(".mp3")) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((res) =>
          res || fetch(req).then((r) => { c.put(req, r.clone()); return r; }).catch(() => res)
        )
      )
    );
    return;
  }

  // 其它：缓存优先，回退网络
  e.respondWith(caches.match(req).then((res) => res || fetch(req)));
});
