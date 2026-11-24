/* tankhah.js — منطق بخش «تسویه تنخواه ماموریت»: ماموریت‌ها، هزینه‌ها، چاپ فرم تسویه */
//#XLSX-START

//#XLSX-END

/* ---------- برنامه ---------- */
const CATS=['هزینه غذا','هزینه مواد غذایی','هزینه اسکان','هزینه کرایه','هزینه مواد مصرفی','سایر هزینه‌ها'];
const isCons=c=>String(c||'').trim()===CATS[4];
const NOINV='هزینه‌های بدون فاکتور';
const ORDER=[NOINV,...CATS.slice(0,5),CATS[5]];
const ordIdx=c=>{const i=ORDER.indexOf(String(c||'').trim());return i<0?ORDER.length-1.5:i};
const KEY='tankhah_app_v1';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const toEn=s=>String(s??'').replace(/[۰-۹]/g,c=>c.charCodeAt(0)-1776).replace(/[٠-٩]/g,c=>c.charCodeAt(0)-1632);
const num=s=>{const n=parseFloat(toEn(s).replace(/[,٬،\s]/g,''));return isNaN(n)?0:n};
const fmtP=n=>(Number(n)||0).toLocaleString('fa-IR');
const fmtE=n=>(Number(n)||0).toLocaleString('en-US');
const pad=n=>String(n).padStart(2,'0');
function todayJ(){const d=new Date();const j=g2j(d.getFullYear(),d.getMonth()+1,d.getDate());return j[0]+'/'+pad(j[1])+'/'+pad(j[2])}
function serialToJ(n){const d=new Date(Date.UTC(1899,11,30)+Math.round(n)*86400000);const j=g2j(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());return j[0]+'/'+pad(j[1])+'/'+pad(j[2])}
const normDate=v=>typeof v==='number'?(v>20000?serialToJ(v):String(v)):toEn(v).trim();

function blank(){return{settings:{unit:'ریال',sig1:'',sig2:'',sig3:'',perCol:45,perNo:30},missions:[],cur:null,next:1,nextE:1}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.missions){const b=blank();s.settings=Object.assign(b.settings,s.settings||{});return s}}catch(e){}return blank()}
let S=load();
function migrate(){S.missions.forEach(m=>{if(m.carry==null)m.carry=0;m.noinv=m.noinv||[];if(!m.trips){m.trips=[{id:S.nextE++,place:m.place||'',from:m.from||todayJ(),to:m.to||todayJ()}];delete m.place;delete m.from;delete m.to}m.staff=m.staff||[];m.guests=m.guests||[]})}
migrate();
/* شماره روز شمسی (برای اختلاف تاریخ‌ها) و جمع روزهای ماموریت (اجتماع بازه‌ها؛ روزهای هم‌پوشان یک‌بار شمرده می‌شوند) */
function jdn(str){const p=toEn(String(str||'')).split(/[^0-9]+/).filter(Boolean).map(Number);if(p.length<3||p[1]<1||p[1]>12||p[2]<1||p[2]>31||p[0]<1300)return null;const y=p[0]+1595;return 365*y+Math.floor(y/33)*8+Math.floor(((y%33)+3)/4)+p[2]+(p[1]<7?(p[1]-1)*31:(p[1]-7)*30+186)}
function tripDays(m){const iv=m.trips.map(t=>[jdn(t.from),jdn(t.to)]).filter(x=>x[0]!=null&&x[1]!=null&&x[1]>=x[0]).sort((a,b)=>a[0]-b[0]);let tot=0,end=-1e9;iv.forEach(([a,b])=>{if(b<=end)return;tot+=b-Math.max(a,end+1)+1;end=b});return tot}
function rangeOf(m){const f=m.trips.map(x=>x.from).filter(Boolean).sort(),t=m.trips.map(x=>x.to).filter(Boolean).sort();return (f[0]||'؟')+' تا '+(t[t.length-1]||'؟')}
const newTrip=(o={})=>Object.assign({id:S.nextE++,place:'',from:todayJ(),to:todayJ()},o);
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const cur=()=>S.missions.find(m=>m.id===S.cur)||null;
const noTot=m=>(m.noinv||[]).reduce((a,e)=>a+(Number(e.amount)||0),0);
const total=m=>m.expenses.reduce((a,e)=>a+(Number(e.amount)||0),0)+noTot(m);
function catSummary(m){
  const arr=[];m.expenses.forEach(e=>{const c=(e.cat||'نامشخص').trim()||'نامشخص';const f=arr.find(x=>x[0]===c);if(f)f[1]+=Number(e.amount)||0;else arr.push([c,Number(e.amount)||0])});
  if(m.noinv.length){const f=arr.find(x=>x[0]===NOINV);if(f)f[1]+=noTot(m);else arr.unshift([NOINV,noTot(m)])}
  if(m.sortedCat)arr.sort((a,b)=>ordIdx(a[0])-ordIdx(b[0]));
  const o={};arr.forEach(([k,v])=>o[k]=v);return o;
}
const avail=m=>(Number(m.carry)||0)+(Number(m.advance)||0);
const balance=m=>avail(m)-total(m);
function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast._t);toast._t=setTimeout(()=>e.style.display='none',2800)}

