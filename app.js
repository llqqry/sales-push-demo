(()=>{
"use strict";
const $=id=>document.getElementById(id);
const money=n=>"S$"+Math.round(n).toLocaleString("en-SG");
const cfg=window.SALES_PUSH_CONFIG||{};
const appId=String(cfg.oneSignalAppId||"").trim();
let sales=null,threshold=20,oneSignal=null,demoSW=null;
let timer;
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
     const workerUrl=new URL("./push/onesignal/OneSignalSDKWorker.js",location.href);
     const scope=new URL("./push/onesignal/",location.href).pathname;
     await OneSignal.init({appId,serviceWorkerPath:workerUrl.pathname.slice(1),serviceWorkerParam:{scope}});
     oneSignal=OneSignal;
     $("pushState").textContent="OneSignal connected. Enable notifications, then send a remote alert from OneSignal or GitHub Actions.";
   }catch(e){$("pushState").textContent="OneSignal setup error: "+e.message}
 });
}
async function enable(){
 if(!("Notification" in window)){status("Notifications unavailable. On iPhone, add the website to Home Screen, then open from the icon.");return}
 try{
   const permission=oneSignal?(await oneSignal.Notifications.requestPermission(),Notification.permission):await Notification.requestPermission();
   if(permission==="granted"){
     if(!appId)await demoRegistration();
     $("enableBtn").textContent="✓ Notifications allowed";
     status(appId?"Permission granted. Verify subscription in OneSignal for closed-site push.":"Permission granted. Tap Simulate sales drop to see a local notification.");
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
 try{const res=await fetch("./data/sales.json",{cache:"no-store"});if(!res.ok)throw Error("HTTP "+res.status);sales=await res.json();render()}
 catch(e){status("Could not load data: "+e.message)}
 setupPush();
}
init();
})();