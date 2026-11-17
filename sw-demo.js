// This supports LOCAL notification previews only. Remote push requires OneSignal.
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick",e=>{
 e.notification.close();
 e.waitUntil((async()=>{
   const all=await self.clients.matchAll({type:"window",includeUncontrolled:true});
   for(const c of all)if(c.url.startsWith(self.registration.scope))return c.focus();
   return self.clients.openWindow(self.registration.scope);
 })());
});
