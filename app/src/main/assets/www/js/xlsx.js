/* کتابخانه کوچک خواندن/نوشتن xlsx و تبدیل تاریخ (بدون نیاز به اینترنت) — مشترک بین دو بخش */
/* ---------- کتابخانه کوچک خواندن/نوشتن xlsx (بدون نیاز به اینترنت) ---------- */
const _enc=new TextEncoder(), _dec=new TextDecoder();
const _CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=_CRC[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function xmlEsc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function xmlUnesc(s){return s.replace(/&#x([0-9a-fA-F]+);/g,(_,h)=>String.fromCodePoint(parseInt(h,16))).replace(/&#(\d+);/g,(_,d)=>String.fromCodePoint(+d)).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')}

function zipStore(files){
  const parts=[],cds=[];let off=0;
  const dDate=((2026-1980)<<9)|(1<<5)|1;
  for(const f of files){
    const name=_enc.encode(f.name),crc=crc32(f.data),sz=f.data.length;
    const lh=new Uint8Array(30+name.length),v=new DataView(lh.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);
    v.setUint16(10,0,true);v.setUint16(12,dDate,true);v.setUint32(14,crc,true);v.setUint32(18,sz,true);v.setUint32(22,sz,true);
    v.setUint16(26,name.length,true);v.setUint16(28,0,true);lh.set(name,30);
    parts.push(lh,f.data);
    const ch=new Uint8Array(46+name.length),c=new DataView(ch.buffer);
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);
    c.setUint16(12,0,true);c.setUint16(14,dDate,true);c.setUint32(16,crc,true);c.setUint32(20,sz,true);c.setUint32(24,sz,true);
    c.setUint16(28,name.length,true);c.setUint32(42,off,true);ch.set(name,46);
    cds.push(ch);off+=lh.length+sz;
  }
  let cdSize=0;for(const c of cds)cdSize+=c.length;
  const e=new Uint8Array(22),ev=new DataView(e.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,cdSize,true);ev.setUint32(16,off,true);
  const all=[...parts,...cds,e];let tot=0;for(const p of all)tot+=p.length;
  const out=new Uint8Array(tot);let o=0;for(const p of all){out.set(p,o);o+=p.length}
  return out;
}
async function inflateRaw(u){
  const s=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function unzip(u){
  const v=new DataView(u.buffer,u.byteOffset,u.byteLength);
  let e=-1;for(let i=u.length-22;i>=Math.max(0,u.length-70000);i--){if(v.getUint32(i,true)===0x06054b50){e=i;break}}
  if(e<0)throw new Error('فایل xlsx معتبر نیست');
  const n=v.getUint16(e+10,true);let p=v.getUint32(e+16,true);const out={};
  for(let i=0;i<n;i++){
    if(v.getUint32(p,true)!==0x02014b50)throw new Error('ساختار zip خراب است');
    const method=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),lo=v.getUint32(p+42,true);
    const name=_dec.decode(u.subarray(p+46,p+46+nl));
    const lnl=v.getUint16(lo+26,true),lel=v.getUint16(lo+28,true),ds=lo+30+lnl+lel;
    const raw=u.subarray(ds,ds+cs);
    out[name]=method===0?raw:method===8?await inflateRaw(raw):null;
    p+=46+nl+el+cl;
  }
  return out;
}
function colName(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
function colIndex(ref){const m=/^([A-Z]+)/.exec(ref);let n=0;for(const ch of m[1])n=n*26+ch.charCodeAt(0)-64;return n-1}
function sheetXml(sh){
  let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>';
  if(sh.widths)x+='<cols>'+sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols>';
  x+='<sheetData>';
  sh.rows.forEach((r,ri)=>{
    x+=`<row r="${ri+1}">`;
    r.forEach((c,ci)=>{
      if(c===null||c===undefined||c==='')return;
      const ref=colName(ci)+(ri+1);
      if(ri===0)x+=`<c r="${ref}" s="1" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(c)}</t></is></c>`;
      else if(typeof c==='number')x+=`<c r="${ref}" s="2"><v>${c}</v></c>`;
      else x+=`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(c)}</t></is></c>`;
    });
    x+='</row>';
  });
  return x+'</sheetData></worksheet>';
}
function buildXlsx(sheets){
  const H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const f=[];
  const add=(n,s)=>f.push({name:n,data:_enc.encode(s)});
  add('[Content_Types].xml',H+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')+'</Types>');
  add('_rels/.rels',H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  add('xl/workbook.xml',H+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>'+sheets.map((s,i)=>`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')+'</sheets></workbook>');
  add('xl/_rels/workbook.xml.rels',H+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')+`<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  add('xl/styles.xml',H+'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9E2F3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center"/></xf><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
  sheets.forEach((s,i)=>add(`xl/worksheets/sheet${i+1}.xml`,sheetXml(s)));
  return zipStore(f);
}
function _attr(tag,name){const m=new RegExp('(?:^|\\s)'+name+'="([^"]*)"').exec(tag);return m?xmlUnesc(m[1]):null}
function _tText(x){let s='';const re=/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g;let m;while((m=re.exec(x)))s+=m[1]?xmlUnesc(m[1]):'';return s}
async function readXlsx(buf){
  const files=await unzip(new Uint8Array(buf));
  const txt=n=>files[n]?_dec.decode(files[n]):null;
  const wb=txt('xl/workbook.xml'),rels=txt('xl/_rels/workbook.xml.rels');
  if(!wb||!rels)throw new Error('این فایل اکسل معتبر نیست');
  const relMap={};(rels.match(/<Relationship\b[^>]*>/g)||[]).forEach(t=>{relMap[_attr(t,'Id')]=_attr(t,'Target')});
  let shared=[];const ss=txt('xl/sharedStrings.xml');
  if(ss){(ss.match(/<si\b[\s\S]*?<\/si>|<si\b[^>]*\/>/g)||[]).forEach(si=>shared.push(_tText(si)))}
  const out=[];
  for(const t of (wb.match(/<sheet\b[^>]*>/g)||[])){
    const name=_attr(t,'name'),rid=_attr(t,'r:id');let tg=relMap[rid]||'';
    tg=tg.replace(/^\//,'');if(!tg.startsWith('xl/'))tg='xl/'+tg;
    const sx=txt(tg);const rows=[];
    if(sx){
      const re=/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;let m;
      while((m=re.exec(sx))){
        const at=m[1],body=m[2]||'';const ref=_attr(at,'r');if(!ref)continue;
        const ty=_attr(at,'t');const ri=parseInt(ref.replace(/^[A-Z]+/,''))-1,ci=colIndex(ref);
        let val=null;const vm=/<v>([\s\S]*?)<\/v>/.exec(body);
        if(ty==='inlineStr')val=_tText(body);
        else if(vm){const raw=xmlUnesc(vm[1]);
          if(ty==='s')val=shared[+raw]??'';else if(ty==='str'||ty==='e')val=raw;else if(ty==='b')val=raw==='1'?'TRUE':'FALSE';else{const n=Number(raw);val=isNaN(n)?raw:n}}
        if(val===null||val==='')continue;
        (rows[ri]=rows[ri]||[])[ci]=val;
      }
    }
    for(let i=0;i<rows.length;i++)rows[i]=rows[i]||[];
    out.push({name,rows});
  }
  return out;
}
function g2j(gy,gm,gd){
  const gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
  let jy=gy<=1600?0:979;gy-=gy<=1600?621:1600;
  const gy2=gm>2?gy+1:gy;
  let days=365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)-80+gd+gdm[gm-1];
  jy+=33*Math.floor(days/12053);days%=12053;
  jy+=4*Math.floor(days/1461);days%=1461;
  if(days>365){jy+=Math.floor((days-1)/365);days=(days-1)%365}
  const jm=days<186?1+Math.floor(days/31):7+Math.floor((days-186)/30);
  const jd=1+(days<186?days%31:(days-186)%30);
  return [jy,jm,jd];
}
