/* personal.js — منطق بخش «دخل و خرج شخصی»: داده، ماه‌ها، محاسبات، نمودارها، ورود/خروج */
//#XLSX-START



/* ================= داده و ابزار ================= */
const MN=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const COL=['#16407f','#7aa5df','#0f2d5c','#4a85d0','#a8c4ea','#2d68bb','#0b2447','#cfdef3']; // طیف همان رنگ برند
const KEY='dakhlkharj_v1';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const toEn=s=>String(s??'').replace(/[۰-۹]/g,c=>c.charCodeAt(0)-1776).replace(/[٠-٩]/g,c=>c.charCodeAt(0)-1632);
const num=s=>{const n=parseFloat(toEn(s).replace(/[,٬،\s]/g,''));return isNaN(n)?0:n};
const fmtP=n=>(Number(n)||0).toLocaleString('fa-IR',{maximumFractionDigits:0});
const fmtE=n=>(Number(n)||0).toLocaleString('en-US',{maximumFractionDigits:0});
const fm=n=>(n<0?'−':'')+fmtP(Math.abs(n));
const fa=n=>Number(n).toLocaleString('fa-IR',{useGrouping:false});
const pad=n=>String(n).padStart(2,'0');
const sum=a=>a.reduce((s,x)=>s+(Number(x.amount)||0),0);
const pct=n=>fa(Math.round(n*10)/10)+'٪';
function normDate(v){const p=toEn(v).split(/[^0-9]+/).filter(Boolean);if(p.length<3)return toEn(v).trim();return p[0]+'/'+pad(p[1])+'/'+pad(p[2])}
const isLeap=y=>[1,5,9,13,17,22,26,30].includes(y%33);
const mLen=(y,m)=>m<=6?31:m<=11?30:(isLeap(y)?30:29);
const mkKey=(y,m)=>y+'-'+pad(m);
const pk=k=>k.split('-').map(Number);
const prevKey=k=>{let[y,m]=pk(k);m--;if(m<1){m=12;y--}return mkKey(y,m)};
const nextKey=k=>{let[y,m]=pk(k);m++;if(m>12){m=1;y++}return mkKey(y,m)};
const nowJ=()=>{const d=new Date();return g2j(d.getFullYear(),d.getMonth()+1,d.getDate())};
const todayKey=()=>{const j=nowJ();return mkKey(j[0],j[1])};
const todayStr=()=>{const j=nowJ();return j[0]+'/'+pad(j[1])+'/'+pad(j[2])};
const dayOf=(date,mon)=>{const p=toEn(date).split(/[^0-9]+/).filter(Boolean);return p.length>=3&&+p[1]===mon?+p[2]:1};
const defDate=k=>{if(k===todayKey())return todayStr();const[y,m]=pk(k);return y+'/'+pad(m)+'/01'};

function blank(){return{v:1,settings:{unit:'تومان',opening:0,saveRate:20,
  incCats:['حقوق','پاداش / اضافه‌کار','اجاره / سود','سایر درآمد'],
  expCats:[{n:'مسکن (اجاره/قسط)',b:0},{n:'خوراک',b:0},{n:'حمل‌ونقل',b:0},{n:'قبض و شارژ',b:0},{n:'درمان',b:0},{n:'آموزش',b:0},{n:'تفریح و رستوران',b:0},{n:'پوشاک',b:0},{n:'سایر',b:0}]},
  months:{},rules:[],cur:null,tab:'dash',nid:1}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.months&&s.settings){const b=blank();s.settings=Object.assign(b.settings,s.settings);if(!Array.isArray(s.rules))s.rules=[];return s}}catch(e){}return blank()}
let S=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(typeof syncReminders==='function'){clearTimeout(save._t);save._t=setTimeout(syncReminders,400)}}
function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast._t);toast._t=setTimeout(()=>e.style.display='none',2600)}

const EMPTY={carry:null,inc:[],exp:[]};
const getM=k=>S.months[k]||EMPTY;
const ensureM=k=>S.months[k]||(S.months[k]={carry:null,inc:[],exp:[]});
function setMonth(k){
  for(const x of Object.keys(S.months)){const m=S.months[x];if(x!==k&&!m.inc.length&&!m.exp.length&&m.carry==null)delete S.months[x]}
  S.cur=k;applyRules(k);ensureM(k);save();render();
}
/* مانده از ماه قبل: دستی یا زنجیره‌ای از آخرین ماه ثبت‌شده قبلی */
function carryOf(k){const m=S.months[k];if(m&&m.carry!=null)return Number(m.carry)||0;
  const ks=Object.keys(S.months).filter(x=>x<k).sort();
  return ks.length?closeOf(ks[ks.length-1]):(Number(S.settings.opening)||0)}
function closeOf(k){const m=getM(k);return carryOf(k)+sum(m.inc)-sum(m.exp)}
function stats(k){const m=getM(k),inc=sum(m.inc),exp=sum(m.exp),carry=carryOf(k);
  return{k,inc,exp,carry,net:inc-exp,close:carry+inc-exp,fixedExp:sum(m.exp.filter(x=>x.fix)),has:!!S.months[k]&&(m.inc.length||m.exp.length||m.carry!=null)}}
function catTotals(m){const o={};m.exp.forEach(e=>{const c=(e.cat||'نامشخص');o[c]=(o[c]||0)+(Number(e.amount)||0)});
  return Object.entries(o).sort((a,b)=>b[1]-a[1])}
const U=()=>esc(S.settings.unit);
const budgetOf=n=>{const c=S.settings.expCats.find(x=>x.n===n);return c?Number(c.b)||0:0};

/* ================= نمودارها ================= */
function dailyChart(k){
  const[y,mon]=pk(k),L=mLen(y,mon),m=getM(k);
  const ci=Array(L+1).fill(0),ce=Array(L+1).fill(0);
  m.inc.forEach(e=>{ci[Math.min(L,dayOf(e.date,mon))]+=Number(e.amount)||0});
  m.exp.forEach(e=>{ce[Math.min(L,dayOf(e.date,mon))]+=Number(e.amount)||0});
  for(let d=2;d<=L;d++){ci[d]+=ci[d-1];ce[d]+=ce[d-1]}
  const totB=S.settings.expCats.reduce((s,c)=>s+(Number(c.b)||0),0);
  const W=640,H=210,pl=10,pr=10,pt=14,pb=24;
  const mx=Math.max(1,ci[L],ce[L],totB);
  const X=d=>W-pr-(d-1)/(L-1)*(W-pl-pr),Yv=v=>H-pb-v/mx*(H-pt-pb);
  const pts=a=>a.slice(1).map((v,i)=>X(i+1).toFixed(1)+','+Yv(v).toFixed(1)).join(' ');
  let g='';for(let i=0;i<=4;i++){const v=mx*i/4,yy=Yv(v);g+=`<line x1="${pl}" x2="${W-pr}" y1="${yy}" y2="${yy}" stroke="#e3eaf4"/><text x="${W-pr}" y="${yy-2}" text-anchor="end">${v>=1e6?fa(Math.round(v/1e5)/10)+'M':v>=1e3?fa(Math.round(v/1e3))+'k':fa(Math.round(v))}</text>`}
  const xl=[1,5,10,15,20,25,L].map(d=>`<text x="${X(d)}" y="${H-8}" text-anchor="middle">${fa(d)}</text>`).join('');
  const bl=totB>0?`<line x1="${pl}" x2="${W-pr}" y1="${Yv(totB)}" y2="${Yv(totB)}" stroke="#7aa5df" stroke-width="1.6" stroke-dasharray="2 4"/>`:'';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="direction:ltr">${g}${bl}<polyline points="${pts(ci)}" fill="none" stroke="#16407f" stroke-width="2.6"/><polyline points="${pts(ce)}" fill="none" stroke="#4a85d0" stroke-width="2.6" stroke-dasharray="7 4"/>${xl}</svg>
  <div class="hint" style="margin-top:4px"><span class="sw inc"></span>درآمد تجمعی &nbsp; <span class="sw exp"></span>هزینه تجمعی ${totB>0?'&nbsp; <span class="sw bud"></span>کل بودجه':''}</div>`;
}
function yearChart(y){
  const W=640,H=220,pt=12,pb=26,bw=20,gap=(W-12*bw*2)/13;
  const st=[];for(let i=1;i<=12;i++)st.push(stats(mkKey(y,i)));
  const mx=Math.max(1,...st.map(s=>Math.max(s.inc,s.exp)));
  let b='';
  st.forEach((s,i)=>{const x0=W-gap*(i+1)-bw*2*(i+1);
    const hi=s.inc/mx*(H-pt-pb),he=s.exp/mx*(H-pt-pb);
    b+=`<rect x="${x0+bw}" y="${H-pb-hi}" width="${bw-2}" height="${hi}" rx="3" fill="#16407f"/><rect x="${x0}" y="${H-pb-he}" width="${bw-2}" height="${he}" rx="3" fill="#a8c4ea"/><text x="${x0+bw}" y="${H-9}" text-anchor="middle">${fa(i+1)}</text>`});
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="direction:ltr"><line x1="0" x2="${W}" y1="${H-pb}" y2="${H-pb}" stroke="#b8c6dc"/>${b}</svg>
  <div class="hint"><span class="sw b-inc"></span> درآمد &nbsp; <span class="sw b-exp"></span> هزینه &nbsp; (شماره ماه در پایین)</div>`;
}

