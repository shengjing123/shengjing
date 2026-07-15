/* 声境 · Service Worker v11 —— 缓存永久保留（升级不再清空，秒开且不重下音频）
 * 背景：v8~v10 每次升级都 caches.delete 清空所有缓存，导致用户一更新就重新从 GitHub 慢吞吞下载，
 *       尤其 56MB 音频被反复清空重下，体验越更新越慢。
 * 对策：
 *   1) install 立即 skipWaiting；activate 仅 claim 接管，【不清任何缓存】；
 *   2) fetch：同源请求用 caches.match(req) 查【所有缓存】（含历史版本），命中即返回（秒开），
 *      同时后台静默 fetch 更新写入固定缓存；未命中才等网络。
 *      → 已下载的 .mp3 跨版本永久可用，升级 SW 不再重下音频。
 *   3) 跨域请求（天气 API open-meteo.com）直接放行、不缓存，保证天气实时；
 *   4) 注册地址带 ?v=11（见 index.html / app.js），破除 CDN 对 sw.js 自身的缓存。
 *   注：?reset=1 在 index.html 内联脚本改为「只清代码缓存、保留含 mp3 的缓存」，手动刷新也不丢声音。
 */
const CACHE = "shengjing-v11"; // 固定写入名（仅作分区，不再随升级清空）

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // 仅接管页面，不清缓存——保留用户已下载的音频与代码
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 跨域（天气 API 等）不缓存，直接走网络，保证数据实时
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    // 查所有缓存（含历史版本）。已下载的音频/代码命中即返回，升级 SW 也不重下
    const cached = await caches.match(req);
    const cache = await caches.open(CACHE);

    const networkPromise = fetch(req)
      .then((r) => {
        if (r && r.status === 200) cache.put(req, r.clone());
        return r;
      })
      .catch(() => null);

    if (cached) {
      event.waitUntil(networkPromise); // 后台静默更新，不阻塞返回
      return cached;
    }
    const net = await networkPromise;
    return net || cached || caches.match("./index.html");
  })());
});
