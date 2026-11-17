(()=>{
"use strict";
const $=id=>document.getElementById(id);
const money=n=>"S$"+Math.round(n).toLocaleString("en-SG");
const cfg=window.SALES_PUSH_CONFIG||{};
const appId=String(cfg.oneSignalAppId||"").trim();
let sales=null,threshold=20,oneSignal=null,demoSW=null;
let timer;
let lastWorkerError = "";
const workerURL=new URL("./push/onesignal/OneSignalSDKWorker.js",location.href);
const workerScope=new URL("./push/onesignal/",location.href).pathname;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ensureRemoteWorker(){
  if(!("serviceWorker" in navigator))throw Error("This browser does not support service workers.");
  try{
    let reg=await navigator.serviceWorker.getRegistration(workerScope);
    if(!reg || !reg.active){
      reg=await navigator.serviceWorker.register(workerURL.pathname,{
        scope:workerScope,
        updateViaCache:"none"
      });
    }
    for(let i=0;i<15&&!reg.active;i++){
      await sleep(500);
      reg=await navigator.serviceWorker.getRegistration(workerScope)||reg;
    }
    if(!reg.active)throw Error("The service worker registered but did not become active. Check the script or network.");
    lastWorkerError="";
    return reg;
  }catch(error){
    lastWorkerError=(error.name||"Error")+": "+error.message;
    throw error;
  }
}
function isSubscribed(){
 if(!oneSignal)return false;
 const sub=oneSignal.User.PushSubscription;
 return Boolean(sub.optedIn && sub.id && sub.token);
}
async function showDiagnostics(){
 const lines=[];
 const add=(k,v)=>lines.push(k+": "+v);
 const standalone=!!(window.navigator.standalone||window.matchMedia("(display-mode: standalone)").matches);
 add("Home Screen app",standalone?"Yes":"No — open from Home Screen icon");
 add("Notification permission",("Notification" in window)?Notification.permission:"API unavailable");
 add("Service worker supported",("serviceWorker" in navigator)?"Yes":"No");
 add("Expected site origin","https://llqqry.github.io");
 try{
   const res=await fetch(workerURL.href,{cache:"no-store"});
   add("OneSignal worker file",res.status+" "+(res.ok?"OK":"ERROR"));
   add("Worker MIME type",res.headers.get("content-type")||"unknown");
 }catch(err){add("Worker fetch error",err.message)}
 if("serviceWorker" in navigator){
  try{
   const regs=await navigator.serviceWorker.getRegistrations();
   const match=regs.find(reg=>reg.scope.endsWith(workerScope));
   add("OneSignal worker installed",match?(match.active?"Active":match.installing?"Installing":match.waiting?"Waiting":"Registered"):"NO");
   if(lastWorkerError)add("Last worker registration error",lastWorkerError);
   add("Registered scopes",regs.length?regs.map(reg=>new URL(reg.scope).pathname).join(", "):"None");
  }catch(err){add("Worker registration error",err.message)}
 }
 add("OneSignal initialized",oneSignal?"Yes":"No");
 if(oneSignal){
   const sub=oneSignal.User.PushSubscription;
   add("Push supported by SDK",oneSignal.Notifications.isPushSupported());
   add("OneSignal opted in",String(sub.optedIn));
   add("Push token generated",sub.token?"Yes":"No");
   add("OneSignal subscription ID",sub.id||"Not created");
 }
 const out=$("diagnostics");
 out.textContent=lines.join("\n");
 out.hidden=false;
 return lines;
}
async function awaitSubscription(){
 for(let i=0;i<12;i++){
   if(isSubscribed())return true;
   await sleep(750);
 }
 return isSubscribed();
}
function refreshSubscription(){
 if(!oneSignal)return;
 const sub=oneSignal.User.PushSubscription;
 const ready=Boolean(sub.optedIn && sub.id && sub.token);
 $("pushState").textContent=ready
   ? "✓ REAL PUSH SUBSCRIBED. You can now close the app and send a remote push from your OneSignal dashboard. Subscription ID: "+sub.id
   : "OneSignal connected, but this phone is NOT subscribed for remote push yet. Tap Enable notifications, then confirm your subscription appears in OneSignal → Audience → Subscriptions.";
 $("enableBtn").textContent=ready?"✓ Real push subscribed":"1 · Enable notifications";
}
const growth=(a,b)=>b>0?100*(a/b-1):0;
function status(t){$("status").textContent=t}
function toast(t){const el=$("toast");el.textContent=t;el.classList.add("show");clearTimeout(timer);timer=setTimeout(()=>el.classList.remove("show"),4000)}
function render(){
 if(!sales)return;
 const outlets=sales.outlets;
 const today=outlets.reduce((a,x)=>a+x.today,0),prev=outlets.reduce((a,x)=>a+x.lastWeek,0);
 const change=growth(today,prev),alerts=outlets.filter(o=>growth(o.today,o.lastWeek)<=-threshold);
 $("totalSales").textContent=money(today);
 $("lastWeek").textContent=money(prev);
 $("totalGrowth").textContent=(change>=0?"+":"")+change.toFixed(1)+"% vs last week";
 $("totalGrowth").className=change<0?"negative":"positive";
 $("riskCount").textContent=String(alerts.length);
 $("thresholdValue").textContent=threshold+"%";
 const badge=$("healthBadge");badge.textContent=alerts.length?alerts.length+" ALERT"+(alerts.length===1?"":"S"):"ALL CLEAR";badge.className="health-badge"+(alerts.length?"":" ok");
 const max=Math.max(1,...outlets.flatMap(o=>[o.today,o.lastWeek]));
 $("chart").replaceChildren(...outlets.map(o=>{
   const row=document.createElement("div");row.className="bar-row";
   const label=document.createElement("div");label.className="bar-label";label.textContent=o.name;
   const bars=document.createElement("div");bars.className="bars";
   for(const [value,type] of [[o.today,"c"],[o.lastWeek,"p"]]){
     const track=document.createElement("div");track.className="track";track.title=(type==="c"?"Today: ":"Last week: ")+money(value);
     const fill=document.createElement("div");fill.className="fill "+type;fill.style.width=(100*value/max)+"%";track.appendChild(fill);bars.appendChild(track);
   }
   row.append(label,bars);return row;
 }));
 $("outletRows").replaceChildren(...outlets.map(o=>{
  const delta=growth(o.today,o.lastWeek),row=document.createElement("div");row.className="outlet-row";
  const left=document.createElement("div"),name=document.createElement("div"),detail=document.createElement("div");
  name.className="name";name.textContent=o.name;
  detail.className="detail";detail.textContent=money(o.today)+" today · "+money(o.lastWeek)+" last week";
  const diff=document.createElement("div");diff.className="delta "+(delta<=-threshold?"bad":delta>=0?"good":"warn");
  diff.textContent=(delta>=0?"+":"")+delta.toFixed(1)+"%";left.append(name,detail);row.append(left,diff);return row;
 }));
}
async function demoRegistration(){
 if(!("serviceWorker" in navigator))throw Error("Service workers are unavailable.");
 if(demoSW)return demoSW;
 demoSW=await navigator.serviceWorker.register("./sw-demo.js",{scope:"./"});
 await navigator.serviceWorker.ready;
 return demoSW;
}
async function setupPush(){
 if(!appId)return;
 $("pushState").textContent="Connecting to OneSignal...";
 window.OneSignalDeferred=window.OneSignalDeferred||[];
 window.OneSignalDeferred.push(async OneSignal=>{
   try{
     await OneSignal.init({
       appId,
       serviceWorkerPath:workerURL.pathname.slice(1),
       serviceWorkerParam:{scope:workerScope},
     });
     oneSignal=OneSignal;
     OneSignal.User.PushSubscription.addEventListener("change",refreshSubscription);
     document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshSubscription()});
     refreshSubscription();
   }catch(e){
     $("pushState").textContent="OneSignal setup error: "+e.message;
     status("OneSignal setup error: "+e.message+". Tap Check push setup for details.");
   }
 });
}
async function enable(){
 if(!("Notification" in window)){status("Notifications unavailable. On iPhone, add the website to Home Screen, then open it from the icon.");return}
 try{
   if(appId){
     if(!oneSignal){status("OneSignal is not connected yet. Check your OneSignal Web site URL and reload the dashboard.");return}
     await oneSignal.Notifications.requestPermission();
     if(Notification.permission!=="granted"){status("Notification permission not granted. Check your browser or mobile notification settings.");return}
     status("Permission granted. Registering push service worker...");
     try{
       await ensureRemoteWorker();
     }catch(workerError){
       status("Service worker installation failed: "+workerError.message+". Tap Check push setup to see details.");
       await showDiagnostics();
       return;
     }
     status("Push service worker active. Registering OneSignal subscription...");
     await oneSignal.User.PushSubscription.optIn();
     const active=await awaitSubscription();
     refreshSubscription();
     if(active){
       status("✓ Real push subscription active. Close the app and send a test from OneSignal!");
     }else{
       status("Permission granted, but OneSignal did not complete registration. Tap Check push setup below to identify the issue.");
       await showDiagnostics();
     }
     return;
   }
   const permission=await Notification.requestPermission();
   if(permission==="granted"){
     await demoRegistration();
     $("enableBtn").textContent="✓ Notifications allowed";
     status("Permission granted for local demo notifications.");
   }else status("Permission not granted. Check your mobile notification settings.");
 }catch(e){status("Could not enable notifications: "+e.message)}
}
async function simulate(){
 if(!sales)return;
 const o=sales.outlets[0],pct=Math.abs(growth(o.today,o.lastWeek)).toFixed(1);
 const title="⚠ Sales Drop Alert — "+o.name;
 const body="Sales fell "+pct+"% vs last week. Today "+money(o.today)+" · Last week "+money(o.lastWeek)+".";
 if(!("Notification" in window)||Notification.permission!=="granted"){
   toast("Sales drop detected, but notifications are not enabled.");
   status("Sales drop rule triggered. Enable notification permission to display the local alert.");
   return;
 }
 try{
   const reg=await demoRegistration();
   await reg.showNotification(title,{body,icon:"./icons/icon.svg",tag:"demo-sales-drop",data:{url:location.href}});
   toast("Local sales-drop notification sent.");
   status("Local notification delivered while site is open. For closed-site push, configure OneSignal and send a remote alert.");
 }catch(e){status("Unable to display notification: "+e.message)}
}
async function init(){
 $("threshold").addEventListener("input",e=>{threshold=Number(e.target.value);render()});
 $("enableBtn").addEventListener("click",enable);
 $("testBtn").addEventListener("click",simulate);
 $("retryBtn").addEventListener("click",async()=>{
   status("Attempting to register the OneSignal service worker...");
   try{
      await ensureRemoteWorker();
      status("Service worker active. Trying to finish push subscription...");
      if(oneSignal && Notification.permission==="granted"){
        await oneSignal.User.PushSubscription.optIn();
        await awaitSubscription();
        refreshSubscription();
      }
   }catch(e){status("Registration failed: "+e.message)}
   await showDiagnostics();
   if(isSubscribed())status("✓ REAL PUSH SUBSCRIBED. Send a test from OneSignal.");
 });
 $("diagnoseBtn").addEventListener("click",async()=>{
   status("Checking service worker and OneSignal registration...");
   await showDiagnostics();
   status(isSubscribed()?"✓ Real push subscription active.":"Diagnostics complete. See results below. If worker is missing, check OneSignal's site origin and Web settings.");
 });
 try{const res=await fetch("./data/sales.json",{cache:"no-store"});if(!res.ok)throw Error("HTTP "+res.status);sales=await res.json();render()}
 catch(e){status("Could not load data: "+e.message)}
 setupPush();
}
init();
})();