/* ================= نمای خلاصه ================= */
function viewDash(){
  const k=S.cur,[y,mon]=pk(k),m=getM(k),s=stats(k),u=U(),L=mLen(y,mon);
  const cats=catTotals(m),rate=s.inc>0?s.net/s.inc*100:null;
  const target=s.inc*(Number(S.settings.saveRate)||0)/100;
  const tk=todayKey();let elapsed=k<tk?L:(k===tk?nowJ()[2]:0);
  const avgDay=elapsed>0?s.exp/elapsed:0,proj=(k===tk&&elapsed>0)?avgDay*L:null;
  const ks=Object.keys(S.months).filter(x=>x<=k&&sum(getM(x).exp)>0).sort().slice(-3);
  const avgM=ks.length?ks.reduce((a,x)=>a+sum(getM(x).exp),0)/ks.length:0;
  const runway=(s.close>0&&avgM>0)?s.close/avgM:null;
  const al=[];
  if(s.inc>0||s.exp>0){
    if(s.net<0)al.push(['r',`هزینه‌ها ${fmtP(-s.net)} ${S.settings.unit} از درآمد این ماه بیشتر است و از مانده ماه قبل برداشت شده.`]);
    if(s.close<0)al.push(['r','مانده پایان ماه منفی است (کسری).']);
    cats.forEach(([n,a])=>{const b=budgetOf(n);if(b>0&&a>b)al.push(['r',`بودجه «${esc(n)}» ${fmtP(a-b)} ${S.settings.unit} رد شده است.`]);else if(b>0&&a>b*.85)al.push(['y',`«${esc(n)}» به ${pct(a/b*100)} بودجه رسیده است.`])});
    if(proj!=null&&s.inc>0&&proj>s.inc)al.push(['y',`با روند فعلی، هزینه پایان ماه حدود ${fmtP(proj)} می‌شود که از درآمد بیشتر است.`]);
    if(rate!=null&&rate>=S.settings.saveRate&&s.net>0)al.push(['g',`هدف پس‌انداز ماه محقق شده است (${pct(rate)}).`]);
  }
  const instM=instOf(k).reduce((a,r)=>a+instAmt(r,k),0),dti=s.inc>0?instM/s.inc*100:null;
  if(dti!=null&&dti>60)al.push(['r',`اقساط ماه ${pct(dti)} از درآمد است؛ بالاتر از حد خطرناک (۶۰٪).`]);else if(dti!=null&&dti>40)al.push(['y',`اقساط ماه ${pct(dti)} از درآمد است؛ بهتر است زیر ۴۰٪ بماند.`]);
  S.rules.forEach(r=>{if(!isInst(r)||r.off)return;const c=instCounts(r);if(c.due)al.push(['y',`${c.due} قسط «${r.title}${r.bank?' — '+r.bank:''}» سررسید شده و پرداخت نشده است (تب اقساط).`])});
  const hasData=Object.values(S.months).some(x=>x.inc.length||x.exp.length);
  if(hasData&&(!S.lastBackup||Date.now()-S.lastBackup>30*864e5))al.push(['y','از اطلاعات پشتیبان نگرفته‌اید یا بیش از ۳۰ روز گذشته است. از «تنظیمات» پشتیبان (JSON) بگیرید تا با پاک‌شدن اطلاعات مرورگر یا گوشی داده‌ها از بین نرود.']);
  const tot=s.exp;let acc=0;
  const grad=cats.map(([n,a],i)=>{const p=a/tot*100,r=`${COL[i%COL.length]} ${acc}% ${acc+p}%`;acc+=p;return r}).join(',');
  const donut=tot>0?`<div class="donutw"><div class="donut" style="background:conic-gradient(${grad})"></div><div class="legend">${cats.map(([n,a],i)=>`<div><i style="background:${COL[i%COL.length]}"></i><span>${esc(n)}</span><em>${pct(a/tot*100)}</em></div>`).join('')}</div></div>`:'<div class="empty">هنوز هزینه‌ای ثبت نشده</div>';
  const names=[...new Set([...S.settings.expCats.map(c=>c.n),...cats.map(c=>c[0])])];
  const spent=Object.fromEntries(cats);
  const brows=names.filter(n=>budgetOf(n)>0||spent[n]>0).map(n=>{const a=spent[n]||0,b=budgetOf(n);
    const p=b>0?a/b*100:0;
    return `<div class="brow"><div class="l"><b>${esc(n)}</b><span>${fmtP(a)}${b>0?' <small>از '+fmtP(b)+'</small>':''}</span></div>${b>0?`<div class="bar"><i class="${p>100?'over':p>85?'':'ok'}" style="width:${Math.min(100,p)}%"></i></div><small class="${p>100?'bad':''}">${p>100?'رد شده: '+fmtP(a-b):'باقی‌مانده: '+fmtP(b-a)}</small>`:'<small>بدون بودجه</small>'}</div>`}).join('')||'<div class="empty">برای هر دسته در «تنظیمات» بودجه ماهانه تعیین کنید</div>';
  const sp=target>0?Math.max(0,Math.min(100,s.net/target*100)):0;
  return `
  <section class="card hero"><div class="lbl">مانده پایان ماه (پس‌انداز تجمعی)</div>
   <div class="big ${s.close<0?'neg':''}">${fm(s.close)} <small style="font-size:13px;font-weight:normal">${u}</small></div>
   <div class="sub"><div>مانده از ماه قبل<b>${fm(s.carry)}</b></div><div>درآمد ماه<b>${fm(s.inc)}</b></div><div>هزینه ماه<b>${fm(s.exp)}</b></div><div>تراز ماه (درآمد − هزینه)<b>${fm(s.net)}</b></div></div></section>
  ${al.map(a=>`<div class="alert ${a[0]}">${a[0]==='g'?'<i class="ic ic-check"></i>':a[0]==='y'?'<i class="ic ic-alert"></i>':'<i class="ic ic-ban"></i>'} ${a[1]}</div>`).join('')}
  <div class="kpis">
   <div class="kpi"><small>نرخ پس‌انداز ماه</small><b class="${rate==null?'':rate>=S.settings.saveRate?'good':rate<0?'bad':'warn'}">${rate==null?'—':pct(rate)}</b><i>هدف: ${pct(S.settings.saveRate)}</i></div>
   <div class="kpi"><small>نسبت هزینه به درآمد</small><b>${s.inc>0?pct(s.exp/s.inc*100):'—'}</b><i>هزینه ثابت: ${s.inc>0?pct(s.fixedExp/s.inc*100):'—'}</i></div>
   <div class="kpi"><small>میانگین هزینه روزانه</small><b>${elapsed>0?fmtP(avgDay):'—'}</b><i>${u}</i></div>
   <div class="kpi"><small>${proj!=null?'پیش‌بینی هزینه پایان ماه':'میانگین هزینه ماهانه'}</small><b>${fmtP(proj!=null?proj:avgM)}</b><i>${proj!=null?'بر اساس روند روزانه':'۳ ماه اخیر'}</i></div>
   ${instM>0?`<div class="kpi"><small>اقساط این ماه</small><b>${fmtP(instM)}</b><i>${dti==null?'':pct(dti)+' از درآمد'}</i></div>`:''}
   <div class="kpi"><small>پوشش هزینه (Runway)</small><b>${runway==null?'—':fa(Math.round(runway*10)/10)+' ماه'}</b><i>مانده ÷ میانگین هزینه</i></div>
  </div>
  <section class="card"><h3><i class="ic ic-target"></i> هدف پس‌انداز این ماه <small>${pct(S.settings.saveRate)} از درآمد = ${fmtP(target)} ${u}</small></h3>
   <div class="bar" style="height:12px"><i class="${s.net>=target&&target>0?'ok':''}" style="width:${sp}%"></i></div>
   <div class="hint" style="margin-top:6px">پس‌انداز واقعی این ماه: <b class="${s.net<0?'bad':''}">${fm(s.net)}</b> ${u}${target>0?' — '+pct(Math.max(0,s.net)/target*100)+' از هدف':''}</div></section>
  <div class="two">
   <section class="card"><h3><i class="ic ic-pie"></i> سهم هر دسته از هزینه‌ها</h3>${donut}</section>
   <section class="card"><h3><i class="ic ic-ruler"></i> بودجه در برابر واقعی</h3>${brows}</section>
  </div>
  <section class="card"><h3><i class="ic ic-chart"></i> روند روزانه ماه</h3>${dailyChart(k)}</section>
  <div class="row" style="margin-bottom:12px"><button class="pri" data-act="print"><i class="ic ic-print"></i> گزارش ماهانه (چاپ / PDF)</button></div>`;
}

/* ================= فهرست درآمد / هزینه ================= */
function catOpts(t,cur){
  const names=t==='inc'?S.settings.incCats.slice():S.settings.expCats.map(c=>c.n);
  if(cur&&!names.includes(cur))names.push(cur);
  return names.map(n=>`<option ${n===cur?'selected':''}>${esc(n)}</option>`).join('');
}
const lastCat={inc:null,exp:null};
function rowHtml(t,e){
  const isE=t==='exp',q=e.qty==null?1:e.qty,p=e.price!=null?e.price:e.amount;
  return `<div class="er" data-t="${t}" data-id="${e.id}">
  <input class="t" data-f="title" placeholder="شرح / عنوان" value="${esc(e.title)}">
  <input class="d" data-f="date" inputmode="numeric" value="${esc(e.date)}">
  <select class="c" data-f="cat">${catOpts(t,e.cat)}</select>
  ${isE?`<input class="p" data-f="price" inputmode="numeric" placeholder="قیمت واحد" value="${p?fmtE(p):''}"><input class="q" data-f="qty" inputmode="decimal" placeholder="تعداد" value="${q}"><div class="tt" title="جمع = قیمت × تعداد">${fmtP(e.amount)}</div>`:`<input class="a" data-f="amount" inputmode="numeric" value="${e.amount?fmtE(e.amount):''}">`}
  <button class="tg ${e.fix?'on':''}" data-act="fix" title="قلم ثابت ماهانه"><i class="ic ic-repeat"></i> ثابت</button>
  <button class="x" data-act="del" title="حذف"><i class="ic ic-x"></i></button></div>`}