function newMission(o={}){
  const prev=S.missions[S.missions.length-1];
  const m=Object.assign({id:S.next++,title:'ماموریت جدید',carry:prev?balance(prev):0,advance:0,note:'',trips:[newTrip()],staff:[],guests:[],noinv:[],expenses:[]},o);
  S.missions.push(m);return m;
}
function newExp(m,o={}){
  const last=m.expenses[m.expenses.length-1];
  const e=Object.assign({id:S.nextE++,cat:'',desc:'',amount:0},o);
  m.expenses.push(e);return e;
}

function renderCats(){
  const all=new Set(CATS);S.missions.forEach(m=>m.expenses.forEach(e=>e.cat&&all.add(e.cat)));
  $('cats').innerHTML=[...all].map(c=>`<option value="${esc(c)}">`).join('');
}
function renderSide(){
  $('mlist').innerHTML=S.missions.map(m=>`<div class="mi ${m.id===S.cur?'act':''}" data-m="${m.id}"><b>${esc(m.title||'(بدون عنوان)')}</b><small>${esc(rangeOf(m))}<br>جمع هزینه: ${fmtP(total(m))}</small></div>`).join('')||'<div class="empty" style="padding:14px">هنوز ماموریتی ثبت نشده</div>';
}
function renderMain(){
  const m=cur(),main=$('main');
  if(!m){main.innerHTML='<div class="card empty">برای شروع یک ماموریت جدید بسازید.<br><br><button class="pri" data-act="newm">+ ماموریت جدید</button></div>';return}
  const u=esc(S.settings.unit);
  main.innerHTML=`
  <div class="lay2">
  <div class="stackcol">
  <section class="card"><h3>هزینه‌ها (${u})</h3>
   <div class="wrap"><table class="ex"><thead><tr><th>#</th><th>دسته هزینه</th><th>مبلغ</th><th>درج</th><th></th></tr></thead><tbody>
   ${m.noinv.length?`<tr class="sumrow"><td class="idx">1</td><td style="padding:8px">${NOINV}</td><td style="padding:8px;font-weight:bold;direction:ltr;text-align:left" id="noFootAmt"></td><td></td><td></td></tr>`:''}
   ${m.expenses.map((e,i)=>`<tr data-id="${e.id}"><td class="idx">${i+1+(m.noinv.length?1:0)}</td>
    <td><input data-ef="cat" list="cats" value="${esc(e.cat)}" placeholder="دسته"></td>
    <td><input data-ef="amount" inputmode="numeric" value="${e.amount?fmtE(e.amount):''}"></td>
    <td class="ins"><button class="x" data-ins="above" data-id="${e.id}" title="افزودن ردیف خالی بالای این ردیف">+↑</button><button class="x" data-ins="below" data-id="${e.id}" title="افزودن ردیف خالی پایین این ردیف">+↓</button></td>
    <td class="del"><button class="x" data-del="${e.id}" title="حذف ردیف"><i class="ic ic-x"></i></button></td></tr>`).join('')}
   </tbody></table></div>
   <div class="row"><button class="pri" data-act="adde">+ ردیف هزینه جدید</button><button data-act="sortcat"><i class="ic ic-sort"></i> مرتب‌سازی بر اساس دسته</button><button data-act="undosort" ${m.undoSort?'':'disabled'}>↶ برگشت مرتب‌سازی</button><small style="color:var(--mut);align-self:center">در ستون مبلغ، کلید Enter ردیف جدید می‌سازد.</small></div>
  </section>
  <section class="card"><h3>${NOINV} (${u})</h3>
   <small style="color:var(--mut)">این بخش در یک فرم جداگانه با امضای سه مدیر چاپ می‌شود و جمع آن خودکار در فرم اصلی به هزینه‌ها اضافه می‌شود.</small>
   <div class="wrap" style="margin-top:8px"><table class="tr noinv"><thead><tr><th style="width:34px">#</th><th>عنوان هزینه</th><th style="width:110px">تاریخ</th><th style="width:130px">مبلغ</th><th></th></tr></thead><tbody>
   ${m.noinv.map((x,i)=>`<tr data-list="noinv" data-rid="${x.id}"><td style="text-align:center;color:var(--mut)">${i+1}</td><td data-l="عنوان هزینه"><input data-lf="title" value="${esc(x.title)}"></td><td data-l="تاریخ"><input data-lf="date" value="${esc(x.date)}"></td><td data-l="مبلغ"><input data-lf="amount" inputmode="numeric" value="${x.amount?fmtE(x.amount):''}"></td><td class="del"><button class="x" data-ldel="1" title="حذف"><i class="ic ic-x"></i></button></td></tr>`).join('')}
   </tbody><tfoot><tr><td colspan="3" style="padding:8px"><b>جمع ${NOINV}</b></td><td style="padding:8px;font-weight:bold;direction:ltr;text-align:left" id="noTot"></td><td></td></tr></tfoot></table></div>
   <div class="row"><button class="pri" data-ladd="noinv">+ ردیف جدید</button></div>
  </section>
  </div>
  <div class="stackcol">
  <section class="card"><h3>مشخصات ماموریت</h3>
   <div class="grid">
    <label class="f">عنوان ماموریت<input data-mf="title" value="${esc(m.title)}"></label>
    <label class="f">مانده تنخواه ماموریت قبل (${u})<input data-mf="carry" inputmode="numeric" value="${m.carry?fmtE(m.carry):''}" dir="ltr" style="text-align:right"></label>
    <div><button data-act="getcarry" style="width:100%" title="مانده ماموریت قبلی در لیست را دوباره محاسبه و جایگزین می‌کند"><i class="ic ic-refresh"></i> دریافت مانده از ماموریت قبل</button></div>
    <label class="f">تنخواه جدید واریزشده (${u})<input data-mf="advance" inputmode="numeric" value="${m.advance?fmtE(m.advance):''}" dir="ltr" style="text-align:right"></label>
    <div class="res ok" style="margin:0">جمع تنخواه در اختیار: <span id="availTxt"></span> ${u}</div>
    <label class="f">توضیحات<input data-mf="note" value="${esc(m.note)}"></label>
   </div>
   <div class="row"><button class="danger" data-act="delm"><i class="ic ic-trash"></i> حذف این ماموریت</button></div>
  </section>
  <section class="card"><h3>محل و تاریخ ماموریت‌ها</h3>
   <small style="color:var(--mut)">اگر در این دوره چند سفر به مکان‌ها و تاریخ‌های مختلف داشتید، برای هر کدام یک ردیف اضافه کنید.</small>
   <div class="wrap" style="margin-top:8px"><table class="tr trips"><thead><tr><th>محل ماموریت</th><th style="width:92px">از تاریخ</th><th style="width:92px">تا تاریخ</th><th></th></tr></thead><tbody>
   ${m.trips.map(x=>`<tr data-list="trips" data-rid="${x.id}"><td data-l="محل ماموریت"><input data-lf="place" value="${esc(x.place)}"></td><td data-l="از تاریخ"><input data-lf="from" value="${esc(x.from)}"></td><td data-l="تا تاریخ"><input data-lf="to" value="${esc(x.to)}"></td><td class="del"><button class="x" data-ldel="1" title="حذف"><i class="ic ic-x"></i></button></td></tr>`).join('')}
   </tbody></table></div>
   <div class="res ok" style="margin-top:8px">جمع روزهای ماموریت: <span id="tripDays">${fmtP(tripDays(m))}</span> روز</div>
   <div class="row"><button class="pri" data-ladd="trips">+ محل / بازه جدید</button></div>
  </section>
  <section class="card"><h3>نفرات</h3><div class="stack">
   ${[['staff','نفرات ماموریت'],['guests','مهمان مشتری']].map(([k,t])=>`<div><b>${t} (${fmtP(m[k].length)} نفر)</b><div style="margin-top:8px">${m[k].map(x=>`<div class="li" data-list="${k}" data-rid="${x.id}"><input data-lf="name" placeholder="نام و نام خانوادگی" value="${esc(x.name)}"><button class="x" data-ldel="1" title="حذف"><i class="ic ic-x"></i></button></div>`).join('')}</div><button data-ladd="${k}">+ افزودن</button></div>`).join('')}
  </div></section>
  </div>
  </div>
  <section class="card"><h3>خلاصه و تسویه</h3><div class="sumgrid"><div id="sumCat"></div><div id="sumRes"></div></div>
   <div class="row"><button data-act="topersonal"><i class="ic ic-wallet"></i> درج نتیجه تسویه در دخل و خرج شخصی</button></div>
   <small style="color:var(--mut)">اختیاری: اگر هزینه‌ها از تنخواه بیشتر شده و شرکت به شما بدهکار است، همان مبلغ به‌عنوان درآمد «بازپرداخت تنخواه» در بخش شخصی ثبت می‌شود. این دو بخش به‌طور پیش‌فرض کاملاً مستقل‌اند.</small></section>`;
  updateSummary();
}
function updateSummary(){
  const m=cur();if(!m||!$('sumCat'))return;
  const by=catSummary(m);
  const t=total(m),d=balance(m),u=esc(S.settings.unit);
  if($('tripDays'))$('tripDays').textContent=fmtP(tripDays(m));
  if($('noTot'))$('noTot').textContent=fmtE(noTot(m));if($('noFootAmt'))$('noFootAmt').textContent=fmtE(noTot(m));
  if($('availTxt'))$('availTxt').textContent=fmtP(avail(m));
  $('sumCat').innerHTML='<table class="sm">'+Object.keys(by).map(k=>`<tr><td>${esc(k)}</td><td>${fmtP(by[k])}</td></tr>`).join('')+`<tr><td><b>جمع کل هزینه‌ها</b></td><td>${fmtP(t)}</td></tr></table>`;
  $('sumRes').innerHTML=`<table class="sm"><tr><td>مانده تنخواه ماموریت قبل</td><td>${fmtP(m.carry)}</td></tr><tr><td>تنخواه جدید</td><td>${fmtP(m.advance)}</td></tr><tr><td><b>جمع تنخواه در اختیار</b></td><td>${fmtP(avail(m))}</td></tr><tr><td>جمع هزینه‌ها</td><td>${fmtP(t)}</td></tr></table>
   <div class="res ${d>=0?'ok':'bad'}">${d>=0?'مانده تنخواه (قابل بازگشت به شرکت)':'مازاد هزینه (قابل پرداخت به تنخواه‌دار)'}: ${fmtP(Math.abs(d))} ${u}</div>`;
}
function renderAll(){renderCats();renderSide();renderMain()}

