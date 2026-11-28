const CACHE='vlt-app-shell-v2.1.0-jackpot',ROOT=new URL('./',self.location).pathname;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll([ROOT,ROOT+'index.html',ROOT+'manifest.webmanifest'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('vlt-app-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(ROOT+'index.html',clone));}return response;}).catch(()=>caches.match(ROOT+'index.html')));}
});