function viewList(t){
  const k=S.cur,m=getM(k),L=m[t],u=U(),isI=t==='inc';
  const names=isI?S.settings.incCats:S.settings.expCats.map(c=>c.n);
  const lc=lastCat[t]&&names.includes(lastCat[t])?lastCat[t]:names[0];
  const carry=isI?`<section class="card"><h3><i class="ic ic-bank"></i> پس‌انداز / مانده از ماه قبل <small>${m.carry!=null?'دستی':'خودکار'}</small></h3>
    <div class="qa cy"><input class="a" id="carryIn" data-f="carry" inputmode="numeric" value="${carryOf(k)?fmtE(carryOf(k)):''}" placeholder="0"><button data-act="autocarry" ${m.carry==null?'disabled':''}><i class="ic ic-refresh"></i> خودکار</button></div>
    <div class="hint" style="margin-top:6px">به صورت خودکار از «مانده پایان ماه» قبلی منتقل می‌شود. اگر موجودی واقعی حساب شما فرق دارد، عدد را دستی اصلاح کنید.</div></section>`:'';
  const items=L.map(e=>rowHtml(t,e)).join('')||`<div class="empty">${isI?'هنوز درآمدی ثبت نشده':'هنوز هزینه‌ای ثبت نشده'}</div>`;
  const total=sum(L);
  return `${carry}
  <section class="card"><h3>${isI?'<i class="ic ic-plus"></i> ثبت درآمد جدید (حقوق، پاداش، سایر)':'<i class="ic ic-plus"></i> ثبت هزینه جدید'}</h3>
   <div class="qa ${isI?'qi':'qe'}" id="qa" data-t="${t}">
    <input class="a" id="qa_a" inputmode="numeric" placeholder="${isI?'مبلغ':'قیمت واحد'} (${S.settings.unit})">${isI?'':'<input class="q" id="qa_q" inputmode="decimal" placeholder="تعداد" value="1"><div class="tt" id="qa_tot" dir="ltr">= ۰</div>'}
    <select class="c" id="qa_c"><option value="" selected>انتخاب دسته…</option>${names.map(n=>`<option>${esc(n)}</option>`).join('')}</select>
    <input class="t" id="qa_t" placeholder="شرح (اختیاری)">
    <input class="d" id="qa_d" inputmode="numeric" value="${defDate(k)}">
    <button class="${isI?'inc':'exp'}" data-act="qa" style="flex:1 1 90px">افزودن</button></div></section>
  <section class="card"><h3>${isI?'فهرست درآمدها':'فهرست هزینه‌ها'} <small>${fmtP(L.length)} ردیف</small></h3>
   <input id="srch" placeholder="جستجو در شرح، دسته، تاریخ…" style="width:100%;margin-bottom:6px">
   <div id="rows">${items}</div>
   <div class="tot"><span>جمع ${isI?'درآمد':'هزینه'}</span><span id="listTot" class="${isI?'good':'bad'}" dir="ltr">${fmtP(total)} ${u}</span></div>
   ${isI?`<div class="tot" style="font-weight:normal;color:var(--mut)"><span>کل منابع (با مانده قبل)</span><span id="listTot2" dir="ltr">${fmtP(total+carryOf(k))} ${u}</span></div>`:''}
   ${isI?'':'<div class="hint" style="margin-bottom:4px">هر ردیف: شرح · تاریخ · دسته · قیمت واحد × تعداد = جمع</div>'}
   <div class="row"><button data-act="sortdate"><i class="ic ic-sort"></i> مرتب‌سازی بر اساس تاریخ</button><button data-act="import"><i class="ic ic-upload"></i> ورود اطلاعات حساب</button><button data-act="copyfix"><i class="ic ic-repeat"></i> درج اقلام ثابت ماه قبل</button></div>
   <div class="hint" style="margin-top:6px">اقلام «ثابت» (مثل حقوق، اجاره، قسط) را علامت بزنید تا هر ماه با یک دکمه به ماه جدید منتقل شوند.</div></section>`;
}

/* ================= سالانه ================= */
function viewYear(){
  const[y]=pk(S.cur);let rows='',ti=0,te=0;
  for(let i=1;i<=12;i++){const k=mkKey(y,i),s=stats(k);ti+=s.inc;te+=s.exp;
    rows+=`<tr class="clk${s.has?'':' emp'}" data-go="${k}"><td class="mh">${MN[i-1]}</td><td class="n" data-l="مانده قبل">${s.has?fm(s.carry):'—'}</td><td class="n good" data-l="درآمد">${s.has?fm(s.inc):'—'}</td><td class="n bad" data-l="هزینه">${s.has?fm(s.exp):'—'}</td><td class="n ${s.net<0?'bad':''}" data-l="تراز">${s.has?fm(s.net):'—'}</td><td class="n" data-l="مانده پایان"><b>${s.has?fm(s.close):'—'}</b></td><td class="n" data-l="نرخ پس‌انداز">${s.has&&s.inc>0?pct(s.net/s.inc*100):'—'}</td></tr>`}
  const u=U(),endK=mkKey(y,12),net=ti-te;
  return `<section class="card"><h3><i class="ic ic-calendar"></i> گزارش سال ${fa(y)} <small>${u}</small>
    <span style="margin-right:auto"><button data-act="yprev"><i class="ic ic-chev-r"></i> سال قبل</button> <button data-act="ynext">سال بعد <i class="ic ic-chev-l"></i></button></span></h3>
   <div class="kpis" style="margin:0 0 10px"><div class="kpi"><small>جمع درآمد سال</small><b class="good">${fm(ti)}</b></div><div class="kpi"><small>جمع هزینه سال</small><b class="bad">${fm(te)}</b></div><div class="kpi"><small>پس‌انداز خالص سال</small><b class="${net<0?'bad':'good'}">${fm(net)}</b><i>نرخ: ${ti>0?pct(net/ti*100):'—'}</i></div></div>
   ${yearChart(y)}</section>
  <section class="card"><h3>جدول ماهانه <small>برای رفتن به ماه روی ردیف بزنید</small></h3><div class="wrap"><table class="t ytab"><thead><tr><th>ماه</th><th>مانده قبل</th><th>درآمد</th><th>هزینه</th><th>تراز</th><th>مانده پایان</th><th>نرخ پس‌انداز</th></tr></thead><tbody>${rows}</tbody>
   <tfoot><tr><td class="mh">جمع سال</td><td></td><td class="n" data-l="درآمد">${fm(ti)}</td><td class="n" data-l="هزینه">${fm(te)}</td><td class="n" data-l="تراز">${fm(net)}</td><td class="n" data-l="مانده پایان">${fm(closeOf(endK))}</td><td class="n" data-l="نرخ پس‌انداز">${ti>0?pct(net/ti*100):'—'}</td></tr></tfoot></table></div></section>`;
}

/* ================= تنظیمات ================= */
function viewSet(){
  const st=S.settings;
  return `<section class="card"><h3><i class="ic ic-sliders"></i> تنظیمات عمومی</h3>
   <label class="fld">واحد پول<select data-s="unit"><option ${st.unit==='تومان'?'selected':''}>تومان</option><option ${st.unit==='ریال'?'selected':''}>ریال</option></select></label>
   <label class="fld">موجودی / پس‌انداز اولیه (قبل از اولین ماه ثبت‌شده)<input class="ltr" data-s="opening" inputmode="numeric" value="${st.opening?fmtE(st.opening):''}" placeholder="0"></label>
   <label class="fld">هدف پس‌انداز ماهانه (درصد از درآمد)<input class="ltr" data-s="saveRate" inputmode="numeric" value="${st.saveRate}"></label></section>
  <div class="two">
  <section class="card"><h3><i class="ic ic-receipt"></i> دسته‌های هزینه و بودجه ماهانه</h3>
   <div class="hint" style="margin-bottom:8px">بودجه ۰ یعنی بدون محدودیت. تغییر نام، در همه ردیف‌های قبلی هم اعمال می‌شود.</div>
   ${st.expCats.map((c,i)=>`<div class="crow"><input class="n" data-cn="${i}" value="${esc(c.n)}"><input class="b" data-cb="${i}" inputmode="numeric" placeholder="بودجه" value="${c.b?fmtE(c.b):''}"><button class="dg" data-act="delcat" data-i="${i}"><i class="ic ic-x"></i></button></div>`).join('')}
   <button data-act="addcat">+ دسته هزینه</button></section>
  <section class="card"><h3><i class="ic ic-income"></i> دسته‌های درآمد</h3>
   ${st.incCats.map((c,i)=>`<div class="crow"><input class="n" data-ci="${i}" value="${esc(c)}"><button class="dg" data-act="delinc" data-i="${i}"><i class="ic ic-x"></i></button></div>`).join('')}
   <button data-act="addinc">+ دسته درآمد</button></section></div>
  <section class="card"><h3><i class="ic ic-check"></i> قفل برنامه (پین)</h3>
   ${st.pin?`<div class="hint">قفل فعال است؛ هنگام باز کردن بخش «دخل و خرج» پین پرسیده می‌شود.</div><div class="row"><button class="dg" data-act="pinoff">برداشتن قفل</button></div>`
   :`<div class="hint" style="margin-bottom:6px">یک پین ۴ تا ۸ رقمی برای محافظت از اطلاعات مالی تعیین کنید.</div><div class="qa"><input class="a" id="pin_in" type="password" inputmode="numeric" maxlength="8" placeholder="پین"><button class="pri" data-act="pinset" style="flex:1 1 90px">فعال‌سازی</button></div>`}</section>
  <section class="card"><h3><i class="ic ic-save"></i> پشتیبان‌گیری و خروجی</h3>
   <div class="row" style="margin-top:0"><button class="pri" data-act="xlsx"><i class="ic ic-download"></i> خروجی اکسل</button><button data-act="bk"><i class="ic ic-download"></i> پشتیبان (JSON)</button><button data-act="rs"><i class="ic ic-upload"></i> بازیابی از پشتیبان</button></div>
   <h3 style="margin-top:16px"><i class="ic ic-bank"></i> ورود اطلاعات حساب</h3>
   <div class="hint" style="margin-bottom:8px">صورت‌حساب بانک یا هر جدول دیگر را از فایل اکسل (xlsx) یا CSV وارد کنید؛ ستون‌ها خودکار تشخیص داده می‌شوند و قبل از ثبت پیش‌نمایش می‌بینید.</div>
   <button class="pri" data-act="import"><i class="ic ic-upload"></i> ورود اطلاعات حساب (اکسل / CSV)</button>
   <div class="hint" style="margin-top:8px">داده‌ها فقط روی همین گوشی ذخیره می‌شوند. پاک کردن اطلاعات مرورگر آن‌ها را حذف می‌کند؛ پس هر چند وقت یک پشتیبان بگیرید.</div>
   <div class="hint" style="margin-top:4px">آخرین پشتیبان / خروجی: ${S.lastBackup?new Date(S.lastBackup).toLocaleDateString('fa-IR'):'هنوز گرفته نشده'}</div>
   <div class="row"><button class="dg" data-act="wipe"><i class="ic ic-trash"></i> حذف همه داده‌ها</button></div></section>
  <div class="hint" style="text-align:center;margin-top:4px">نسخه ${APP_VERSION_FA}</div>`;
}


/* ================= اقلام ثابت و اقساط بانک‌ها ================= */
const kIdx=k=>{const[y,m]=pk(k);return y*12+m-1};
const idxKey=i=>mkKey(Math.floor(i/12),i%12+1);
const ruleIdx=(r,k)=>kIdx(k)-kIdx(r.from);
const ruleActive=(r,k)=>{if(r.off)return false;const i=ruleIdx(r,k);return i>=0&&(!r.months||i<r.months)};
const isInst=r=>r.kind==='loan';
/* ثبت خودکار قواعد فعال در یک ماه (فقط تا ماه جاری) */
function applyRules(k){
  if(k>todayKey()||!S.rules.length)return false;
  const act=S.rules.filter(r=>!isInst(r)&&ruleActive(r,k));if(!act.length)return false;
  const m=ensureM(k),[y,mon]=pk(k);m.skip=m.skip||[];let ch=false;
  act.forEach(r=>{
    if(m.skip.includes(r.id)||m[r.type].some(x=>x.src==='rule-'+r.id))return;
    const d=Math.min(r.day||1,mLen(y,mon));
    const ttl=r.title+(r.months?' (قسط '+fa(ruleIdx(r,k)+1)+' از '+fa(r.months)+')':'')+(r.bank?' — '+r.bank:'');
    const e={id:S.nid++,cat:r.cat,title:ttl,date:y+'/'+pad(mon)+'/'+pad(d),amount:r.amount,fix:true,src:'rule-'+r.id};
    if(r.type==='exp'){e.price=r.amount;e.qty=1}
    m[r.type].push(e);ch=true});
  return ch}
