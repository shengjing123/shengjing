/* 声境 · Service Worker（v6：启动即清空所有旧缓存，根治手机卡老版本） */
const CACHE = "shengjing-v6";
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
  // 安装即接管，不等旧 SW 释放
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  // 关键：删掉所有旧缓存（v1~v5 任意名称），手机上残留的老页面一律作废
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
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
