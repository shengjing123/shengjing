/* 声境 · Service Worker（网络优先，更新即生效；音频离线可播） */
const CACHE = "shengjing-v5";
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

  // 音频：缓存优先（首次加载后离线可播），否则走网络
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

  // 其它资源：网络优先，失败回退缓存（保证每次都拿到最新代码）
  e.respondWith(
    fetch(req)
      .then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return r;
      })
      .catch(() => caches.match(req).then((res) => res || caches.match("./index.html")))
  );
});
