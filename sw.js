const CACHE="akif-bist-robot-v30";
const ASSETS=["./","index.html","styles.css","app.js","manifest.json","icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
])));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  const networkFirst=u.pathname.endsWith(".json")||u.pathname.endsWith("/app.js")||u.pathname.endsWith("/index.html")||u.pathname.endsWith("/");
  if(networkFirst){
    e.respondWith(fetch(e.request).then(resp=>{
      const cp=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return resp;
    }).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
      const cp=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return resp;
    })));
  }
});