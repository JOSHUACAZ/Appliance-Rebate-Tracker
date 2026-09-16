const APP_BUILD_VERSION = '2026.09.16.1';

async function checkForSiteUpdate() {
  try {
    const response = await fetch(`site-version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const remote = await response.json();
    if (remote.version && remote.version !== APP_BUILD_VERSION) {
      const url = new URL(window.location.href);
      url.searchParams.set('build', remote.version);
      window.location.replace(url.toString());
    }
  } catch (err) {
    // Stay usable offline or during a transient network failure.
  }
}

checkForSiteUpdate();
window.addEventListener('focus', checkForSiteUpdate);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForSiteUpdate(); });
setInterval(checkForSiteUpdate, 5 * 60 * 1000);

const rebateData = window.REBATE_DATA;
const money = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);
const norm = s => s.toUpperCase().replace(/[^A-Z0-9]/g,'');
const $ = id => document.getElementById(id);
const modelsInput = $('modelsInput');
let lastResults = {};
let lastActivePrograms = [];
let autocompleteItems = [];
let autocompleteIndex = -1;

function trackEvent(name, params={}){
  if(typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

function analyticsSnapshot(){
  const models=parseModels();
  const results=lastResults||{};
  const paid=Object.values(results).filter(r=>Number(r?.amount||0)>0);
  const total=Object.values(results).reduce((sum,r)=>sum+Number(r?.amount||0),0);
  return {
    package_size: models.length,
    qualifying_rebate_count: paid.length,
    total_rebate_amount: total
  };
}

$('calculateBtn').onclick = calculate;
$('clearBtn').onclick = () => {
  modelsInput.value='';
  localStorage.removeItem('applianceRebateModels');
  render([]);
};
$('printBtn').onclick = () => { trackEvent('print_results', analyticsSnapshot()); window.print(); };
$('printFormsBtn').onclick = printEligibleForms;
modelsInput.addEventListener('input',()=>{$('modelCount').textContent=parseModels().length+' models entered';updateAutocomplete();});
modelsInput.addEventListener('keydown',handleAutocompleteKeydown);
modelsInput.addEventListener('click',updateAutocomplete);
modelsInput.addEventListener('keyup',e=>{if(!['ArrowUp','ArrowDown','Enter','Escape'].includes(e.key))updateAutocomplete();});
document.addEventListener('click',e=>{if(!e.target.closest('.model-entry-wrap'))hideAutocomplete();});

function currentTokenInfo(){
  const value=modelsInput.value, caret=modelsInput.selectionStart ?? value.length;
  let start=caret,end=caret;
  while(start>0&&!/[\s,;]/.test(value[start-1]))start--;
  while(end<value.length&&!/[\s,;]/.test(value[end]))end++;
  return {raw:value.slice(start,caret),normalized:norm(value.slice(start,caret)),start,end,caret};
}

function autocompleteUniverse(){
  const programs=activePrograms(),map=new Map();
  for(const p of programs){
    for(const x of p.models||[]){
      if(!map.has(x.model)) map.set(x.model,{model:x.model,categories:new Set(),programs:new Set()});
      const item=map.get(x.model);
      if(x.category) item.categories.add(x.category);
      item.programs.add(shortName(p));
    }
  }
  return [...map.values()].map(x=>({...x,categories:[...x.categories],programs:[...x.programs]}));
}

function updateAutocomplete(){
  const token=currentTokenInfo();
  if(token.normalized.length<2){hideAutocomplete();return;}
  const entered=new Set(parseModels());
  entered.delete(token.normalized);
  const universe=autocompleteUniverse();
  let matches=universe.filter(x=>x.model.startsWith(token.normalized)&&!entered.has(x.model));
  if(matches.length<8){
    matches=matches.concat(universe.filter(x=>!x.model.startsWith(token.normalized)&&x.model.includes(token.normalized)&&!entered.has(x.model)&&!matches.some(m=>m.model===x.model)));
  }
  autocompleteItems=matches.slice(0,8);
  autocompleteIndex=autocompleteItems.length?0:-1;
  renderAutocomplete();
}

function renderAutocomplete(){
  const box=$('autocompleteBox');
  if(!autocompleteItems.length){
    box.classList.remove('hidden');
    box.innerHTML='<div class="autocomplete-empty">No matching eligible models</div>';
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML=autocompleteItems.map((x,i)=>`<button type="button" class="autocomplete-item ${i===autocompleteIndex?'active':''}" data-index="${i}" role="option" aria-selected="${i===autocompleteIndex}"><span class="autocomplete-model">${x.model}</span><span class="autocomplete-meta">${x.categories.slice(0,2).join(' / ')} · ${x.programs.slice(0,2).join(' + ')}${x.programs.length>2?' + more':''}</span></button>`).join('');
  box.querySelectorAll('.autocomplete-item').forEach(b=>{b.onmousedown=e=>{e.preventDefault();chooseAutocomplete(Number(b.dataset.index));};});
}

function hideAutocomplete(){
  autocompleteItems=[];
  autocompleteIndex=-1;
  $('autocompleteBox').classList.add('hidden');
  $('autocompleteBox').innerHTML='';
}

function chooseAutocomplete(i){
  const item=autocompleteItems[i];
  if(!item)return;
  const t=currentTokenInfo(),v=modelsInput.value;
  let before=v.slice(0,t.start),after=v.slice(t.end);
  if(after&&!/^[\s,;]/.test(after)) after='\n'+after;
  const needsNewline=after.length===0;
  modelsInput.value=before+item.model+(needsNewline?'\n':'')+after;
  const pos=(before+item.model+(needsNewline?'\n':'')).length;
  modelsInput.setSelectionRange(pos,pos);
  modelsInput.focus();
  $('modelCount').textContent=parseModels().length+' models entered';
  hideAutocomplete();
}

function handleAutocompleteKeydown(e){
  const box=$('autocompleteBox');
  if(box.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){
    e.preventDefault();
    if(autocompleteItems.length){autocompleteIndex=(autocompleteIndex+1)%autocompleteItems.length;renderAutocomplete();}
  }else if(e.key==='ArrowUp'){
    e.preventDefault();
    if(autocompleteItems.length){autocompleteIndex=(autocompleteIndex-1+autocompleteItems.length)%autocompleteItems.length;renderAutocomplete();}
  }else if(e.key==='Enter'&&autocompleteItems.length){
    e.preventDefault();
    chooseAutocomplete(Math.max(0,autocompleteIndex));
  }else if(e.key==='Escape'){
    e.preventDefault();
    hideAutocomplete();
  }
}

function todayLocalISO(){
  // Optional private test helper: append ?date=2026-08-27 to preview a scheduled date.
  const q=new URLSearchParams(location.search).get('date');
  if(q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function isActive(p,date=todayLocalISO()){
  return (!p.startDate || date>=p.startDate) && (!p.endDate || date<=p.endDate);
}
function activePrograms(){return rebateData.programs.filter(p=>isActive(p));}
function scheduledPrograms(){const d=todayLocalISO(); return rebateData.programs.filter(p=>p.startDate && p.startDate>d);}
function parseModels(){return modelsInput.value.split(/[\s,;]+/).map(norm).filter(Boolean)}
function lookup(program,model){return program.models.find(x=>x.model===model)}
function categoryIncludes(cat,words){return words.some(w=>cat.toLowerCase().includes(w.toLowerCase()))}

function calcCafe(models,p){
  let matches=models.map(m=>lookup(p,m));
  let counts=matches.map(Boolean);
  let restrictedUsed=false;
  matches.forEach((x,i)=>{
    if(!x)return;
    const restricted=categoryIncludes(x.category,p.rules.restrictedGroupKeywords||p.rules.singleCountCategoryKeywords||[]);
    if(restricted){
      if(restrictedUsed) counts[i]=false;
      else restrictedUsed=true;
    }
  });
  let dishIdx=[];
  matches.forEach((x,i)=>{if(x&&x.category.toLowerCase().includes('dishwasher')&&counts[i])dishIdx.push(i)});
  dishIdx.slice(p.rules.dishwasherCap||2).forEach(i=>counts[i]=false);
  let count=counts.filter(Boolean).length;
  let base=p.tiers[String(Math.min(count,p.rules.maxBaseCount))]||0;
  if(count===2 && matches.some((x,i)=>x&&counts[i]&&x.category.toLowerCase().includes('dishwasher')) && p.rules.twoPieceDishwasherExclusion) base=0;
  let countedCats=matches.filter((x,i)=>x&&counts[i]).map(x=>x.category.toLowerCase());
  let wall=countedCats.some(c=>c.includes('wall oven'));
  let cook=countedCats.some(c=>c.includes('cooktop'));
  let range=countedCats.some(c=>c.includes('commercial-style range'));
  let bonus=(wall&&cook?p.rules.wallOvenCooktopBonus:0)+(range?p.rules.commercialStyleRangeBonus:0);
  return {count,amount:base+bonus,base,bonus,matches,counts,status:base+bonus?'Eligible':'Not eligible',extra:[wall&&cook?'Wall oven + cooktop bonus applied':null,range?'Commercial-style range bonus applied':null].filter(Boolean)};
}

function calcProfile(models,p){
  let matches=models.map(m=>lookup(p,m));
  let counts=matches.map(Boolean),seen={};
  matches.forEach((x,i)=>{
    if(!x)return;
    let limited=categoryIncludes(x.category,p.rules.singleCountCategoryKeywords||[]);
    if(limited){
      let key=categoryIncludes(x.category,['Microwave'])?'Microwave':'Ventilation';
      if(seen[key])counts[i]=false;
      seen[key]=true;
    }
  });
  let count=counts.filter(Boolean).length;
  let amount=p.tiers[String(Math.min(count,p.rules.maxBaseCount))]||0;
  return {count,amount,matches,counts,status:amount?'Eligible':'Not eligible',extra:[]};
}

function calcCommercial(models,p){
  let matches=models.map(m=>lookup(p,m));
  let ok=models.includes(p.rules.washer)&&p.rules.dryers.some(d=>models.includes(d));
  return {count:ok?2:matches.filter(Boolean).length,amount:ok?p.rules.payout:0,matches,counts:matches.map(Boolean),status:ok?'Eligible':'Needs qualifying pair',extra:[]};
}


function calcLaundryPair(models,p){
  let matches=models.map(m=>lookup(p,m));
  const hasCombo=(p.rules.combos||[]).some(m=>models.includes(m));
  const hasWasher=(p.rules.washers||[]).some(m=>models.includes(m));
  const hasDryer=(p.rules.dryers||[]).some(m=>models.includes(m));
  const ok=hasCombo || (hasWasher && hasDryer);
  const counts=matches.map(x=>Boolean(x));
  return {count:ok?2:matches.filter(Boolean).length,amount:ok?Number(p.rules.payout||0):0,matches,counts,status:ok?'Eligible':'Needs qualifying washer + dryer',extra:hasCombo?['Qualifying combo counts as two appliances']:[]};
}

function calcMonogram(models,p){
  let matches=models.map(m=>lookup(p,m)),count=matches.filter(Boolean).length;
  return {count,amount:count?p.rules.payout:0,matches,counts:matches.map(Boolean),status:count?'Eligible':'Not eligible',extra:[]};
}

function calcTieredCategory(models,p){
  let matches=models.map(m=>lookup(p,m));
  let counts=matches.map(()=>false);
  let seen=new Set();
  let count=0;
  matches.forEach((x,i)=>{
    if(!x)return;
    if(seen.has(x.category)) return;
    seen.add(x.category);
    counts[i]=true;
    count += Number(x.countValue||1);
  });
  let capped=Math.min(count,p.rules.maxBaseCount||count);
  let amount=p.tiers[String(capped)]||0;
  return {count,amount,matches,counts,status:amount?'Eligible':'Not eligible',extra:matches.some((x,i)=>x&&counts[i]&&Number(x.countValue||1)>1)?['All-In-One counted as two appliances']:[]};
}

function calculateProgram(models,p){
  if(p.id==='cafe') return calcCafe(models,p);
  if(p.id==='profile') return calcProfile(models,p);
  if(p.id==='commercial') return calcCommercial(models,p);
  if(p.id==='monogram') return calcMonogram(models,p);
  if(p.id==='profile-laundry-pair-2026') return calcLaundryPair(models,p);
  if(p.rules && p.rules.limitPerCategory) return calcTieredCategory(models,p);
  return calcProfile(models,p);
}

function calculate(){
  let models=parseModels();
  localStorage.setItem('applianceRebateModels',models.join('\n'));
  render(models);
  const snapshot=analyticsSnapshot();
  trackEvent('check_rebates', snapshot);
  Object.entries(lastResults).forEach(([programId,result])=>{
    if(Number(result?.amount||0)>0) trackEvent('rebate_qualified',{rebate_program:programId, rebate_amount:Number(result.amount||0), package_size:models.length});
  });
}

function render(models){
  if(!rebateData)return;
  const programs=activePrograms();
  lastActivePrograms=programs;
  let results={};
  programs.forEach(p=>results[p.id]=calculateProgram(models,p));
  lastResults=results;
  let total=Object.values(results).reduce((s,r)=>s+r.amount,0);
  $('totalSavings').textContent=money(total);
  $('modelCount').textContent=models.length+' models entered';
  $('asOfDate').textContent='Active rebates as of '+new Date(todayLocalISO()+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const printable=programs.filter(p=>results[p.id]?.amount>0 && p.pdf);
  $('printFormsBtn').disabled=printable.length===0;
  $('printFormsBtn').textContent=printable.length?`Print Eligible Rebate Forms (${printable.length})`:'Print Eligible Rebate Forms';

  $('summaryCards').innerHTML=programs.map(p=>{
    let r=results[p.id];
    return `<article class="summary-card" style="--accent:${p.color}">
      <div class="top"><div><h4>${p.name}</h4><span class="sub">${p.validDates}</span></div><div class="amount">${money(r.amount)}</div></div>
      <div class="metrics"><div class="metric"><strong>${r.count}</strong><span>ELIGIBLE / COUNTED</span></div><div class="metric"><strong>${r.status}</strong><span>STATUS</span></div></div>
      ${r.amount>0&&p.pdf?`<a class="form-link" href="${p.pdf}" target="_blank" rel="noopener">View official rebate form</a>`:''}
      ${r.extra.length?`<div class="pill yes">${r.extra.join(' • ')}</div>`:''}
      <ul>${p.notes.map(n=>`<li>${n}</li>`).join('')}</ul>
    </article>`;
  }).join('') || '<div class="unknown"><strong>No rebate programs are active today.</strong></div>';

  let allKnown=new Set(programs.flatMap(p=>p.models.map(x=>x.model)));
  let unknown=[...new Set(models.filter(m=>!allKnown.has(m)))];
  let ub=$('unknownBox');
  if(unknown.length){ub.classList.remove('hidden');ub.innerHTML=`<strong>Not found in any active rebate:</strong><br>${unknown.join(', ')}`}else ub.classList.add('hidden');

  const head=$('detailHead');
  head.innerHTML='<tr><th>Model</th>'+programs.map(p=>`<th>${shortName(p)}</th>`).join('')+'</tr>';
  if(!models.length){$('detailBody').innerHTML=`<tr><td colspan="${programs.length+1}" class="empty">Enter models to begin.</td></tr>`;return}
  $('detailBody').innerHTML=models.map((m,i)=>{
    let cells=programs.map(p=>{
      let r=results[p.id],x=r.matches[i];
      if(!x)return '<td><span class="pill no">Not listed</span></td>';
      let counted=r.counts[i];
      let msg=p.id==='commercial'&&r.amount===0?'Listed; pair incomplete':counted?(x.countValue>1?`Eligible / counts as ${x.countValue}`:'Eligible / counted'):'Eligible / count limited';
      return `<td><span class="pill ${counted?'yes':'limited'}">${msg}</span><span class="sub">${x.category}</span></td>`;
    });
    return `<tr><td class="model">${m}</td>${cells.join('')}</tr>`;
  }).join('');
}

function shortName(p){
  if(p.id==='cafe')return 'Café';
  if(p.id==='profile')return 'Profile';
  if(p.id==='commercial')return 'Commercial Laundry';
  if(p.id==='monogram')return 'Monogram D&I';
  if(p.id==='labor-day-2026')return 'Labor Day';
  if(p.id==='profile-laundry-pair-2026')return 'Laundry Pair';
  return p.name;
}

async function printEligibleForms(){
  const eligible=lastActivePrograms.filter(p=>lastResults[p.id]?.amount>0 && p.pdf);
  if(!eligible.length) return;
  trackEvent('print_eligible_rebate_forms',{...analyticsSnapshot(), forms_count:eligible.length});
  const popup=window.open('','_blank');
  if(!popup){alert('Please allow pop-ups for this site so the eligible rebate packet can open.');return;}
  popup.document.write('<!doctype html><title>Preparing rebate forms...</title><style>body{font-family:Arial;padding:32px;color:#233} .box{max-width:620px;margin:auto} progress{width:100%}</style><div class="box"><h2>Preparing eligible rebate forms…</h2><p>Combining '+eligible.length+' official rebate form(s) into one PDF packet.</p><progress></progress></div>');
  try{
    if(!window.PDFLib) throw new Error('PDF library did not load.');
    const merged=await PDFLib.PDFDocument.create();
    for(const p of eligible){
      const res=await fetch(p.pdf,{cache:'no-store'});
      if(!res.ok) throw new Error(`Could not load ${p.name} form.`);
      const bytes=await res.arrayBuffer();
      const src=await PDFLib.PDFDocument.load(bytes);
      const pages=await merged.copyPages(src,src.getPageIndices());
      pages.forEach(pg=>merged.addPage(pg));
    }
    const bytes=await merged.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    const url=URL.createObjectURL(blob);
    popup.location.href=url;
    // The browser PDF viewer opens the packet; its print control prints only these qualifying forms.
    setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch(err){
    popup.document.body.innerHTML='<div class="box"><h2>Could not build the rebate packet</h2><p>'+String(err.message||err)+'</p><p>You can still open each eligible form from the rebate cards.</p></div>';
  }
}

if(!rebateData){
  $('summaryCards').innerHTML='<div class="unknown"><strong>Rebate data failed to load.</strong> Confirm rebate-data.js is uploaded beside index.html.</div>';
}else{
  render([]);
  const saved=localStorage.getItem('applianceRebateModels');
  if(saved){modelsInput.value=saved;calculate();}
}