function applyAllRules(){
  if(!S.rules.length)return;
  const to=kIdx(todayKey()),from=Math.max(to-240,Math.min(...S.rules.map(r=>kIdx(r.from))));
  for(let i=from;i<=to;i++)applyRules(idxKey(i))}
const ui={pay:null,list:null,f:'all'};
const instAmt=(r,k)=>{const i=ruleIdx(r,k),p=r.pays&&r.pays[i];return p?p.amt:r.amount};
const instOf=(k)=>S.rules.filter(r=>isInst(r)&&ruleActive(r,k));
const instTotal=r=>(r.paid0||0)+r.months;
const instKey=(r,i)=>idxKey(kIdx(r.from)+i);
const instDate=(r,i)=>{const[y,m]=pk(instKey(r,i));return y+'/'+pad(m)+'/'+pad(Math.min(r.day||1,mLen(y,m)))};
/* paid | due (سررسید رسیده/معوق) | future (سررسید نشده) */
const instState=(r,i)=>r.pays&&r.pays[i]?'paid':instDate(r,i)<=todayStr()?'due':'future';
const instCounts=r=>{let paid=0,due=0,fut=0;for(let i=0;i<r.months;i++){const s=instState(r,i);if(s==='paid')paid++;else if(s==='due')due++;else fut++}return{paid,due,fut}};
const instNext=r=>{for(let i=0;i<r.months;i++)if(!(r.pays&&r.pays[i]))return i;return -1};
const instLeft=r=>{let a=0;for(let i=0;i<r.months;i++)if(!(r.pays&&r.pays[i]))a+=r.amount;return a};
/* قسط‌های وام دیگر خودکار پرداخت نمی‌شوند؛ پرداخت دستی یک ردیف هزینه در ماه پرداخت می‌سازد */
function payInst(r,i,amt,dateStr){
  const p=toEn(dateStr).split(/[^0-9]+/).filter(Boolean);
  const ok=p.length>=3&&+p[1]>=1&&+p[1]<=12&&+p[0]>=1300;
  const date=ok?(+p[0])+'/'+pad(+p[1])+'/'+pad(+p[2]):todayStr();
  const[y,mo]=date.split('/').map(Number),m=ensureM(mkKey(y,mo));
  const bank=r.bank?' — '+r.bank:'';
  m.exp.push({id:S.nid++,cat:r.cat,title:'قسط '+fa((r.paid0||0)+i+1)+' از '+fa(instTotal(r))+' — '+r.title+bank,date,amount:amt,price:amt,qty:1,src:'pay-'+r.id+'-'+i});
  r.pays=r.pays||{};r.pays[i]={amt,date}}
function unpayInst(r,i){
  const src='pay-'+r.id+'-'+i;
  Object.values(S.months).forEach(m=>{m.exp=m.exp.filter(x=>x.src!==src)});
  if(r.pays)delete r.pays[i]}
/* انتقال داده نسخه قبل: اقساط خودکارِ ثبت‌شده را «پرداخت‌شده» حساب کن */
function migrateLoans(){S.rules.forEach(r=>{if(!isInst(r)||r.pays)return;r.pays={};r.paid0=r.paid0||0;
  Object.entries(S.months).forEach(([k,m])=>m.exp.forEach(x=>{if(x.src==='rule-'+r.id){const i=ruleIdx(r,k);if(i>=0&&i<r.months){r.pays[i]={amt:x.amount,date:x.date};x.src='pay-'+r.id+'-'+i}}}))})}
function viewRules(){
  const k=S.cur,u=U(),s=stats(k),R=S.rules,loans=R.filter(isInst),others=R.filter(r=>!isInst(r));
  const act=instOf(k),monthInst=act.reduce((a,r)=>a+instAmt(r,k),0),dti=s.inc>0?monthInst/s.inc*100:null;
  const left=loans.reduce((a,r)=>r.off?a:a+instLeft(r),0);
  const byBank={};act.forEach(r=>{const b=r.bank||'بدون نام بانک';byBank[b]=(byBank[b]||0)+instAmt(r,k)});
  let sch='';for(let i=0;i<6;i++){const kk=idxKey(kIdx(k)+i),[y,mm]=pk(kk);
    const ex=others.filter(r=>r.type==='exp'&&ruleActive(r,kk)),inc=others.filter(r=>r.type==='inc'&&ruleActive(r,kk));
    const ie=instOf(kk).reduce((a,r)=>a+instAmt(r,kk),0),oe=ex.reduce((a,r)=>a+r.amount,0),ii=inc.reduce((a,r)=>a+r.amount,0);
    sch+=`<tr><td class="mh">${MN[mm-1]} ${fa(y)}</td><td class="n" data-l="اقساط">${fm(ie)}</td><td class="n" data-l="هزینه ثابت">${fm(oe)}</td><td class="n good" data-l="درآمد ثابت">${fm(ii)}</td></tr>`}
  const stChip=st=>st==='paid'?'<span class="chip e">پرداخت شد</span>':st==='due'?'<span class="chip i">سررسید شده</span>':'<span class="chip w">سررسید نشده</span>';
  const loanCard=r=>{
    const c=instCounts(r),tot=instTotal(r),done=(r.paid0||0)+c.paid,p=tot?done/tot*100:0,nx=instNext(r);
    const payPanel=ui.pay&&ui.pay.r===r.id?`<div class="paybox"><b>پرداخت قسط ${fa((r.paid0||0)+ui.pay.i+1)} از ${fa(tot)}</b>
      <div class="grid2"><label class="fld">مبلغ پرداختی (${u}) — قابل ویرایش<input class="ltr" id="pay_a" inputmode="numeric" value="${fmtE(r.amount)}"></label>
      <label class="fld">تاریخ پرداخت<input class="ltr" id="pay_d" inputmode="numeric" value="${todayStr()}"></label></div>
      <div class="row"><button class="pri" data-act="instok"><i class="ic ic-check"></i> ثبت پرداخت</button><button data-act="instcancel">انصراف</button></div>
      <div class="hint">با ثبت، یک ردیف هزینه در ماهِ تاریخ پرداخت اضافه می‌شود.</div></div>`:'';
    let list='';
    if(ui.list===r.id){const rows=[],p0=r.paid0||0;
      for(let pos=0;pos<tot;pos++){const pre=pos<p0,i=pos-p0,st=pre?'pre':instState(r,i);
        if(ui.f==='paid'&&st!=='paid'&&st!=='pre')continue;if(ui.f==='future'&&st!=='future')continue;
        const pd=!pre&&r.pays&&r.pays[i],dt=instDate(r,i);
        const chip=pre?'<span class="chip e">قبلاً پرداخت شده</span>':stChip(st);
        const act=pre?'<span></span>':pd?`<button data-act="instundo" class="dg">لغو</button>`:`<button data-act="instrow" class="pri">پرداخت</button>`;
        rows.push(`<div class="irow${pre?' pre':''}" data-i="${i}"><span class="no">${fa(pos+1)}</span><span class="dt">${dt}</span><span class="am">${fmtP(pd?pd.amt:r.amount)}</span>${chip}${act}</div>`)}
      list=`<div class="ilist"><div class="hint" style="margin-bottom:4px">${ui.f==='paid'?'اقساط پرداخت‌شده':ui.f==='future'?'اقساط سررسید نشده':'همه اقساط'} · ${fa(tot)} قسط${p0?` · ${fa(p0)} قسط قبلاً پرداخت شده و در گزارش‌های ماهانه ثبت نمی‌شود`:''}</div>${rows.join('')||'<div class="empty">موردی نیست</div>'}</div>`}
    return `<div class="rc${r.off?' off':''}" data-id="${r.id}">
     <div class="l"><b>${esc(r.title)}</b><span dir="ltr">−${fmtP(r.amount)} ${u}</span></div>
     <div><span class="chip e">قسط وام</span>${r.bank?`<span class="chip w">${esc(r.bank)}</span>`:''}<span class="chip w">روز ${fa(r.day||1)} هر ماه</span>${c.due?`<span class="chip i">${fa(c.due)} قسط سررسید شده</span>`:''}${r.off?'<span class="chip w">متوقف</span>':''}</div>
     <div class="bar"><i class="${p>=100?'ok':''}" style="width:${p}%"></i></div>
     <small class="hint">${fa(done)} از ${fa(tot)} قسط پرداخت شده · باقی‌مانده ${fmtP(instLeft(r))} ${u}${nx>=0?` · قسط بعدی ${instDate(r,nx)}`:' · تسویه کامل'}</small>
     <div class="ibtns">
      <button class="pri" data-act="instpay" ${nx<0?'disabled':''}>پرداخت</button>
      <button data-act="instlist" data-f="all" class="${ui.list===r.id&&ui.f==='all'?'on':''}">مشاهده اقساط</button>
      <button data-act="instlist" data-f="paid" class="${ui.list===r.id&&ui.f==='paid'?'on':''}">پرداخت‌شده (${fa(c.paid+(r.paid0||0))})</button>
      <button data-act="instlist" data-f="future" class="${ui.list===r.id&&ui.f==='future'?'on':''}">سررسید نشده (${fa(c.fut)})</button></div>
     ${payPanel}${list}
     <div class="row" style="margin-top:6px"><button data-act="ruleoff">${r.off?'ادامه':'توقف'}</button><button class="dg" data-act="ruledel"><i class="ic ic-trash"></i> حذف</button></div></div>`};
  const otherCard=r=>{
    const i=ruleIdx(r,k),done=r.months?Math.max(0,Math.min(r.months,i+1)):0,p=r.months?done/r.months*100:0;
    const endK=r.months?idxKey(kIdx(r.from)+r.months-1):null,[ey,em]=endK?pk(endK):[0,0];
    return `<div class="rc${r.off?' off':''}" data-id="${r.id}">
     <div class="l"><b>${esc(r.title)}</b><span class="${r.type==='inc'?'good':''}" dir="ltr">${r.type==='inc'?'+':'−'}${fmtP(r.amount)} ${u}</span></div>
     <div>${r.type==='inc'?'<span class="chip i">درآمد ثابت</span>':'<span class="chip">هزینه ثابت</span>'}<span class="chip w">روز ${fa(r.day||1)} هر ماه</span>${r.off?'<span class="chip w">متوقف</span>':''}</div>
     ${r.months?`<div class="bar"><i class="${p>=100?'ok':''}" style="width:${p}%"></i></div><small class="hint">${fa(done)} از ${fa(r.months)} ماه · پایان ${MN[em-1]} ${fa(ey)}</small>`:`<small class="hint">از ${MN[pk(r.from)[1]-1]} ${fa(pk(r.from)[0])} · بدون تاریخ پایان · ثبت خودکار هر ماه</small>`}
     <div class="row" style="margin-top:6px"><button data-act="ruleoff">${r.off?'ادامه':'توقف'}</button><button class="dg" data-act="ruledel"><i class="ic ic-trash"></i> حذف</button></div></div>`};
  const cards=(loans.map(loanCard).join('')+others.map(otherCard).join(''))||'<div class="empty">هنوز قاعده‌ای تعریف نشده. اقساط بانک‌ها، اجاره، حقوق و… را یک بار ثبت کنید.</div>';
  const bankRows=Object.entries(byBank).sort((a,b)=>b[1]-a[1]).map(([b,a])=>`<div class="brow"><div class="l"><b>${esc(b)}</b><span>${fmtP(a)} ${u}</span></div></div>`).join('')||'<div class="empty">قسطی برای این ماه ثبت نشده</div>';
  const d0=defDate(k).slice(0,7);
  return `<div class="kpis">
   <div class="kpi"><small>اقساط این ماه</small><b class="bad">${fmtP(monthInst)}</b><i>${u}</i></div>
   <div class="kpi"><small>نسبت اقساط به درآمد</small><b class="${dti==null?'':dti>60?'bad':dti>40?'warn':'good'}">${dti==null?'—':pct(dti)}</b><i>مطمئن: زیر ۴۰٪</i></div>
   <div class="kpi"><small>کل اقساط باقی‌مانده</small><b>${fmtP(left)}</b><i>${u}</i></div>
   <div class="kpi"><small>تعداد وام فعال</small><b>${fa(act.length)}</b><i>در این ماه</i></div></div>
  <section class="card"><h3><i class="ic ic-bank"></i> اقساط این ماه به تفکیک بانک</h3>${bankRows}</section>
  <section class="card"><h3><i class="ic ic-plus"></i> افزودن قسط / قلم ثابت</h3>
   <div class="grid2">
    <label class="fld">نوع<select id="rl_k"><option value="loan">قسط وام (بانک)</option><option value="exp">هزینه ثابت (اجاره، قبض…)</option><option value="inc">درآمد ثابت (حقوق…)</option></select></label>
    <label class="fld">عنوان<input id="rl_t" placeholder="مثلاً وام خودرو"></label>
    <label class="fld" id="rl_bw">نام بانک<input id="rl_b" placeholder="مثلاً ملی / ملت / سپه"></label>
    <label class="fld">مبلغ هر قسط (${u})<input class="ltr" id="rl_a" inputmode="numeric" placeholder="0"></label>
    <label class="fld">روز سررسید در ماه<input class="ltr" id="rl_d" inputmode="numeric" value="1"></label>
    <label class="fld" id="rl_fw"><span>ماه سررسید قسط بعدی (سال/ماه)</span><input class="ltr" id="rl_f" inputmode="numeric" value="${d0}"></label>
    <label class="fld" id="rl_mw"><span>تعداد کل اقساط</span><input class="ltr" id="rl_m" inputmode="numeric" placeholder="مثلاً ۱۲"></label>
    <label class="fld">دسته<select id="rl_c"></select></label></div>
   <label id="rl_pcw" class="chk"><input type="checkbox" id="rl_pc"> قبلاً تعدادی از اقساط را پرداخته‌ام</label>
   <label class="fld" id="rl_pw" style="display:none"><span>تعداد اقساط پرداخت‌شده تا امروز (در گزارش‌های ماهانه نمی‌آید)</span><input class="ltr" id="rl_p" inputmode="numeric" placeholder="مثلاً ۴"></label>
   <div class="row"><button class="pri" data-act="ruleadd"><i class="ic ic-plus"></i> ثبت</button></div>
   <div class="hint" style="margin-top:6px">اقساط وام خودکار پرداخت نمی‌شوند: هر زمان پرداخت کردید دکمه «پرداخت» را بزنید تا در همان ماه ثبت شود. در روز سررسید یادآوری می‌آید. هزینه و درآمد ثابت هر ماه خودکار ثبت می‌شود.</div></section>
  <section class="card"><h3><i class="ic ic-repeat"></i> اقساط و قواعد ثبت‌شده <small>${fa(R.length)}</small></h3>${cards}</section>
  <section class="card"><h3><i class="ic ic-calendar"></i> برنامه ۶ ماه آینده <small>${u}</small></h3>
   <div class="wrap"><table class="t ytab"><thead><tr><th>ماه</th><th>اقساط</th><th>هزینه ثابت</th><th>درآمد ثابت</th></tr></thead><tbody>${sch}</tbody></table></div></section>`}
