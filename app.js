/*
  Delivery Diario (sin backend)
  - Guarda en localStorage
  - Fecha y hora automáticas
  - Clientes persistentes (chips)
  - Filtros por fecha y cliente
  - Exportación CSV
*/

const AMOUNTS = [5000, 7000, 10000, 20000];
const STORAGE_KEY = "delivery_diario_v1";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function nowISO(){
  return new Date().toISOString();
}
function formatGs(n){
  const s = Math.round(Number(n) || 0).toString();
  // thousands with dot
  return "Gs " + s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function formatDateTime(iso){
  const d = new Date(iso);
  const pad = (x) => String(x).padStart(2,"0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toDateInputValue(d){
  const pad = (x) => String(x).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return { entries: [] };
    const obj = JSON.parse(raw);
    if(!obj || !Array.isArray(obj.entries)) return { entries: [] };
    return obj;
  }catch{
    return { entries: [] };
  }
}
function saveData(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function toast(msg){
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("toast--show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> el.classList.remove("toast--show"), 1600);
}

let selectedAmount = null;
let activeClientChip = null;

function renderAmounts(){
  const wrap = $("#amounts");
  wrap.innerHTML = "";
  AMOUNTS.forEach(v=>{
    const b = document.createElement("button");
    b.type = "button";
    b.className = "amount";
    b.innerHTML = `<span>${formatGs(v)}</span>`;
    b.addEventListener("click", ()=>{
      selectedAmount = v;
      $$(".amount").forEach(x=>x.classList.remove("amount--active"));
      b.classList.add("amount--active");
      $("#selected-amount").textContent = `Monto: ${formatGs(v)}`;

      const client = normalizeClientName($("#txt-cliente").value);
      if(client){
        addEntry(loadData(), client, v);
        $("#txt-cliente").value = "";
        $("#selected-amount").textContent = "Seleccioná un monto";
        $$(".amount").forEach(x=>x.classList.remove("amount--active"));
        selectedAmount = null;
        toast("Delivery guardado 🚀");
        refresh();
      }else{
        toast("Escribí nombre/ubicación primero");
      }
    });
    wrap.appendChild(b);
  });
}

function normalizeClientName(s){
  return (s || "").trim().replace(/\s+/g, " ");
}

function getFilters(){
  const from = $("#f-from").value;
  const to = $("#f-to").value;
  const client = normalizeClientName($("#f-client").value).toLowerCase();

  return { from, to, client };
}

function inDateRange(iso, from, to){
  // Compare by local date
  const d = new Date(iso);
  const y = d.getFullYear(), m = d.getMonth()+1, day = d.getDate();
  const as = (x) => {
    if(!x) return null;
    const [yy,mm,dd] = x.split("-").map(Number);
    return yy*10000 + mm*100 + dd;
  };
  const cur = y*10000 + m*100 + day;
  const a = as(from);
  const b = as(to);
  if(a && cur < a) return false;
  if(b && cur > b) return false;
  return true;
}

function getFilteredEntries(data){
  const {from, to, client} = getFilters();
  return data.entries
    .filter(e => inDateRange(e.ts, from, to))
    .filter(e => !client || (e.client || "").toLowerCase().includes(client))
    .sort((a,b)=> (a.ts < b.ts ? 1 : -1));
}

function summarize(entries){
  const corridas = entries.length;
  const subtotal = entries.reduce((acc,e)=> acc + (Number(e.amount)||0), 0);
  return { corridas, subtotal };
}

function renderSummaryAllAndFiltered(data, filtered){
  const all = data.entries;
  $("#sum-corridas").textContent = all.length;
  $("#sum-ganancias").textContent = formatGs(all.reduce((a,e)=>a+(Number(e.amount)||0),0));
  $("#sum-subtotal").textContent = formatGs(filtered.reduce((a,e)=>a+(Number(e.amount)||0),0));
}

function renderTable(data){
  const filtered = getFilteredEntries(data);
  const tbody = $("#tbody");
  tbody.innerHTML = "";

  filtered.forEach(e=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDateTime(e.ts)}</td>
      <td>${escapeHtml(e.client)}</td>
      <td><b>${formatGs(e.amount)}</b></td>
      <td><button class="linkbtn linkbtn--danger" type="button" title="Eliminar">🗑️</button></td>
    `;
    tr.querySelector("button").addEventListener("click", ()=>{
      if(!confirm("¿Eliminar este registro?")) return;
      const idx = data.entries.findIndex(x => x.id === e.id);
      if(idx >= 0){
        data.entries.splice(idx, 1);
        saveData(data);
        refresh();
        toast("Eliminado");
      }
    });
    tbody.appendChild(tr);
  });

  renderSummaryAllAndFiltered(data, filtered);
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderClients(data){
  const wrap = $("#clients");
  wrap.innerHTML = "";

  // Build stats (no filter here: clientes frecuentes global)
  const stats = new Map();
  for(const e of data.entries){
    const k = normalizeClientName(e.client);
    if(!k) continue;
    const cur = stats.get(k) || { count:0, sum:0, last:"" };
    cur.count += 1;
    cur.sum += Number(e.amount)||0;
    if(!cur.last || e.ts > cur.last) cur.last = e.ts;
    stats.set(k, cur);
  }

  // Sort: most recent first
  const items = Array.from(stats.entries())
    .sort((a,b)=> (a[1].last < b[1].last ? 1 : -1));

  if(items.length === 0){
    wrap.innerHTML = `<div class="mini">Todavía no hay clientes guardados. Empezá con el primero 👇</div>`;
    return;
  }

  items.forEach(([name, st])=>{
    const chip = document.createElement("div");
    chip.className = "client";
    chip.innerHTML = `
      <strong title="${escapeHtml(name)}">${escapeHtml(name)}</strong>
      <span class="meta">${st.count} · ${formatGs(st.sum)}</span>
    `;
    chip.addEventListener("click", ()=>{
      $("#txt-cliente").value = name;
      $("#txt-cliente").focus();
      if(activeClientChip) activeClientChip.classList.remove("client--active");
      chip.classList.add("client--active");
      activeClientChip = chip;
    });
    wrap.appendChild(chip);
  });
}

function addEntry(data, client, amount){
  const entry = {
    id: cryptoRandomId(),
    client,
    amount,
    ts: nowISO()
  };
  data.entries.push(entry);
  saveData(data);
}

function cryptoRandomId(){
  // short random id
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  return Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
}

function refresh(){
  const data = loadData();
  renderClients(data);
  renderTable(data);
}

function setQuickFilters(mode){
  const today = new Date();
  if(mode === "hoy"){
    $("#f-from").value = toDateInputValue(today);
    $("#f-to").value = toDateInputValue(today);
  }
  if(mode === "7d"){
    const d = new Date();
    d.setDate(d.getDate() - 6);
    $("#f-from").value = toDateInputValue(d);
    $("#f-to").value = toDateInputValue(today);
  }
}

function exportCSV(data){
  const filtered = getFilteredEntries(data).slice().reverse(); // oldest first
  const lines = [];
  lines.push(["fecha_hora","cliente","monto_gs"].join(","));
  for(const e of filtered){
    const dt = formatDateTime(e.ts);
    const client = (e.client || "").replaceAll('"','""');
    lines.push(`"${dt}","${client}",${Number(e.amount)||0}`);
  }
  const csv = lines.join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `delivery_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function setupPWAInstall(){
  let deferredPrompt = null;
  const btn = $("#btn-install");

  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    btn.hidden = false;
  });

  btn.addEventListener("click", async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.hidden = true;
  });

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  renderAmounts();
  setupPWAInstall();

  const data = loadData();

  // default filters: today
  setQuickFilters("hoy");

  $("#btn-guardar").addEventListener("click", ()=>{
    const client = normalizeClientName($("#txt-cliente").value);
    if(!client){
      toast("Falta el nombre/ubicación.");
      $("#txt-cliente").focus();
      return;
    }
    if(!selectedAmount){
      toast("Elegí un monto.");
      return;
    }
    addEntry(data, client, selectedAmount);
    $("#txt-cliente").value = "";
    if(activeClientChip) activeClientChip.classList.remove("client--active");
    activeClientChip = null;
    toast("Guardado 🚀");
    refresh();
  });

  $("#btn-limpiar").addEventListener("click", ()=>{
    $("#txt-cliente").value = "";
    $("#txt-cliente").focus();
  });

  $("#btn-hoy").addEventListener("click", ()=>{
    setQuickFilters("hoy");
    refresh();
  });
  $("#btn-7d").addEventListener("click", ()=>{
    setQuickFilters("7d");
    refresh();
  });

  $("#btn-borrar-todo").addEventListener("click", ()=>{
    if(!confirm("Esto borra TODO lo guardado en este dispositivo. ¿Seguro?")) return;
    localStorage.removeItem(STORAGE_KEY);
    selectedAmount = null;
    $("#selected-amount").textContent = "Seleccioná un monto";
    $$(".amount").forEach(x=>x.classList.remove("amount--active"));
    $("#f-client").value = "";
    setQuickFilters("hoy");
    toast("Listo. Todo borrado.");
    refresh();
  });

  $("#btn-export").addEventListener("click", ()=>{
    exportCSV(loadData());
  });

  // Refresh on filter changes
  ["change","input"].forEach(evt=>{
    $("#f-from").addEventListener(evt, refresh);
    $("#f-to").addEventListener(evt, refresh);
    $("#f-client").addEventListener(evt, refresh);
  });

  refresh();
});
