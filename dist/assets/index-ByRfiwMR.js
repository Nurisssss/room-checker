(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function o(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=o(r);fetch(r.href,a)}})();const D=120;function P(e,t,o,n){return e<n&&o<t}function w(e,t,o,n,r){if(o>=n)return{status:"Unavailable",reason:"invalidRange"};if(o<r)return{status:"Unavailable",reason:"past"};if((n-o)/6e4>D)return{status:"Unavailable",reason:"tooLong"};if(e.blocked)return{status:"Unavailable",reason:"blocked"};const a=[...t].sort((s,l)=>s.start-l.start);for(const s of a)if(s.roomId===e.id&&P(o,n,s.start,s.end))return{status:"Unavailable",reason:"overlap"};return{status:"Available",reason:null}}function G(e,t={}){const o=t.nowLabel??"09:00",n=(t.bookingLabels??["10:00–11:00"]).join(", ");return{invalidRange:"End time must be later than the start time.",past:`Start time cannot be in the past (now is ${o}).`,tooLong:`Bookings can be no longer than ${D} minutes.`,blocked:"This room is currently blocked.",overlap:`That time overlaps with the ${n} booking.`}[e]??"That slot is unavailable."}const i={INVALID_START:"INVALID_START",DURATION_INVALID:"DURATION_INVALID",DURATION_NOT_POSITIVE:"DURATION_NOT_POSITIVE",DURATION_TOO_LONG:"DURATION_TOO_LONG",PAST_START:"PAST_START",BLOCKED:"BLOCKED",OVERLAP:"OVERLAP"},b=(e,t)=>({valid:!1,available:null,reasonCode:e,message:t}),H=(e,t)=>({valid:!0,available:!1,reasonCode:e,message:t}),q=/^\d{1,2}:\d{2}$/,x={INVALID_START:"Start time must be a valid HH:MM time.",DURATION_INVALID:"Duration must be a whole number of minutes.",DURATION_NOT_POSITIVE:"Duration must be greater than zero minutes.",DURATION_TOO_LONG:"Duration must be at most 120 minutes.",PAST_START:"Start time cannot be before the current time (09:00).",BLOCKED:"This room is currently blocked.",OVERLAP:"That time overlaps with the 10:00–11:00 booking.",UNAVAILABLE:"That slot is unavailable."};function f(e){return x[e]??x.UNAVAILABLE}function K({startTime:e,durationMinutes:t,blocked:o},n,r){if(typeof e!="string"||!q.test(e))return b(i.INVALID_START,f(i.INVALID_START));const[a,s]=e.split(":").map(Number);if(a>23||s>59)return b(i.INVALID_START,f(i.INVALID_START));const l=a*60+s;if(typeof t!="number"||!Number.isInteger(t))return b(i.DURATION_INVALID,f(i.DURATION_INVALID));if(t<=0)return b(i.DURATION_NOT_POSITIVE,f(i.DURATION_NOT_POSITIVE));if(t>120)return b(i.DURATION_TOO_LONG,f(i.DURATION_TOO_LONG));if(l<r)return b(i.PAST_START,f(i.PAST_START));const m=6e4,$={id:"B-204",blocked:!!o},U=l*m+t*m,{status:M,reason:V}=w($,n,l*m,U,r*m);if(M==="Unavailable"){const L=V==="blocked"?i.BLOCKED:i.OVERLAP;return H(L,f(L))}return{valid:!0,available:!0,reasonCode:null,message:"Room is available for this time slot.",durationMinutes:t}}const v=140,F=2e3,y=300,j=/^\d{1,2}:\d{2}$/;function X(e={}){if(!e||typeof e!="object")return"input must be an object";if(typeof e.roomLabel!="string"||e.roomLabel.trim()==="")return"roomLabel must be a non-empty string";const t=o=>{if(typeof o!="string"||!j.test(o))return!1;const[n,r]=o.split(":").map(Number);return n>=0&&n<=23&&r>=0&&r<=59};if(!t(e.start))return"start must be a HH:MM time";if(!t(e.end))return"end must be a HH:MM time";if(typeof e.isAvailable!="boolean")return"isAvailable must be a boolean";if(e.reasonCode!=null&&typeof e.reasonCode!="string")return"reasonCode must be a string or null";if(e.userNote!=null){if(typeof e.userNote!="string")return"userNote must be a string";if(e.userNote.length>v)return`userNote must be at most ${v} characters`}return null}function z(e){return e.split(/[.!?]+/).filter(t=>t.trim()!=="").length}function B(e){if(typeof e!="string")return"output must be a string";const t=e.trim();return t.length<1?"output must not be empty":t.length>y?`output must be at most ${y} characters`:z(t)>2?"output must be at most two sentences":null}function W({isAvailable:e,reasonCode:t,ctx:o={}}={}){return`Fallback (explanation unavailable): ${e?"The selected time slot is free to use.":G(t??"unknown",o)}`}function J({roomLabel:e,start:t,end:o,isAvailable:n,reasonCode:r}){return n?`Room ${e} is free from ${t} to ${o} under the current booking rules.`:`Room ${e} is unavailable from ${t} to ${o} because the check returned the reason "${r}".`}function Q(e,t={}){const{mode:o="ok"}=t,n=X(e);if(n)return Promise.reject(new Error(`invalid input: ${n}`));const r=J(e);return new Promise((a,s)=>{const l=setTimeout(()=>s(new Error("explanation timed out")),F);if(o==="timeout")return;if(clearTimeout(l),o==="error"){s(new Error("mock adapter failure"));return}const m=B(r);if(m){s(new Error(`invalid output: ${m}`));return}a({explanation:r})})}function Y(){let e=0;return{next(){return e+=1,e},isCurrent(t){return t===e},invalidate(){e+=1}}}const C="B-204 (Seminar room)",O=540,T=6e4,Z="B-204",E=[{id:"B1",roomId:Z,start:10*60*T,end:11*60*T}],u=e=>{const t=Math.floor(e/60),o=e%60;return`${String(t).padStart(2,"0")}:${String(o).padStart(2,"0")}`},ee=u(O),te=E.map(e=>`${u(e.start/T)}–${u(e.end/T)}`);document.querySelector("#app").innerHTML=`
  <main class="page">
    <header class="hero">
      <h1>Smart Campus Room Availability Checker</h1>
      <p class="sub">Choose a start time and a duration, from 09:00.</p>
    </header>

    <section class="card room-card">
      <div class="room-head">
        <span class="room-icon" aria-hidden="true">📍</span>
        <div>
          <h2 id="roomName">${C}</h2>
          <p class="now">Current time: <strong>${u(O)}</strong></p>
        </div>
      </div>

      <div class="bookings">
        <h3>Existing bookings today</h3>
        <ul id="bookingList"></ul>
      </div>

      <label class="block-toggle">
        <input type="checkbox" id="blocked" />
        <span>Room is blocked</span>
      </label>
    </section>

    <section class="card form-card">
      <h3>Check a time slot</h3>
      <form id="checkForm" novalidate>
        <div class="fields">
          <label class="field">
            <span>Start time</span>
            <input type="time" id="startInput" required />
          </label>
          <label class="field">
            <span>Duration (minutes)</span>
            <input type="number" id="durationInput" min="1" max="120" step="1" required />
          </label>
        </div>
        <button type="submit" id="checkBtn">Check availability</button>
      </form>

      <div id="result" class="result" hidden></div>
      <ul id="errors" class="errors" hidden></ul>

      <div id="explainControls" class="explain-controls" hidden>
        <button type="button" id="explainBtn">Explain availability</button>
        <label class="field">
          <span>Optional note (max 140 characters)</span>
          <input type="text" id="noteInput" maxlength="140" />
        </label>
        <label class="field">
          <span>Simulate failure</span>
          <select id="failMode">
            <option value="ok">None</option>
            <option value="error">Error</option>
            <option value="timeout">Timeout</option>
          </select>
        </label>
      </div>

      <div id="explainBox" class="explain-box" hidden>
        <p class="explain-label">AI-generated explanation (mock) – not a confirmed booking status</p>
        <p id="explainText"></p>
      </div>
    </section>

    <footer class="foot">Times run from 00:00 to 24:00. Endpoint-touching slots do not overlap.</footer>
  </main>
`;document.getElementById("bookingList").innerHTML=E.map(e=>`<li><span>${u(e.start/T)} – ${u(e.end/T)}</span></li>`).join("");const ne=document.getElementById("checkForm"),h=document.getElementById("startInput"),oe=document.getElementById("durationInput"),re=document.getElementById("blocked"),I=document.getElementById("result"),g=document.getElementById("errors"),R=document.getElementById("explainControls"),A=document.getElementById("explainBtn"),ae=document.getElementById("noteInput"),se=document.getElementById("failMode"),d=document.getElementById("explainBox"),N=document.getElementById("explainText"),ie=e=>{g.hidden=!1,g.innerHTML=e.map(t=>`<li>${t}</li>`).join("")},_=(e,t)=>{I.hidden=!1,I.className=`result ${e?"ok":"no"}`,I.innerHTML=`<strong>${e?"Available":"Unavailable"}</strong><p>${t}</p>`},S=e=>{A.disabled=e,A.textContent=e?"Explaining…":"Explain availability"},k=(e,t)=>{N.textContent=W({isAvailable:e,reasonCode:t,ctx:{nowLabel:ee,bookingLabels:te}}),d.className="explain-box fallback",d.hidden=!1};A.addEventListener("click",()=>{if(!c)return;const e=p.next(),t=ae.value;if(t.length>v){if(!p.isCurrent(e))return;N.textContent="Note must be at most 140 characters.",d.className="explain-box fallback",d.hidden=!1;return}S(!0),Q({...c.input,userNote:t},{mode:se.value}).then(({explanation:o})=>{if(!p.isCurrent(e))return;if(B(o)){k(c.isAvailable,c.reasonCode);return}N.textContent=o,d.className="explain-box",d.hidden=!1}).catch(()=>{p.isCurrent(e)&&k(c.isAvailable,c.reasonCode)}).finally(()=>{p.isCurrent(e)&&S(!1)})});let c=null;const p=Y();ne.addEventListener("submit",e=>{e.preventDefault(),p.invalidate(),c=null,d.hidden=!0,R.hidden=!0,g.hidden=!0;const t=oe.value.trim(),o=t===""?NaN:Number(t),n=K({startTime:h.value,durationMinutes:o,blocked:re.checked},E,O);if(!n.valid){ie([n.message]);return}const[r,a]=h.value.split(":").map(Number),s=r*60+a,l=s+n.durationMinutes;if(d.hidden=!0,R.hidden=!1,c={isAvailable:n.available,reasonCode:n.reasonCode,input:{roomLabel:C,start:h.value,end:u(l),isAvailable:n.available,reasonCode:n.reasonCode}},n.available){_(!0,`${u(s)}–${u(l)} is free to use.`);return}_(!1,n.message)});
