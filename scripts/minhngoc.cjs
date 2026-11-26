'use strict';
const D=require('../lib/data.cjs'),crypto=require('crypto');
const URLS={mega:'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/mega-6x45.html',power:'https://www.minhngoc.net.vn/ket-qua-xo-so/dien-toan-vietlott/power-6x55.html'};
function parse(html,game){
 const title=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'';
 if(!(game==='mega'?/Mega\s*6\/45/i:/Power\s*6\/55/i).test(title))throw Error('Minh Ngọc: trang sai sản phẩm');
 const rows=new Map();
 const pattern=/Kỳ vé:\s*<span[^>]*>#(\d{5})<\/span>\s*\|\s*Ng(?:&agrave;|à)y quay thưởng\s*(\d{2})\/(\d{2})\/(\d{4})([\s\S]*?)<\/ul>/g;
 for(const m of html.matchAll(pattern)){
  const list=m[5].match(/<ul\s+class="result-number">([\s\S]*)/);if(!list)continue;
  const nums=Array.from(list[1].matchAll(/<div\s+class="finnish\d+\s+bool"[^>]*>\s*(\d{2})\s*<\/div>/g),x=>+x[1]);
  if(nums.length!==(game==='mega'?6:7))continue; // live/partial drawings are never materialized
  const r=D.row(game,{id:m[1],date:`${m[4]}-${m[3]}-${m[2]}`,result:nums});const prior=rows.get(r.id);
  if(prior&&JSON.stringify(prior)!==JSON.stringify(r))throw Error('Minh Ngọc: cùng mã kỳ có hai kết quả');rows.set(r.id,r);
 }
 if(rows.size===0)throw Error('Minh Ngọc: chưa có kết quả hoàn tất hoặc cấu trúc đã đổi');
 return Array.from(rows.values()).sort((a,b)=>a.date.localeCompare(b.date));
}
async function collect(current,request=fetch,record=()=>{}){
 const base=D.validate(current),next=structuredClone(base),evidence=[],overlap={};
 const results=await Promise.allSettled(Object.keys(URLS).map(async game=>{
  const url=URLS[game],res=await request(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error('Minh Ngọc HTTP '+res.status);
  const bytes=Buffer.from(await res.arrayBuffer());if(bytes.length>3*1024*1024)throw Error('Minh Ngọc: phản hồi quá lớn');
  const ev={provider:'MINH_NGOC',url,method:'GET',collected_at:new Date().toISOString(),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};evidence.push(ev);record(ev,bytes);
  return {game,rows:parse(bytes.toString('utf8'),game)};
 }));
 const errors=results.filter(r=>r.status==='rejected');if(errors.length)throw Error(errors.map(r=>r.reason.message).join('; '));
 for(const {value:{game,rows}} of results){
  const old=new Map(base[game].map(r=>[r.id,r])),last=base[game].at(-1);overlap[game]=0;
  for(const r of rows){const prior=old.get(r.id);if(prior){if(prior.date!==r.date||prior.result.join(',')!==r.result.join(','))throw Error('Minh Ngọc mâu thuẫn dữ liệu đã khóa: '+game+' #'+r.id);overlap[game]++;}else if(+r.id>+last.id)next[game].push(r);}
  if(!rows.some(r=>r.id===last.id)||overlap[game]<1)throw Error('Minh Ngọc chưa nối được kỳ cuối '+game+' #'+last.id);
  next[game].sort((a,b)=>a.date.localeCompare(b.date));
 }
 const data=D.validate(next),today=new Date(Date.now()+7*3600000).toISOString().slice(0,10);for(const g of Object.keys(URLS))if(data[g].at(-1).date>today)throw Error('Minh Ngọc chứa kết quả tương lai');
 return {data,diff:D.compare(base,data),evidence,provider:'MINH_NGOC',verification:'SECONDARY_SOURCE_PENDING_OFFICIAL',overlap};
}
module.exports={parse,collect,URLS};