/* رویدادها */
$('mlist').addEventListener('click',e=>{const it=e.target.closest('[data-m]');if(it){S.cur=+it.dataset.m;save();renderAll()}});
$('btnNew').onclick=()=>{const m=newMission();S.cur=m.id;save();renderAll()};
const main=$('main');
main.addEventListener('input',e=>{
  const t=e.target,m=cur();if(!m)return;
  const L=t.closest('[data-list]');
  if(L&&t.dataset.lf){const it=m[L.dataset.list].find(x=>x.id==L.dataset.rid);if(it){const f=t.dataset.lf;it[f]=(f==='from'||f==='to'||f==='date')?toEn(t.value):(f==='amount'?num(t.value):t.value)}save();renderSide();updateSummary();return}
  if(t.dataset.mf){const f=t.dataset.mf;m[f]=(f==='advance'||f==='carry')?num(t.value):t.value;if(f==='title')renderSide()}
  else if(t.dataset.ef){const row=t.closest('tr'),ex=m.expenses.find(x=>x.id==row.dataset.id);if(ex){const f=t.dataset.ef;ex[f]=f==='amount'?num(t.value):t.value;}renderSide()}
  save();updateSummary();
});
main.addEventListener('focusout',e=>{
  const t=e.target;
  if(t.dataset.ef==='amount'||t.dataset.lf==='amount'||t.dataset.mf==='advance'||t.dataset.mf==='carry'){const n=num(t.value);t.value=n?fmtE(n):''}
  if(t.dataset.lf==='from'||t.dataset.lf==='to'||t.dataset.lf==='date'){t.value=toEn(t.value)}
});
main.addEventListener('click',e=>{
  const m=cur();
  const la=e.target.closest('[data-ladd]');
  if(la&&m){const k=la.dataset.ladd;m[k].push(k==='trips'?newTrip({from:(m.trips.length?m.trips[m.trips.length-1].to:todayJ())}):k==='noinv'?{id:S.nextE++,title:'',date:todayJ(),amount:0}:{id:S.nextE++,name:''});save();renderAll();const rs=document.querySelectorAll('[data-list="'+k+'"]');const lr=rs[rs.length-1];if(lr)lr.querySelector('input').focus();return}
  const ld=e.target.closest('[data-ldel]');
  if(ld&&m){const r=ld.closest('[data-list]');const k=r.dataset.list;m[k]=m[k].filter(x=>x.id!=r.dataset.rid);if(k==='trips'&&!m.trips.length)m.trips.push(newTrip());save();renderAll();return}
  const a=e.target.closest('[data-act]');
  if(a){
    if(a.dataset.act==='topersonal'&&m)postPersonal(m);
    if(a.dataset.act==='newm'){const n=newMission();S.cur=n.id;save();renderAll()}
    if(a.dataset.act==='adde'&&m){addRow(m)}
    if(a.dataset.act==='sortcat'&&m){m.undoSort={ids:m.expenses.map(x=>x.id),sorted:!!m.sortedCat};m.sortedCat=true;m.expenses=m.expenses.map((x,i)=>({x,i})).sort((a,b)=>ordIdx(a.x.cat)-ordIdx(b.x.cat)||a.i-b.i).map(o=>o.x);save();renderAll();toast('ردیف‌ها بر اساس دسته مرتب شدند — در چاپ هم به همین ترتیب می‌آید')}
    if(a.dataset.act==='undosort'&&m&&m.undoSort){const u=m.undoSort,pos=id=>{const i=u.ids.indexOf(id);return i<0?1e9:i};m.expenses=m.expenses.map((x,i)=>({x,i})).sort((a,b)=>pos(a.x.id)-pos(b.x.id)||a.i-b.i).map(o=>o.x);m.sortedCat=u.sorted;m.undoSort=null;save();renderAll();toast('مرتب‌سازی یک مرحله برگشت')}
    if(a.dataset.act==='getcarry'&&m){const i=S.missions.indexOf(m);if(i<1){toast('ماموریت قبلی وجود ندارد')}else{m.carry=balance(S.missions[i-1]);save();renderAll();toast('مانده ماموریت «'+S.missions[i-1].title+'» منتقل شد')}}
    if(a.dataset.act==='delm'&&m&&confirm('ماموریت «'+m.title+'» و همه هزینه‌هایش حذف شود؟')){S.missions=S.missions.filter(x=>x!==m);S.cur=S.missions.length?S.missions[0].id:null;save();renderAll()}
    return;
  }
  const ib=e.target.closest('[data-ins]');
  if(ib&&m){const i=m.expenses.findIndex(x=>x.id==ib.dataset.id);if(i>=0){const n={id:S.nextE++,cat:'',desc:'',amount:0};m.expenses.splice(ib.dataset.ins==='above'?i:i+1,0,n);save();renderAll();const inp=document.querySelector('tr[data-id="'+n.id+'"] [data-ef=amount]');if(inp)inp.focus()}return}
  const d=e.target.closest('[data-del]');
  if(d&&m){m.expenses=m.expenses.filter(x=>x.id!=d.dataset.del);save();renderAll()}
});
main.addEventListener('keydown',e=>{
  const t=e.target;
  if(e.key==='Enter'&&t.dataset.lf==='amount'&&t.closest('[data-list=noinv]')){
    e.preventDefault();const m=cur(),row=t.closest('tr'),next=row.nextElementSibling;
    if(next)next.querySelector('[data-lf=title]').focus();else{m.noinv.push({id:S.nextE++,title:'',date:todayJ(),amount:0});save();renderAll();const rs=document.querySelectorAll('[data-list=noinv]');rs[rs.length-1].querySelector('[data-lf=title]').focus()}
    return;
  }
  if(e.key==='Enter'&&t.dataset.ef==='amount'){
    e.preventDefault();const m=cur(),row=t.closest('tr');
    const next=row.nextElementSibling;
    if(next)next.querySelector('[data-ef=cat]').focus();else addRow(m);
  }
});
function addRow(m){newExp(m);save();renderAll();const rows=document.querySelectorAll('table.ex tbody tr');const last=rows[rows.length-1];if(last)last.querySelector('[data-ef=cat]').focus()}

