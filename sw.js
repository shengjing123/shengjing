/* 声境 · Service Worker v10 —— 缓存优先 + 后台静默更新（极速打开）
 * 背景：v9 为根治旧缓存改成了「网络优先」，代价是国内访问 GitHub 慢、每次打开都卡。
 *      现在已有 ?v=N 版本号机制保证代码更新，故 SW 回归「缓存优先 + 后台更新」：
 *        打开页面直接读缓存（秒开），同时后台悄悄拉最新，下次更快；
 *        文件带 ?v=N，URL 一变即视为新文件自动拉取，更新与速度兼得。
 * 对策：
 *   1) install 立即 skipWaiting；activate 清空所有旧缓存后 clients.claim()；
 *   2) fetch：仅处理同源请求；跨域（天气 API）直接放行不缓存，保证天气实时；
 *   3) 同源请求「缓存优先 + 后台更新」：有缓存立即返回，同时静默刷新缓存；
 *      缓存没有才等网络。mp3 同此策略（播过即存，离线可播、二次秒出）；
 *   4) 注册地址带 ?v=10（见 index.html / app.js），破除 CDN 对 sw.js 的缓存。
 */
const CACHE = "shengjing-v10";

self.addEventListener("install", () => {
  self.skipWaiting(); // 装好立刻接管，不等旧 SW 释放
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k))); // 删光所有旧缓存（v1~v9 任意名称）
    await self.clients.claim();                            // 接管全部已打开页面
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 跨域请求（如天气 API open-meteo.com）不缓存，直接走网络，保证天气数据实时
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);

    const networkPromise = fetch(req)
      .then((r) => {
        if (r && r.status === 200) cache.put(req, r.clone()); // 后台静默写入最新
        return r;
      })
      .catch(() => null);

    // 缓存优先：有缓存立即返回，同时后台静默更新（不阻塞渲染）
    if (cached) {
      event.waitUntil(networkPromise);
      return cached;
    }
    // 无缓存：等网络结果；失败回退已缓存或首页
    const net = await networkPromise;
    return net || cached || caches.match("./index.html");
  })());
});