function fillRuleCats(){const kd=$('rl_k');if(!kd)return;const v=kd.value,L=v==='loan';
  const cats=v==='inc'?S.settings.incCats:v==='exp'?S.settings.expCats.map(c=>c.n):['اقساط وام'];
  $('rl_c').innerHTML=cats.map(n=>`<option>${esc(n)}</option>`).join('');$('rl_c').disabled=L;
  $('rl_bw').style.display=L?'':'none';$('rl_pcw').style.display=L?'':'none';$('rl_pw').style.display=L&&$('rl_pc').checked?'':'none';
  $('rl_mw').firstChild.textContent=L?'تعداد کل اقساط':'تعداد ماه (خالی = بدون پایان)';
  $('rl_fw').firstChild.textContent=L?'ماه سررسید قسط بعدی (سال/ماه)':'ماه شروع (سال/ماه)'}
function addRule(){
  const kind=$('rl_k').value,title=$('rl_t').value.trim(),amount=num($('rl_a').value),day=Math.max(1,Math.min(31,Math.round(num($('rl_d').value))||1));
  const p=toEn($('rl_f').value).split(/[^0-9]+/).filter(Boolean);
  if(!title){toast('عنوان را وارد کنید');return}
  if(!amount){toast('مبلغ را وارد کنید');return}
  if(p.length<2||+p[1]<1||+p[1]>12||+p[0]<1300){toast('ماه را به شکل ۱۴۰۵/۰۸ وارد کنید');return}
  const total=Math.max(0,Math.round(num($('rl_m').value)));
  if(kind==='loan'&&!total){toast('تعداد کل اقساط را وارد کنید');return}
  const paid0=kind==='loan'&&$('rl_pc').checked?Math.max(0,Math.round(num($('rl_p').value))):0;
  if(kind==='loan'&&paid0>=total){toast('تعداد پرداخت‌شده باید کمتر از کل اقساط باشد');return}
  const type=kind==='inc'?'inc':'exp',cat=kind==='loan'?'اقساط وام':$('rl_c').value;
  if(kind==='loan'&&!S.settings.expCats.some(c=>c.n===cat))S.settings.expCats.push({n:cat,b:0});
  const rule={id:S.nid++,kind,type,title,bank:kind==='loan'?$('rl_b').value.trim():'',cat,amount,day,from:mkKey(+p[0],+p[1]),months:kind==='loan'?total-paid0:total};
  if(kind==='loan'){rule.paid0=paid0;rule.pays={}}
  S.rules.push(rule);
  applyAllRules();ensureM(S.cur);save();render();toast(kind==='loan'?'قسط ثبت شد؛ برای پرداخت دکمه «پرداخت» را بزنید':'قاعده ثبت شد')}
/* یادآوری سررسید قسط (اعلان اندروید؛ در وب فقط هنگام باز بودن برنامه) */
function remindList(){const out=[],t0=jdnOf(todayStr()),now=Date.now();
  S.rules.forEach(r=>{if(!isInst(r)||r.off)return;for(let i=0;i<r.months;i++){if(r.pays&&r.pays[i])continue;const dj=jdnOf(instDate(r,i)),diff=dj-t0;if(diff<0||diff>400)continue;
    const d=new Date();d.setHours(9,0,0,0);d.setDate(d.getDate()+diff);if(d.getTime()<=now)continue;
    out.push({id:(r.id%100000)*1000+i,at:d.getTime(),title:'سررسید قسط '+r.title,text:'قسط '+fa((r.paid0||0)+i+1)+' از '+fa(instTotal(r))+(r.bank?' — '+r.bank:'')+' · '+fmtP(r.amount)+' '+S.settings.unit})}});
  return out.sort((a,b)=>a.at-b.at).slice(0,60)}
function jdnOf(str){const p=toEn(str).split(/[^0-9]+/).map(Number),y=p[0]+1595;return 365*y+Math.floor(y/33)*8+Math.floor(((y%33)+3)/4)+p[2]+(p[1]<7?(p[1]-1)*31:(p[1]-7)*30+186)}
function syncReminders(){try{const L=remindList();if(window.AndroidBridge&&AndroidBridge.setReminders)AndroidBridge.setReminders(JSON.stringify(L))}catch(e){}}
function webNotifyDue(){try{if(window.AndroidBridge||!('Notification' in window)||Notification.permission!=='granted')return;
  const day=todayStr(),f='mali_notif_day';if(localStorage.getItem(f)===day)return;
  const due=[];S.rules.forEach(r=>{if(!isInst(r)||r.off)return;for(let i=0;i<r.months;i++)if(!(r.pays&&r.pays[i])&&instDate(r,i)<=day)due.push(r.title+' — قسط '+fa((r.paid0||0)+i+1))});
  if(due.length){new Notification('سررسید قسط',{body:due.slice(0,5).join('\\n')});localStorage.setItem(f,day)}}catch(e){}}
/* بازگردانی آخرین حذف */
let undoBuf=null;
function toastUndo(msg){const e=$('toast');e.innerHTML=esc(msg)+' — <u id="undoBtn" style="cursor:pointer;font-weight:bold">بازگردانی</u>';e.style.display='block';clearTimeout(toast._t);toast._t=setTimeout(()=>{e.style.display='none';undoBuf=null},6000)}
$('toast').addEventListener('click',ev=>{if(ev.target.id==='undoBtn'&&undoBuf){const u=undoBuf;undoBuf=null;
  const m=ensureM(u.k);m[u.t].push(u.item);if(u.pay){u.pay.r.pays[u.pay.i]=u.pay.v}if(u.skip&&m.skip)m.skip=m.skip.filter(x=>x!==u.skip);
  S.cur=u.k;save();render();toast('بازگردانی شد')}});