/* تنظیمات */
const sk=['unit','sig1','sig2','sig3','perCol','perNo'];
$('btnSettings').onclick=()=>{sk.forEach(k=>$('s_'+k).value=S.settings[k]||'');$('mSet').classList.add('show')};
$('setCancel').onclick=()=>$('mSet').classList.remove('show');
$('setOk').onclick=()=>{sk.forEach(k=>S.settings[k]=$('s_'+k).value.trim()||(k==='unit'?'ریال':''));save();$('mSet').classList.remove('show');S.settings.perCol=Math.max(10,Math.min(70,parseInt(toEn($('s_perCol').value))||45));S.settings.perNo=Math.max(10,Math.min(70,parseInt(toEn($('s_perNo').value))||30));save();renderAll();toast('تنظیمات ذخیره شد')};

/* خروجی اکسل */
const LBL=['واحد پول','نام مدیر پروژه','نام مدیر صنعت','نام مدیر گروه','تعداد ردیف هر ستون در برگ A4','تعداد ردیف هر برگ A4 (بدون فاکتور)'];
$('btnExport').onclick=()=>{
  if(!S.missions.length){toast('ماموریتی برای خروجی وجود ندارد');return}
  const st=S.settings,vals=[st.unit,st.sig1,st.sig2,st.sig3,st.perCol||45,st.perNo||30];
  const sheets=[
    {name:'تنظیمات',widths:[26,40],rows:[['مورد','مقدار'],...LBL.map((l,i)=>[l,vals[i]||''])]},
    {name:'ماموریت ها',widths:[8,34,22,18,40],rows:[['کد','عنوان ماموریت','مانده از ماموریت قبل','تنخواه جدید','توضیحات'],...S.missions.map(m=>[m.id,m.title,Number(m.carry)||0,Number(m.advance)||0,m.note])]},
    {name:'هزینه ها',widths:[10,30,24,16],rows:[['کد ماموریت','عنوان ماموریت (فقط نمایشی)','دسته هزینه','مبلغ'],...S.missions.flatMap(m=>m.expenses.map(e=>[m.id,m.title,e.cat,Number(e.amount)||0]))]},
    {name:'محل و تاریخ',widths:[10,30,28,14,14],rows:[['کد ماموریت','عنوان ماموریت (فقط نمایشی)','محل ماموریت','از تاریخ','تا تاریخ'],...S.missions.flatMap(m=>m.trips.map(x=>[m.id,m.title,x.place,x.from,x.to]))]},
    {name:'نفرات',widths:[10,30,18,30],rows:[['کد ماموریت','عنوان ماموریت (فقط نمایشی)','نوع','نام'],...S.missions.flatMap(m=>[...m.staff.map(x=>[m.id,m.title,'نفر ماموریت',x.name]),...m.guests.map(x=>[m.id,m.title,'مهمان مشتری',x.name])])]},
    {name:'بدون فاکتور',widths:[10,30,34,14,16],rows:[['کد ماموریت','عنوان ماموریت (فقط نمایشی)','عنوان هزینه','تاریخ','مبلغ'],...S.missions.flatMap(m=>m.noinv.map(x=>[m.id,m.title,x.title,x.date,Number(x.amount)||0]))]},
    {name:'خلاصه',widths:[8,34,20,16,20,16,26],rows:[['کد','عنوان ماموریت','مانده از ماموریت قبل','تنخواه جدید','جمع تنخواه در اختیار','جمع هزینه','مانده (+) / مازاد هزینه (-)'],...S.missions.map(m=>[m.id,m.title,Number(m.carry)||0,Number(m.advance)||0,avail(m),total(m),balance(m)])]}
  ];
  const data=buildXlsx(sheets);
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download='tankhah_'+todayJ().replace(/\//g,'-')+'.xlsx';document.body.appendChild(a);a.click();a.remove();
  toast('فایل اکسل ساخته شد');
};

/* ورود از اکسل */
let pending=null;
$('btnImport').onclick=()=>$('fileIn').click();
$('fileIn').onchange=async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  try{
    const sh=await readXlsx(await f.arrayBuffer());
    if(sh.length<5)throw new Error('این فایل با قالب خروجی نسخه فعلی برنامه سازگار نیست. دوباره از برنامه خروجی اکسل بگیرید.');
    pending=parseSheets(sh);
    $('impInfo').textContent=`در فایل ${pending.missions.length} ماموریت و ${pending.missions.reduce((a,m)=>a+m.expenses.length,0)} ردیف هزینه پیدا شد.`;
    $('mImp').classList.add('show');
  }catch(err){alert('خطا در خواندن فایل: '+err.message)}
};
function parseSheets(sh){
  const s=(sh[0].rows.slice(1)).map(r=>r[1]);
  const settings=sh[0].rows.length>1?{unit:s[0],sig1:s[1],sig2:s[2],sig3:s[3],perCol:s[4],perNo:s[5]}:null;
  if(settings)for(const k in settings)settings[k]=settings[k]==null?'':String(settings[k]);
  const byCode={},list=[];
  const mk=(code,title)=>({code,title:title||('ماموریت بدون عنوان (کد '+code+')'),carry:0,advance:0,note:'',trips:[],staff:[],guests:[],noinv:[],expenses:[]});
  const find=(r)=>{const code=r[0]!=null?String(r[0]).trim():'',title=String(r[1]??'').trim();let m=byCode[code]||list.find(x=>x.title===title);if(!m){m=mk(code,title);list.push(m);if(code)byCode[code]=m}return m};
  const ok=r=>r.length&&!r.every(x=>x==null);
  sh[1].rows.slice(1).forEach(r=>{
    if(!ok(r))return;
    const m=mk(r[0]!=null?String(r[0]).trim():'',String(r[1]??'ماموریت'));m.carry=num(r[2]??0);m.advance=num(r[3]??0);m.note=String(r[4]??'');
    list.push(m);if(m.code)byCode[m.code]=m;
  });
  sh[2].rows.slice(1).forEach(r=>{if(!ok(r))return;find(r).expenses.push({cat:String(r[2]??''),desc:'',amount:num(r[3]??0)})});
  sh[3].rows.slice(1).forEach(r=>{if(!ok(r))return;find(r).trips.push({place:String(r[2]??''),from:normDate(r[3]??''),to:normDate(r[4]??'')})});
  sh[4].rows.slice(1).forEach(r=>{if(!ok(r)||r[3]==null)return;const m=find(r);(String(r[2]??'').includes('مهمان')?m.guests:m.staff).push({name:String(r[3])})});
  const ni=sh.find(x=>x.name.includes('بدون'));
  if(ni)ni.rows.slice(1).forEach(r=>{if(!ok(r))return;find(r).noinv.push({title:String(r[2]??''),date:normDate(r[3]??''),amount:num(r[4]??0)})});
  return{settings,missions:list};
}
function applyImport(replace){
  if(!pending)return;
  if(replace){const keep=blank();S=keep;if(pending.settings)Object.assign(S.settings,pending.settings);if(!S.settings.unit)S.settings.unit='ریال'}
  pending.missions.forEach(pm=>{
    const m=newMission({title:pm.title,carry:pm.carry,advance:pm.advance,note:pm.note,
      trips:pm.trips.length?pm.trips.map(x=>newTrip(x)):[newTrip()],staff:pm.staff.map(x=>({id:S.nextE++,name:x.name})),guests:pm.guests.map(x=>({id:S.nextE++,name:x.name})),noinv:(pm.noinv||[]).map(x=>({id:S.nextE++,title:x.title,date:x.date,amount:x.amount}))});
    pm.expenses.forEach(e=>newExp(m,e));
  });
  if(!cur()&&S.missions.length)S.cur=S.missions[0].id;
  pending=null;save();renderAll();$('mImp').classList.remove('show');toast('ورود اطلاعات انجام شد');
}
$('impAdd').onclick=()=>applyImport(false);
$('impRep').onclick=()=>{if(confirm('همه داده‌های فعلی حذف و با فایل اکسل جایگزین می‌شود. مطمئن هستید؟'))applyImport(true)};
$('impCancel').onclick=()=>{pending=null;$('mImp').classList.remove('show')};

