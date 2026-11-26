const CACHE='vlt-app-shell-v1',ROOT=new URL('./',self.location).pathname;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll([ROOT,ROOT+'index.html',ROOT+'manifest.webmanifest'])));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(ROOT+'index.html',clone));}return response;}).catch(()=>caches.match(ROOT+'index.html')));}
});