/* قفل پین */
const pinHash=p=>{let h=5381;const s='mali:'+p;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return String(h)};
function showLock(){
  if(!S.settings.pin||$('lockScr'))return;
  const d=document.createElement('div');d.id='lockScr';d.className='lockscr';
  d.innerHTML='<div class="box"><i class="ic ic-wallet" style="width:42px;height:42px"></i><h3>دخل و خرج</h3><div class="hint" style="color:#cfdef3">پین را وارد کنید</div><input id="lockIn" type="password" inputmode="numeric" maxlength="8" autocomplete="off"><button class="pri" id="lockGo">ورود</button><div id="lockMsg" class="hint" style="color:#cfdef3;min-height:18px"></div><button class="dg" id="lockForgot" style="font-size:12px">پین را فراموش کرده‌ام</button></div>';
  document.body.appendChild(d);
  const tryIt=()=>{if(pinHash(toEn($('lockIn').value))===S.settings.pin){d.remove()}else{$('lockMsg').textContent='پین نادرست است';$('lockIn').value=''}};
  $('lockGo').onclick=tryIt;$('lockIn').onkeydown=e=>{if(e.key==='Enter')tryIt()};
  $('lockForgot').onclick=()=>{if(confirm('برای حذف پین، همه اطلاعات این بخش پاک می‌شود. ادامه می‌دهید؟')&&confirm('مطمئن هستید؟ این کار قابل بازگشت نیست مگر پشتیبان داشته باشید.')){S=blank();S.cur=todayKey();ensureM(S.cur);save();d.remove();render()}};
  setTimeout(()=>{try{$('lockIn').focus()}catch(e){}},50)}
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>60000)showLock()});

/* ================= رندر اصلی ================= */
function render(){
  const[y,mon]=pk(S.cur);$('mlabel').textContent=MN[mon-1]+' '+fa(y);
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===S.tab));
  const t=S.tab;
  $('view').innerHTML=t==='dash'?viewDash():t==='inc'||t==='exp'?viewList(t):t==='year'?viewYear():t==='rules'?viewRules():viewSet();
  if(t==='rules')fillRuleCats();
}
function refreshTotals(){
  const m=getM(S.cur),t=S.tab;if(t!=='inc'&&t!=='exp')return;
  const tot=sum(m[t]);if($('listTot'))$('listTot').textContent=fmtP(tot)+' '+S.settings.unit;
  if($('listTot2'))$('listTot2').textContent=fmtP(tot+carryOf(S.cur))+' '+S.settings.unit;
}

/* ================= رویدادها ================= */
$('tabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(b){S.tab=b.dataset.tab;save();render();window.scrollTo(0,0)}};
$('mprev').onclick=()=>setMonth(prevKey(S.cur));
$('mnext').onclick=()=>setMonth(nextKey(S.cur));
$('mtoday').onclick=()=>setMonth(todayKey());

const view=$('view');
view.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='srch'){const q=toEn(t.value).trim().toLowerCase();document.querySelectorAll('#rows .er').forEach(r=>{const txt=[...r.querySelectorAll('input,select')].map(i=>i.tagName==='SELECT'?i.options[i.selectedIndex]?.text:i.value).join(' ').toLowerCase();r.style.display=!q||toEn(txt).includes(q)?'':'none'});return}
  if(t.id==='qa_a'||t.id==='qa_q'){const qq=$('qa_q'),q=qq?(qq.value===''?1:num(qq.value)):1;if($('qa_tot'))$('qa_tot').textContent='= '+fmtP(Math.round(num($('qa_a').value)*q*100)/100);return}
  const m=ensureM(S.cur);
  if(t.dataset.f==='carry'){m.carry=num(t.value);save();refreshTotals();return}
  const row=t.closest('.er');
  if(row&&t.dataset.f){const it=m[row.dataset.t].find(x=>x.id==row.dataset.id);if(it){const f=t.dataset.f;
    if(f==='price'||f==='qty'){const pv=row.querySelector('[data-f=price]'),qv=row.querySelector('[data-f=qty]'),p=num(pv.value),q=qv.value===''?1:num(qv.value);it.price=p;it.qty=q;it.amount=Math.round(p*q*100)/100;row.querySelector('.tt').textContent=fmtP(it.amount)}
    else it[f]=f==='amount'?num(t.value):f==='date'?toEn(t.value):t.value;
    save();refreshTotals()}return}
  if(t.dataset.s){const f=t.dataset.s;S.settings[f]=(f==='opening')?num(t.value):(f==='saveRate'?Math.max(0,Math.min(100,num(t.value))):t.value);save();return}
  if(t.dataset.cb!=null){S.settings.expCats[t.dataset.cb].b=num(t.value);save();return}
});
view.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='rl_k'||t.id==='rl_pc')fillRuleCats();
  if(t.dataset.cn!=null){const i=+t.dataset.cn,old=S.settings.expCats[i].n,nv=t.value.trim()||old;S.settings.expCats[i].n=nv;t.value=nv;
    if(old!==nv)Object.values(S.months).forEach(m=>m.exp.forEach(x=>{if(x.cat===old)x.cat=nv}));save();toast('نام دسته تغییر کرد')}
  if(t.dataset.ci!=null){const i=+t.dataset.ci,old=S.settings.incCats[i],nv=t.value.trim()||old;S.settings.incCats[i]=nv;t.value=nv;
    if(old!==nv)Object.values(S.months).forEach(m=>m.inc.forEach(x=>{if(x.cat===old)x.cat=nv}));save();toast('نام دسته تغییر کرد')}
  if(t.dataset.s==='unit')toast('واحد پول تغییر کرد');
});
view.addEventListener('focusout',e=>{
  const t=e.target;
  if(t.dataset.f==='amount'||t.dataset.f==='price'||t.dataset.f==='carry'||t.dataset.cb!=null||t.dataset.s==='opening'||t.id==='qa_a'){const n=num(t.value);t.value=n?fmtE(n):''}
  if(t.dataset.f==='date'||t.id==='qa_d'){t.value=normDate(t.value);if(t.dataset.f){t.dispatchEvent(new Event('input',{bubbles:true}))}}
});
view.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='qa_a'||e.target.id==='qa_t')){e.preventDefault();quickAdd()}});
function quickAdd(){
  const q=$('qa');if(!q)return;const t=q.dataset.t,price=num($('qa_a').value),qn=$('qa_q')?($('qa_q').value===''?1:num($('qa_q').value)):1,amt=Math.round(price*qn*100)/100;
  if(!amt){toast('مبلغ را وارد کنید');$('qa_a').focus();return}
  if(!$('qa_c').value){toast('دسته را انتخاب کنید');$('qa_c').focus();return}
  const m=ensureM(S.cur);lastCat[t]=$('qa_c').value;
  m[t].push({id:S.nid++,cat:$('qa_c').value,title:$('qa_t').value.trim(),date:normDate($('qa_d').value)||defDate(S.cur),amount:amt,fix:false,...(t==='exp'?{price,qty:qn}:{})});
  save();render();toast('ثبت شد');const a=$('qa_a');if(a)a.focus();
}
view.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]');if(go){S.tab='dash';setMonth(go.dataset.go);window.scrollTo(0,0);return}
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,m=ensureM(S.cur);
  const row=b.closest('.er');
  if(a==='qa')return quickAdd();
  if(a==='del'&&row){const t=row.dataset.t,it=m[t].find(x=>x.id==row.dataset.id);if(!it)return;m[t]=m[t].filter(x=>x.id!=it.id);
    let sk=0,pay=null;if(it.src&&it.src.startsWith('rule-')){sk=+it.src.slice(5);(m.skip=m.skip||[]).push(sk)}
    if(it.src&&it.src.startsWith('pay-')){const[,rid,ix]=it.src.split('-'),rr=S.rules.find(x=>x.id==rid);if(rr&&rr.pays&&rr.pays[ix]){pay={r:rr,i:ix,v:rr.pays[ix]};delete rr.pays[ix]}}
    undoBuf={k:S.cur,t,item:it,skip:sk,pay};save();render();toastUndo('ردیف حذف شد');return}
  if(a==='ruleadd')return addRule();
  if(a==='instpay'){const rr=S.rules.find(x=>x.id==b.closest('.rc').dataset.id),i=instNext(rr);if(i>=0){ui.pay={r:rr.id,i};render()}return}
  if(a==='instrow'){const rr=S.rules.find(x=>x.id==b.closest('.rc').dataset.id);ui.pay={r:rr.id,i:+b.closest('.irow').dataset.i};render();return}
  if(a==='instcancel'){ui.pay=null;render();return}
  if(a==='instok'){const rr=S.rules.find(x=>x.id==ui.pay.r),amt=num($('pay_a').value);if(!amt){toast('مبلغ را وارد کنید');return}payInst(rr,ui.pay.i,amt,$('pay_d').value);ui.pay=null;save();render();toast('پرداخت قسط ثبت شد');return}
  if(a==='instundo'){const rr=S.rules.find(x=>x.id==b.closest('.rc').dataset.id);if(confirm('پرداخت این قسط لغو و ردیف هزینه آن حذف شود؟')){unpayInst(rr,+b.closest('.irow').dataset.i);save();render()}return}
  if(a==='instlist'){const id=+b.closest('.rc').dataset.id,f=b.dataset.f;if(ui.list===id&&ui.f===f)ui.list=null;else{ui.list=id;ui.f=f}render();return}
  if(a==='ruleoff'){const r=S.rules.find(x=>x.id==b.closest('.rc').dataset.id);r.off=!r.off;if(!r.off)applyAllRules();save();render();return}
  if(a==='ruledel'){const r=S.rules.find(x=>x.id==b.closest('.rc').dataset.id);if(confirm('قاعده «'+r.title+'» حذف شود؟ ردیف‌های ثبت‌شده قبلی باقی می‌مانند.')){S.rules=S.rules.filter(x=>x!==r);save();render()}return}
  if(a==='pinset'){const v=toEn($('pin_in').value).trim();if(!/^\d{4,8}$/.test(v)){toast('پین باید ۴ تا ۸ رقم باشد');return}S.settings.pin=pinHash(v);save();render();toast('قفل فعال شد');return}
  if(a==='pinoff'){if(confirm('قفل پین برداشته شود؟')){delete S.settings.pin;save();render()}return}
  if(a==='fix'&&row){const it=m[row.dataset.t].find(x=>x.id==row.dataset.id);it.fix=!it.fix;b.classList.toggle('on',it.fix);save();return}
  if(a==='sortdate'){m[S.tab].sort((x,y)=>String(x.date).localeCompare(String(y.date)));save();render();toast('مرتب شد');return}
  if(a==='copyfix'){const t=S.tab,pm=getM(prevKey(S.cur)),[y,mon]=pk(S.cur);
    const src=pm[t].filter(x=>x.fix);if(!src.length){toast('در ماه قبل قلم ثابتی علامت نخورده');return}
    const dup=x=>m[t].some(z=>z.fix&&z.cat===x.cat&&z.title===x.title&&z.amount===x.amount);
    let n=0;src.forEach(x=>{if(dup(x))return;const d=Math.min(dayOf(x.date,pk(prevKey(S.cur))[1]),mLen(y,mon));m[t].push({...x,id:S.nid++,date:y+'/'+pad(mon)+'/'+pad(d),fix:true});n++});
    save();render();toast(n?fa(n)+' قلم ثابت درج شد':'اقلام ثابت قبلاً درج شده‌اند');return}
  if(a==='autocarry'){m.carry=null;save();render();toast('مانده خودکار محاسبه شد');return}
  if(a==='yprev'){const[y,mm]=pk(S.cur);setMonth(mkKey(y-1,mm));return}
  if(a==='ynext'){const[y,mm]=pk(S.cur);setMonth(mkKey(y+1,mm));return}
  if(a==='print')return printReport();
  if(a==='addcat'){S.settings.expCats.push({n:'دسته جدید',b:0});save();render();return}
  if(a==='addinc'){S.settings.incCats.push('درآمد جدید');save();render();return}
  if(a==='delcat'){const c=S.settings.expCats[b.dataset.i];if(confirm('دسته «'+c.n+'» حذف شود؟ (ردیف‌های قبلی با همین نام باقی می‌مانند)')){S.settings.expCats.splice(b.dataset.i,1);save();render()}return}
  if(a==='delinc'){const c=S.settings.incCats[b.dataset.i];if(confirm('دسته «'+c+'» حذف شود؟')){S.settings.incCats.splice(b.dataset.i,1);save();render()}return}
  if(a==='xlsx')return exportXlsx();
  if(a==='import')return $('impFile').click();
  if(a==='bk')return backup();
  if(a==='rs')return $('fileIn').click();
  if(a==='wipe'){if(confirm('همه داده‌ها برای همیشه حذف می‌شود. مطمئن هستید؟')&&confirm('آخرین هشدار: پشتیبان گرفته‌اید؟')){S=blank();S.cur=todayKey();ensureM(S.cur);save();render();toast('همه چیز پاک شد')}}
});

