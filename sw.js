const CACHE="akif-bist-robot-v36";
const CORE=["./","index.html","styles.css","app.js","manifest.json","icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
])));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  const fresh=u.pathname.endsWith("/")||u.pathname.endsWith("/index.html")||u.pathname.endsWith("/app.js")||u.pathname.endsWith("/styles.css")||u.pathname.endsWith(".json");
  if(fresh){
    e.respondWith(fetch(e.request,{cache:"no-store"}).then(resp=>{
      const cp=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return resp;
    }).catch(()=>caches.match(e.request)));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
  }
});