/* چاپ */
$('btnPrint').onclick=()=>{
  const m=cur();if(!m){toast('ابتدا یک ماموریت انتخاب کنید');return}
  const st=S.settings,u=esc(st.unit),t=total(m);
  const by=catSummary(m);
  let rowsArr=m.expenses.map((e,k)=>({cat:e.cat,desc:'',amount:e.amount,k}));if(m.sortedCat)rowsArr.sort((a,b)=>ordIdx(a.cat)-ordIdx(b.cat)||a.k-b.k);
  if(m.noinv.length)rowsArr.unshift({cat:NOINV,desc:'',amount:noTot(m),k:-1}); /* بدون فاکتور همیشه ردیف ۱ چاپ */
  const perCol=Math.max(10,Math.min(70,parseInt(toEn(st.perCol))||45));
  const INLINE_MAX=20;
  const inline=rowsArr.length<=INLINE_MAX;
  const dbl=(list,off,cr,withTot,det)=>{
    const cell=(e,k)=>e?`<td class="c">${fmtP(off+k+1)}</td><td>${esc(e.cat)}</td><td class="n">${fmtP(e.amount)}</td>`:'<td></td><td></td><td></td>';
    let r='';for(let k=0;k<cr;k++)r+='<tr>'+cell(list[k],k)+cell(list[k+cr],k+cr)+'</tr>';
    const rh=Math.max(4,238/perCol),style=det?` style="--rh:${rh.toFixed(2)}mm;--fs:${rh<5?8:9}pt"`:'';
    return `<table class="dbl${det?' det':''}"${style}><thead><tr><th style="width:6%">ردیف</th><th>دسته هزینه</th><th style="width:14%">مبلغ (${u})</th><th style="width:6%">ردیف</th><th>دسته هزینه</th><th style="width:14%">مبلغ (${u})</th></tr></thead>
   <tbody>${r||'<tr><td colspan="6" class="c">هزینه‌ای ثبت نشده است</td></tr>'}</tbody>${withTot?`<tfoot><tr class="tot"><td colspan="5">جمع کل هزینه‌ها</td><td class="n">${fmtP(t)}</td></tr></tfoot>`:''}</table>`;
  };
  const pages=Math.ceil(rowsArr.length/(2*perCol));
  const coverTable=inline?dbl(rowsArr,0,Math.ceil(rowsArr.length/2),true,false):`<p style="margin:8px 0;font-size:10.5pt">ریز ردیف‌های هزینه (۱ تا ${fmtP(rowsArr.length)}) در ${fmtP(pages)} برگ پیوست آمده است.</p>`;
  let detailPages='';
  if(!inline)for(let pg=0;pg<pages;pg++){
    const off=pg*2*perCol,chunk=rowsArr.slice(off,off+2*perCol),last=pg===pages-1;
    const cr=last?Math.min(perCol,Math.ceil(chunk.length/2)):perCol;
    detailPages+=`<div class="pf"><div class="sub2">ریز هزینه‌ها - ${esc(m.title)} - برگ ${fmtP(pg+1)} از ${fmtP(pages)}</div>${dbl(chunk,off,cr,last,true)}</div>`;
  }
  const sg=`<div class="sign">
    <div><b>مدیر پروژه</b><span>${esc(st.sig1)}</span><i>امضا و تاریخ</i></div>
    <div><b>مدیر صنعت</b><span>${esc(st.sig2)}</span><i>امضا و تاریخ</i></div>
    <div><b>مدیر گروه</b><span>${esc(st.sig3)}</span><i>امضا و تاریخ</i></div>
   </div>`;
  $('printArea').innerHTML=`<div class="pf">
   <h1>فرم تسویه تنخواه و گزارش هزینه‌کرد ماموریت</h1>
   
   <table class="info"><tr><td class="k">عنوان ماموریت</td><td colspan="3">${esc(m.title)}</td></tr>
   ${tripDays(m)?`<tr><td class="k">جمع روزهای ماموریت</td><td colspan="3">${fmtP(tripDays(m))} روز</td></tr>`:''}
   ${m.staff.length?`<tr><td class="k">نفرات ماموریت (${fmtP(m.staff.length)} نفر)</td><td colspan="3">${m.staff.map(x=>esc(x.name)).join('، ')}</td></tr>`:''}
   ${m.guests.length?`<tr><td class="k">مهمان مشتری (${fmtP(m.guests.length)} نفر)</td><td colspan="3">${m.guests.map(x=>esc(x.name)).join('، ')}</td></tr>`:''}
   ${m.note?`<tr><td class="k">توضیحات</td><td colspan="3">${esc(m.note)}</td></tr>`:''}</table>
   <table><thead><tr><th>محل ماموریت</th><th style="width:20%">از تاریخ</th><th style="width:20%">تا تاریخ</th></tr></thead><tbody>${m.trips.map(x=>`<tr><td>${esc(x.place)}</td><td class="c">${esc(x.from)}</td><td class="c">${esc(x.to)}</td></tr>`).join('')}</tbody></table>
   ${coverTable}
   <div class="two"><div><table><thead><tr><th>دسته هزینه</th><th>جمع (${u})</th></tr></thead><tbody>${Object.keys(by).map(k=>`<tr><td>${esc(k)}</td><td class="n">${fmtP(by[k])}</td></tr>`).join('')}</tbody>${inline?'':`<tfoot><tr class="tot"><td>جمع کل هزینه‌ها</td><td class="n">${fmtP(t)}</td></tr></tfoot>`}</table></div>
   <div></div></div>
   ${sg}</div>${detailPages}`;
  if(m.noinv.length){
    const perNo=Math.max(10,Math.min(70,parseInt(toEn(st.perNo))||30)),rhN=Math.max(3.4,205/perNo),fsN=rhN<5?8:10;
    const np=Math.ceil(m.noinv.length/perNo);
    for(let pg=0;pg<np;pg++){
      const ch=m.noinv.slice(pg*perNo,(pg+1)*perNo),last=pg===np-1;
      $('printArea').innerHTML+=`<div class="pf"><h1>فرم هزینه‌های بدون فاکتور${np>1?' — برگ '+fmtP(pg+1)+' از '+fmtP(np):''}</h1>
   <table class="info"><tr><td class="k">عنوان ماموریت</td><td>${esc(m.title)}</td></tr></table>
   <table class="noinvp" style="--rh:${rhN.toFixed(2)}mm;--fs:${fsN}pt"><thead><tr><th style="width:8%">ردیف</th><th>عنوان هزینه</th><th style="width:18%">تاریخ</th><th style="width:22%">مبلغ (${u})</th></tr></thead>
   <tbody>${ch.map((x,i)=>`<tr><td class="c">${fmtP(pg*perNo+i+1)}</td><td>${esc(x.title)}</td><td class="c">${esc(x.date)}</td><td class="n">${fmtP(x.amount)}</td></tr>`).join('')}</tbody>
   <tfoot><tr class="tot"><td colspan="3">${last?'جمع '+NOINV:'جمع این برگ'}</td><td class="n">${fmtP(last?noTot(m):ch.reduce((a,x)=>a+(Number(x.amount)||0),0))}</td></tr></tfoot></table>
   ${last?sg:''}</div>`}
  }
  window.print();
};