/* ================= پشتیبان و اکسل ================= */
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function backup(){dl(new Blob([JSON.stringify(S)],{type:'application/json'}),'dakhlkharj_backup_'+todayStr().replace(/\//g,'-')+'.json');S.lastBackup=Date.now();save();toast('پشتیبان ذخیره شد')}
$('fileIn').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const d=JSON.parse(await f.text());if(!d.months||!d.settings)throw new Error('ساختار فایل معتبر نیست');
    if(!confirm('داده‌های فعلی با این پشتیبان جایگزین می‌شود. ادامه می‌دهید؟'))return;
    const b=blank();d.settings=Object.assign(b.settings,d.settings);S=Object.assign(b,d);S.cur=todayKey();ensureM(S.cur);save();render();toast('بازیابی انجام شد')}
  catch(err){alert('خطا در خواندن فایل: '+err.message)}};
function exportXlsx(){
  const keys=Object.keys(S.months).sort();
  if(!keys.length){toast('داده‌ای برای خروجی نیست');return}
  const mn=k=>{const[y,m]=pk(k);return MN[m-1]+' '+y};
  const flat=t=>keys.flatMap(k=>getM(k)[t].map(e=>[mn(k),e.date,e.cat,e.title,t==='exp'?(e.price!=null?e.price:e.amount):'',t==='exp'?(e.qty==null?1:e.qty):'',Number(e.amount)||0,e.fix?'بله':'']));
  const sheets=[
   {name:'خلاصه ماهانه',widths:[16,18,16,16,16,18,16],rows:[['ماه','مانده از ماه قبل','درآمد','هزینه','تراز ماه','مانده پایان','نرخ پس‌انداز %'],...keys.map(k=>{const s=stats(k);return[mn(k),s.carry,s.inc,s.exp,s.net,s.close,s.inc>0?Math.round(s.net/s.inc*1000)/10:'']})]},
   {name:'درآمد',widths:[16,14,22,30,14,10,16,8],rows:[['ماه','تاریخ','دسته','شرح','قیمت واحد','تعداد','مبلغ کل','ثابت'],...flat('inc')]},
   {name:'هزینه',widths:[16,14,22,30,14,10,16,8],rows:[['ماه','تاریخ','دسته','شرح','قیمت واحد','تعداد','مبلغ کل','ثابت'],...flat('exp')]},
   {name:'اقساط و اقلام ثابت',widths:[16,28,18,16,12,14,14,12],rows:[['نوع','عنوان','بانک','مبلغ','روز','ماه شروع','تعداد اقساط','وضعیت'],...S.rules.map(r=>[r.kind==='loan'?'قسط وام':r.type==='inc'?'درآمد ثابت':'هزینه ثابت',r.title,r.bank||'',r.amount,r.day||1,r.from,(r.paid0||0)+r.months||'',r.off?'متوقف':'فعال'])]}];
  dl(new Blob([buildXlsx(sheets)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'dakhlkharj_'+todayStr().replace(/\//g,'-')+'.xlsx');S.lastBackup=Date.now();save();toast('فایل اکسل ساخته شد');
}

/* ================= چاپ ================= */
function printReport(){
  const k=S.cur,[y,mon]=pk(k),m=getM(k),s=stats(k),u=esc(S.settings.unit),cats=catTotals(m);
  const sorted=t=>m[t].slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const lst=t=>sorted(t).map((e,i)=>`<tr><td class="c">${fmtP(i+1)}</td><td class="c">${esc(e.date)}</td><td>${esc(e.cat)}</td><td>${esc(e.title)}</td>${t==='exp'?`<td class="n">${fmtP(e.price!=null?e.price:e.amount)}</td><td class="c">${fmtP(e.qty==null?1:e.qty)}</td>`:''}<td class="n">${fmtP(e.amount)}</td></tr>`).join('')||'<tr><td colspan="7" class="c">—</td></tr>';
  $('printArea').innerHTML=`<div class="pf"><h1>گزارش دخل و خرج ${MN[mon-1]} ${fa(y)}</h1><div class="sub">مبالغ به ${u}</div>
   <table><tbody><tr><th>مانده از ماه قبل</th><td class="n">${fm(s.carry)}</td><th>جمع درآمد</th><td class="n">${fm(s.inc)}</td></tr>
   <tr><th>جمع هزینه</th><td class="n">${fm(s.exp)}</td><th>تراز ماه</th><td class="n">${fm(s.net)}</td></tr>
   <tr><th>مانده پایان ماه</th><td class="n"><b>${fm(s.close)}</b></td><th>نرخ پس‌انداز</th><td class="n">${s.inc>0?pct(s.net/s.inc*100):'—'}</td></tr></tbody></table>
   <h2>درآمدها</h2><table><thead><tr><th style="width:7%">ردیف</th><th style="width:15%">تاریخ</th><th>دسته</th><th>شرح</th><th style="width:18%">مبلغ</th></tr></thead><tbody>${lst('inc')}</tbody><tfoot><tr><td colspan="4">جمع درآمد</td><td class="n">${fmtP(s.inc)}</td></tr></tfoot></table>
   <h2>هزینه‌ها به تفکیک دسته</h2><table><thead><tr><th>دسته</th><th style="width:18%">هزینه</th><th style="width:18%">بودجه</th><th style="width:14%">درصد</th></tr></thead><tbody>${cats.map(([n,a])=>`<tr><td>${esc(n)}</td><td class="n">${fmtP(a)}</td><td class="n">${budgetOf(n)?fmtP(budgetOf(n)):'—'}</td><td class="c">${pct(a/s.exp*100)}</td></tr>`).join('')||'<tr><td colspan="4" class="c">—</td></tr>'}</tbody><tfoot><tr><td>جمع</td><td class="n">${fmtP(s.exp)}</td><td></td><td></td></tr></tfoot></table>
   <h2>ریز هزینه‌ها</h2><table><thead><tr><th style="width:6%">ردیف</th><th style="width:13%">تاریخ</th><th>دسته</th><th>شرح</th><th style="width:14%">قیمت واحد</th><th style="width:8%">تعداد</th><th style="width:15%">جمع</th></tr></thead><tbody>${lst('exp')}</tbody><tfoot><tr><td colspan="6">جمع کل هزینه‌ها</td><td class="n">${fmtP(s.exp)}</td></tr></tfoot></table></div>`;
  window.print();
}


/* ================= ورود اطلاعات حساب ================= */
let imp=null;
function csvParse(txt){
  const fl=txt.split('\n',1)[0],cnt={',':0,';':0,'\t':0};for(const c of fl)if(c in cnt)cnt[c]++;
  const d=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<txt.length;i++){const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;else if(c===d){row.push(cur);cur=''}else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur=''}else if(c!=='\r')cur+=c}
  if(cur!==''||row.length){row.push(cur);rows.push(row)}
  return rows.map(r=>r.map(x=>{x=x.trim();return x===''?undefined:x}))
}
function serialJ(n){const d=new Date(Date.UTC(1899,11,30)+Math.round(n)*86400000);return g2j(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate())}
function parseDate(v){
  if(v==null||v==='')return null;
  let j=null;
  if(typeof v==='number'&&v>20000&&v<80000)j=serialJ(v);
  else{
    const s=toEn(v).trim();let d=s.split(/[^0-9]+/).filter(Boolean);
    if(d.length===1&&d[0].length===8)d=[d[0].slice(0,4),d[0].slice(4,6),d[0].slice(6,8)];
    if(d.length<3)return null;
    let y=+d[0],m=+d[1],dd=+d[2];
    if(d[0].length<=2&&d[2].length===4){y=+d[2];dd=+d[0]}
    if(y<100)y+=1400;
    if(m<1||m>12||dd<1||dd>31)return null;
    j=y>1700?g2j(y,m,dd):[y,m,dd];
  }
  return j[0]+'/'+pad(j[1])+'/'+pad(j[2]);
}
const ROLES=[['date','تاریخ',/تاریخ|date/i],['qty','تعداد',/تعداد|qty|quantity/i],['price','قیمت واحد',/قیمت|(^|\s)فی(\s|$)|واحد|price/i],['debit','برداشت / بدهکار',/برداشت|بدهکار|debit|withdraw/i],['credit','واریز / بستانکار',/واریز|بستانکار|credit|deposit/i],['amount','مبلغ',/مبلغ|جمع|کل|amount|total/i],['cat','دسته',/دسته|category/i],['title','شرح / عنوان',/شرح|عنوان|توضیح|بابت|نام|description|title|memo/i]];
function densify(r){return Array.from(r||[])}
function detectHdr(rows){
  for(let i=0;i<Math.min(15,rows.length);i++){const r=densify(rows[i]).filter(x=>x!=null&&x!=='');
    if(r.length>=2&&r.filter(x=>typeof x==='string'&&!/\d/.test(toEn(x))).length>=Math.ceil(r.length*.6))return i+1}
  return 0;
}
function autoMap(sh,hdr){
  const map={};ROLES.forEach(r=>map[r[0]]=null);
  if(hdr>0){const h=densify(sh.rows[hdr-1]),used=new Set();
    ROLES.forEach(([k,,re])=>{const c=h.findIndex((x,i)=>x!=null&&!used.has(i)&&re.test(String(x)));if(c>=0){map[k]=c;used.add(c)}})}
  return map;
}
function initSheet(i){
  imp.si=i;const sh=imp.sheets[i];imp.hdr=detectHdr(sh.rows);imp.map=autoMap(sh,imp.hdr);
  imp.mode=/درآمد/.test(sh.name)?'allinc':/هزینه/.test(sh.name)?'allexp':'sign';
}
$('impFile').onchange=async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  try{
    let sheets;
    if(/\.xlsx$/i.test(f.name))sheets=await readXlsx(await f.arrayBuffer());
    else{const buf=await f.arrayBuffer();let txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(_){txt=new TextDecoder('windows-1256').decode(buf)}
      sheets=[{name:'CSV',rows:csvParse(txt.replace(/^﻿/,''))}]}
    sheets=sheets.filter(s=>s.rows.length>0);
    if(!sheets.length)throw new Error('فایل خالی است');
    const exp=S.settings.expCats.map(c=>c.n),inc=S.settings.incCats;
    imp={file:f.name,sheets,skipDup:true,catExp:exp.includes('سایر')?'سایر':exp[exp.length-1],catInc:inc[inc.length-1]};
    initSheet(0);impRender();$('modal').classList.add('show');
  }catch(err){alert('خطا در خواندن فایل: '+err.message)}
};
function impResolve(){
  const sh=imp.sheets[imp.si],M=imp.map,out=[];let zero=0,noDate=0,dup=0;
  const seen=new Set();Object.values(S.months).forEach(m=>{m.exp.forEach(x=>seen.add('e|'+x.date+'|'+x.title+'|'+x.amount));m.inc.forEach(x=>seen.add('i|'+x.date+'|'+x.title+'|'+x.amount))});
  for(let ri=imp.hdr;ri<sh.rows.length;ri++){
    const r=densify(sh.rows[ri]);if(r.every(x=>x==null||x===''))continue;
    const g=k=>M[k]!=null?r[M[k]]:undefined;
    let type=null,amt=0;
    const pr=num(g('price')),q=g('qty')==null||g('qty')===''?1:(num(g('qty'))||1);
    if(M.debit!=null||M.credit!=null){const d=Math.abs(num(g('debit'))),c=Math.abs(num(g('credit')));if(d>0){type='exp';amt=d}else if(c>0){type='inc';amt=c}}
    else{let a=num(g('amount'));if(!a&&pr)a=pr*q;
      if(a){if(imp.mode==='allexp')type='exp';else if(imp.mode==='allinc')type='inc';else type=a<0?'exp':'inc';amt=Math.abs(a)}}
    if(!type||!amt){zero++;continue}
    let date=parseDate(g('date'));if(!date)noDate++;
    const item={type,date:date||defDate(S.cur),title:String(g('title')??'').trim(),amount:Math.round(amt*100)/100,cat:String(g('cat')??'').trim()||(type==='exp'?imp.catExp:imp.catInc)};
    if(type==='exp'){item.qty=q;item.price=(M.price!=null&&pr)?pr:Math.round(amt/q*100)/100}
    item.dup=seen.has((type==='exp'?'e|':'i|')+item.date+'|'+item.title+'|'+item.amount);if(item.dup)dup++;
    out.push(item);
  }
  return{items:out,zero,noDate,dup};
}
function impRender(){
  const sh=imp.sheets[imp.si],hdrRow=imp.hdr>0?densify(sh.rows[imp.hdr-1]):[];
  const ncol=Math.max(...sh.rows.slice(0,30).map(r=>densify(r).length),1);
  const opts=k=>`<option value="">— ندارد —</option>`+Array.from({length:ncol},(_,i)=>`<option value="${i}" ${imp.map[k]===i?'selected':''}>${esc(hdrRow[i]!=null?hdrRow[i]:'ستون '+fa(i+1))}</option>`).join('');
  const R=impResolve(),use=R.items.filter(x=>!(imp.skipDup&&x.dup));
  const se=use.filter(x=>x.type==='exp'),si=use.filter(x=>x.type==='inc');
  const hasDC=imp.map.debit!=null||imp.map.credit!=null;
  const rowsPv=R.items.slice(0,8).map(x=>`<tr><td class="c" data-l="تاریخ">${esc(x.date)}</td><td class="mh">${esc(x.title)||'—'}</td><td data-l="دسته">${esc(x.cat)}</td><td class="c" data-l="نوع">${x.type==='exp'?'<span class="bad">هزینه</span>':'<span class="good">درآمد</span>'}</td><td class="n" data-l="قیمت × تعداد">${x.type==='exp'?fmtP(x.price)+' × '+fmtP(x.qty):'—'}</td><td class="n" data-l="مبلغ"><b>${fmtP(x.amount)}</b></td></tr>`).join('');
  const bx=$('modalBox'),st=bx.scrollTop;
  bx.innerHTML=`<h3><i class="ic ic-upload"></i> ورود اطلاعات حساب <small class="hint">${esc(imp.file)}</small></h3>
  <div class="grid2">
   ${imp.sheets.length>1?`<label class="fld">برگه (Sheet)<select data-imp="sheet">${imp.sheets.map((x,i)=>`<option value="${i}" ${i===imp.si?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:''}
   <label class="fld">ردیف عنوان ستون‌ها (۰ = بدون عنوان)<input data-imp="hdr" class="ltr" inputmode="numeric" value="${imp.hdr}"></label></div>
  <b style="font-size:13px">۱) تطبیق ستون‌ها</b><div class="hint">برنامه ستون‌ها را حدس زده؛ در صورت نیاز اصلاح کنید. برای «برداشت / واریز» دو ستون جدا، یا فقط یک ستون «مبلغ» انتخاب کنید.</div>
  <div class="mapg">${ROLES.map(([k,l])=>`<label class="fld">${l}<select data-imp="map" data-k="${k}">${opts(k)}</select></label>`).join('')}</div>
  <div class="mapg">
   <label class="fld">نوع تراکنش (برای ستون «مبلغ»)<select data-imp="mode" ${hasDC?'disabled':''}><option value="sign" ${imp.mode==='sign'?'selected':''}>بر اساس علامت (منفی = هزینه، مثبت = درآمد)</option><option value="allexp" ${imp.mode==='allexp'?'selected':''}>همه هزینه</option><option value="allinc" ${imp.mode==='allinc'?'selected':''}>همه درآمد</option></select></label>
   <label class="fld">دسته پیش‌فرض هزینه<select data-imp="catExp">${S.settings.expCats.map(c=>`<option ${c.n===imp.catExp?'selected':''}>${esc(c.n)}</option>`).join('')}</select></label>
   <label class="fld">دسته پیش‌فرض درآمد<select data-imp="catInc">${S.settings.incCats.map(c=>`<option ${c===imp.catInc?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div>
  <b style="font-size:13px">۲) پیش‌نمایش</b>
  <div style="margin:6px 0"><span class="chip e">${fa(se.length)} هزینه: ${fmtP(sum(se))}</span><span class="chip i">${fa(si.length)} درآمد: ${fmtP(sum(si))}</span>${R.dup?`<span class="chip w">${fa(R.dup)} تکراری</span>`:''}${R.noDate?`<span class="chip w">${fa(R.noDate)} بدون تاریخ معتبر (به ماه جاری)</span>`:''}${R.zero?`<span class="chip">${fa(R.zero)} ردیف بدون مبلغ نادیده</span>`:''}</div>
  <div class="wrap"><table class="t pv ytab"><thead><tr><th>تاریخ</th><th>شرح</th><th>دسته</th><th>نوع</th><th>قیمت × تعداد</th><th>مبلغ</th></tr></thead><tbody>${rowsPv||'<tr><td colspan="6" class="c">ردیفی پیدا نشد — ستون‌ها یا ردیف عنوان را بررسی کنید</td></tr>'}</tbody></table></div>
  <div class="hint">${R.items.length>8?'۸ ردیف اول نمایش داده شد. ':''}تاریخ‌های میلادی خودکار به شمسی تبدیل می‌شوند و هر ردیف در ماه خودش ثبت می‌شود.</div>
  <label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" data-imp="dup" ${imp.skipDup?'checked':''}> رد کردن ردیف‌های تکراری (هم‌تاریخ، هم‌شرح، هم‌مبلغ)</label>
  <div class="row"><button class="pri" data-imp="go" ${use.length?'':'disabled'}>ثبت ${fa(use.length)} ردیف</button><button data-imp="close">انصراف</button></div>`;
  bx.scrollTop=st;
}
$('modal').addEventListener('change',e=>{
  if(!imp)return;const t=e.target,k=t.dataset.imp;if(!k)return;
  if(k==='sheet')initSheet(+t.value);
  else if(k==='hdr'){imp.hdr=Math.max(0,parseInt(toEn(t.value))||0);imp.map=autoMap(imp.sheets[imp.si],imp.hdr)}
  else if(k==='map')imp.map[t.dataset.k]=t.value===''?null:+t.value;
  else if(k==='mode')imp.mode=t.value;
  else if(k==='catExp')imp.catExp=t.value;
  else if(k==='catInc')imp.catInc=t.value;
  else if(k==='dup')imp.skipDup=t.checked;
  impRender();
});
$('modal').addEventListener('click',e=>{
  const b=e.target.closest('button[data-imp]');if(!b||!imp)return;
  if(b.dataset.imp==='close'){imp=null;$('modal').classList.remove('show')}
  if(b.dataset.imp==='go'){
    const R=impResolve(),use=R.items.filter(x=>!(imp.skipDup&&x.dup));
    use.forEach(x=>{
      const[y,mo]=x.date.split('/').map(Number),m=ensureM(mkKey(y,mo));
      if(x.type==='exp'){if(!S.settings.expCats.some(c=>c.n===x.cat))S.settings.expCats.push({n:x.cat,b:0});
        m.exp.push({id:S.nid++,cat:x.cat,title:x.title,date:x.date,price:x.price,qty:x.qty,amount:x.amount,fix:false})}
      else{if(!S.settings.incCats.includes(x.cat))S.settings.incCats.push(x.cat);
        m.inc.push({id:S.nid++,cat:x.cat,title:x.title,date:x.date,amount:x.amount,fix:false})}});
    imp=null;$('modal').classList.remove('show');save();render();toast(fa(use.length)+' ردیف وارد شد');
  }
});

try{localStorage.setItem('last_section','personal')}catch(e){}
/* ================= شروع ================= */
if(!S.cur||!/^\d+-\d\d$/.test(S.cur))S.cur=todayKey();
migrateLoans();applyAllRules();ensureM(S.cur);save();render();showLock();syncReminders();webNotifyDue();
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
