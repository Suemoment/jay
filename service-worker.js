// 修改静态资源后递增版本号，让浏览器安装新的离线缓存。
const CACHE_NAME = "campus-life-shell-v1";
const CACHE_PREFIX = "campus-life-shell-";
const APP_FILES = [
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./vendor/chart.umd.js"
];
const APP_SHELL = APP_FILES.map((file) => new URL(file, self.location.href).href);

self.addEventListener("install", (event) => {
  // 安装阶段缓存应用页面和所有本地资源，确保首次联网后可离线打开。
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  // 只清理本应用旧版本缓存，不影响同域名下的其他应用。
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  // 仅处理同源 GET 请求；外部请求和写操作保持浏览器默认行为。
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    try {
      return await fetch(request);
    } catch (error) {
      // 访问站点根路径时回退到已缓存的单页入口。
      if (request.mode === "navigate") {
        const indexUrl = new URL("./index.html", self.registration.scope).href;
        const offlinePage = await cache.match(indexUrl);
        if (offlinePage) return offlinePage;
      }
      throw error;
    }
  })());
});