/* درج اختیاری نتیجه تسویه در بخش دخل و خرج شخصی (فقط وقتی دکمه زده شود) */
function postPersonal(m){
  const d=balance(m);
  if(d>=0){toast('مانده تنخواه به شرکت بازگردانده می‌شود؛ چیزی در بخش شخصی درج نشد');return}
  const PK='dakhlkharj_v1';let P=null;try{P=JSON.parse(localStorage.getItem(PK))}catch(e){}
  if(!P||!P.months||!P.settings)P={v:1,settings:{},months:{},cur:null,tab:'dash',nid:1};
  const pu=P.settings.unit||'تومان',su=S.settings.unit;
  let amt=-d;if(su==='ریال'&&pu==='تومان')amt=Math.round(amt/10);else if(su==='تومان'&&pu==='ریال')amt=amt*10;
  const date=todayJ(),jp=date.split('/'),k=jp[0]+'-'+jp[1];
  const src='tankhah-'+m.id,title='تسویه تنخواه: '+m.title;let found=null;
  for(const mk in P.months){const e=(P.months[mk].inc||[]).find(x=>x.src===src);if(e){found=e;break}}
  if(found){found.amount=amt;found.title=title}
  else{const pm=P.months[k]=P.months[k]||{carry:null,inc:[],exp:[]};pm.inc.push({id:P.nid++,cat:'بازپرداخت تنخواه',title,date,amount:amt,fix:false,src})}
  try{localStorage.setItem(PK,JSON.stringify(P));toast(found?'مبلغ در بخش شخصی به‌روزرسانی شد':'در درآمدهای بخش شخصی ثبت شد')}catch(e){toast('ذخیره نشد')}
}
try{localStorage.setItem('last_section','tankhah')}catch(e){}
if(!S.missions.length){const m=newMission();S.cur=m.id;save()}
if(!cur()&&S.missions.length)S.cur=S.missions[0].id;
renderAll();

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
