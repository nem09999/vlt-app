/* Read-only official-source collector. Never dispatches or writes to GitHub. */
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),D=require('../lib/data.cjs');
const ORIGIN='https://vietlott.vn',specs={mega:{code:'645'},power:{code:'655'}};
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function collect(current,request=fetch,record=()=>{},reverify=[]){
 const original=D.validate(current),next=JSON.parse(JSON.stringify(original)),evidence=[],verified_records=[];
 if(!Array.isArray(reverify)||reverify.some(r=>!specs[r.game]||!/^\d{5}$/.test(r.id)||!original[r.game].some(x=>x.id===r.id&&x.date===r.date)))throw Error('Danh sách chờ đối chiếu không hợp lệ');
 async function get(url,options={}){
  const res=await request(url,{...options,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error('Vietlott HTTP '+res.status+' tại '+url);
  const bytes=Buffer.from(await res.arrayBuffer());if(bytes.length>3*1024*1024)throw Error('Phản hồi quá lớn');
  const item={url,method:options.method||'GET',collected_at:new Date().toISOString(),sha256:hash(bytes),bytes:bytes.length};
  if(options.body)item.request_body_sha256=hash(options.body);evidence.push(item);record(item,bytes);return bytes.toString('utf8');
 }
 async function post(endpoint,method,body){const txt=await get(ORIGIN+endpoint,{method:'POST',headers:{'X-AjaxPro-Method':method,'Content-Type':'text/plain; charset=utf-8'},body:JSON.stringify(body)});let o;try{o=JSON.parse(txt).value;}catch{throw Error('Phản hồi Vietlott không đúng JSON');}if(!o||o.Error)throw Error('Vietlott báo lỗi khi đọc kết quả');return o;}
 const pages=await Promise.allSettled(Object.keys(specs).map(async game=>{const html=await get(ORIGIN+'/vi/trung-thuong/ket-qua-trung-thuong/'+specs[game].code);const latest=D.parseOfficialHTML(html,game);return {game,html,latest};}));
 const errors=pages.filter(r=>r.status==='rejected');if(errors.length)throw Error(errors.map(r=>r.reason.message).join('; '));
 let info=null;
 for(const {value:{game,html,latest}} of pages){
  const last=original[game].at(-1),delta=+latest.id-+last.id;
  if(delta<0)throw Error('Nguồn đang trả kỳ cũ hơn snapshot: '+game);
  if(delta>120)throw Error('Thiếu trên 120 kỳ '+game+'; cần đối soát backfill riêng');
  const pending=reverify.filter(r=>r.game===game),start=Math.min(+last.id,...pending.map(r=>+r.id));
  if(+latest.id-start>120)throw Error('Cần đối chiếu riêng trên 120 kỳ chờ xác minh');
  if(delta===0&&pending.length===0){if(last.date!==latest.date||last.result.join(',')!==latest.result.join(','))throw Error('Xung đột kỳ cuối '+game+' #'+last.id);verified_records.push({game,id:last.id,date:last.date});continue;}
  const key=html.match(/ServerSideDrawResult\(ORenderInfo,'([^']+)'/);
  if(start<+latest.id){if(!key)throw Error('Vietlott đổi cấu trúc điều hướng');if(!info)info=await post('/ajaxpro/Vietlott.Utility.WebEnvironments,Vietlott.Utility.ashx','ServerSideFrontEndCreateRenderInfo',{SiteId:'main.frontend.vi'});}
  // Recheck the overlap tail as well as every new ID; never infer numbers or dates.
  for(let id=start;id<=+latest.id;id++){
   const ident=String(id).padStart(5,'0');let r;
   if(id===+latest.id)r=latest;else{
    const o=await post('/ajaxpro/Vietlott.PlugIn.WebParts.Game'+specs[game].code+'ResultDetailWebPart,Vietlott.PlugIn.WebParts.ashx','ServerSideDrawResult',{ORenderInfo:info,Key:key[1],DrawId:ident});r=D.parseOfficialHTML(String(o.RetExtraParam1||''),game);
   }
   if(r.id!==ident)throw Error('Vietlott trả nhầm mã kỳ yêu cầu '+ident);
   const previous=original[game].find(x=>x.id===ident);
   if(previous){if(r.date!==previous.date||r.result.join(',')!==previous.result.join(','))throw Error('Xung đột kỳ nối '+game+' #'+ident);}else next[game].push(D.row(game,r));
   verified_records.push({game,id:r.id,date:r.date});
  }
 }
 const validated=D.validate(next),diff=D.compare(original,validated);
 const today=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
 for(const g of Object.keys(specs))if(validated[g].at(-1).date>today)throw Error('Nguồn có kết quả tương lai');
 return {data:validated,diff,evidence,verified_records};
}

module.exports={collect};
