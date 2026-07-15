/* 声境 · Service Worker v9 —— 彻底根治手机卡在老版本
 * 根因：GitHub Pages 会缓存 sw.js 本身，手机一直拿到最早那版（缓存优先、永不更新），
 *       于是永远吃最早那版带 bug 的旧页面。
 * 对策：
 *   1) install 立即 self.skipWaiting()，不等旧 SW 释放；
 *   2) activate 清空【所有】缓存后 clients.claim() 接管全部已打开页面；
 *   3) fetch 对 HTML/CSS/JS/图片 走【网络优先 + 写入缓存】（保证永远最新，离线也能开）；
 *      仅 .mp3 走缓存优先，支持离线播放；
 *   4) 注册地址带 ?v=9（见 index.html / app.js），破除 CDN 对 sw.js 的缓存，强制拉最新。
 */
const CACHE = "shengjing-v9";

self.addEventListener("install", () => {
  self.skipWaiting(); // 装好立刻接管，不等旧 SW 释放
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k))); // 删光所有旧缓存（v1~v7 任意名称）
    await self.clients.claim();                            // 接管全部已打开页面
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 音频：缓存优先（一次加载后离线可播），失败再走网络
  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(
      caches.match(req).then((res) => {
        if (res) return res;
        return fetch(req)
          .then((r) => {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return r;
          })
          .catch(() => new Response("offline", { status: 504 }));
      })
    );
    return;
  }

  // 其它资源（HTML/CSS/JS/图标/字体）：网络优先，失败回退缓存（保证每次都拿到最新代码）
  event.respondWith(
    fetch(req)
      .then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return r;
      })
      .catch(() => caches.match(req).then((res) => res || caches.match("./index.html")))
  );
});
