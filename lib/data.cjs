(function(root){'use strict';
const GAMES={mega:{n:45,days:[0,3,5]},power:{n:55,days:[2,4,6]}};
function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
function officialURL(s){try{const u=new URL(s);return u.protocol==='https:'&&['vietlott.vn','www.vietlott.vn','media.vietlott.vn'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}}
function row(game,r){
 const spec=GAMES[game];if(!spec||!r||typeof r!=='object'||!/^\d{5}$/.test(r.id)||+r.id<1||!validDate(r.date))throw Error('Sai sản phẩm, mã kỳ hoặc ngày ISO YYYY-MM-DD');
 if(!spec.days.includes(new Date(r.date+'T00:00:00Z').getUTCDay()))throw Error('Ngày ngoài lịch '+game+'; cần kiểm chứng ngoại lệ trước khi nạp');
 const a=r.result;if(!Array.isArray(a)||a.length!==(game==='power'?7:6)||new Set(a).size!==a.length||a.some(x=>!Number.isInteger(x)||x<1||x>spec.n))throw Error('Kỳ '+r.id+': sai số lượng, miền số hoặc trùng số');
 if(a.slice(0,6).some((v,i)=>i>0&&v<=a[i-1]))throw Error('Kỳ '+r.id+': sáu số chính phải tăng dần');
 return {id:r.id,date:r.date,result:a.slice()};
}
function validate(data){
 if(!data||!Array.isArray(data.mega)||!Array.isArray(data.power))throw Error('Gói cần có data.mega và data.power');
 const out={};for(const game of Object.keys(GAMES)){
  if(data[game].length<157||data[game].length>20000)throw Error('Số kỳ của '+game+' phải từ 157 đến 20000');
  out[game]=data[game].map(r=>row(game,r));
  for(let i=1;i<out[game].length;i++){const a=out[game][i-1],b=out[game][i];if(b.date<=a.date)throw Error('Ngày trùng hoặc không tăng ở '+game+' #'+b.id);if(+b.id!==+a.id+1)throw Error('Thiếu/trùng mã kỳ ở '+game+' #'+b.id);}
 }
 return out;
}
function describe(data){const r={};for(const g of Object.keys(GAMES)){const a=data[g];r[g]={count:a.length,first:a[0].date,last:a.at(-1).date,latest_id:a.at(-1).id};}return r;}
function scheduled(game,now=new Date()){
 const vn=new Date(now.getTime()+7*3600000);for(let i=0;i<9;i++){let d=new Date(Date.UTC(vn.getUTCFullYear(),vn.getUTCMonth(),vn.getUTCDate()+i,11));if(GAMES[game].days.includes(new Date(d.getTime()+7*3600000).getUTCDay())&&d>now)return d.toISOString();}throw Error('Không xác định lịch');
}
function compare(base,next){
 const result={games:{},added:0};for(const g of Object.keys(GAMES)){
  let existing=new Map(next[g].map(r=>[r.id,r]));for(const r of base[g]){const b=existing.get(r.id);if(!b||b.date!==r.date||r.result.join(',')!==b.result.join(','))throw Error('Xung đột hoặc xóa kỳ gốc '+g+' #'+r.id+'; không áp dụng');}
  let add=next[g].filter(r=>!base[g].some(b=>b.id===r.id));if(add.some(r=>r.date<=base[g].at(-1).date))throw Error('Không được chèn ngược trước cutoff');
  result.games[g]={added:add,from:base[g].at(-1).date,to:next[g].at(-1).date};result.added+=add.length;
 }return result;
}
function parsePackage(text,current,now=new Date()){
 if(typeof text!=='string'||text.length>5*1024*1024)throw Error('Gói vượt giới hạn 5 MiB');let p;try{p=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('Không phải JSON hợp lệ');}
 let input;if(p&&p.data)input=p.data;else if(p&&Array.isArray(p.draws)){
  input=JSON.parse(JSON.stringify(current));for(const d of p.draws){if(!GAMES[d.game])throw Error('Sai sản phẩm trong delta');const nr=row(d.game,d),old=input[d.game].find(r=>r.id===nr.id);if(old){if(old.date!==nr.date||old.result.join(',')!==nr.result.join(','))throw Error('Xung đột kỳ '+nr.id);}else input[d.game].push(nr);}for(const g of Object.keys(GAMES))input[g].sort((a,b)=>a.date.localeCompare(b.date));
 }else throw Error('Cần gói snapshot có data hoặc gói delta có draws');
 const data=validate(input),vnDate=new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
 for(const g of Object.keys(GAMES))for(const r of data[g])if(r.date>vnDate)throw Error('Chứa kết quả tương lai: '+r.date);
 const diff=compare(current,data);
 return {schema:'vlt-offline-snapshot-v2',data,source_name:typeof p.source_name==='string'?p.source_name.slice(0,180):'Gói anh nạp',trust:'IMPORTED_NOT_INDEPENDENTLY_VERIFIED',official_issuance:false,diff};
}
function parseOfficialHTML(html,game){
 if(html.length>3*1024*1024)throw Error('HTML quá lớn');
 const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const heading=game==='mega'?/Kết quả quay số mở thưởng MEGA 6\/45/i:/Kết quả quay số mở thưởng POWER 6\/55/i;
 if(!heading.test(clean))throw Error('HTML không đúng sản phẩm');
 const title=clean.match(/Kỳ quay thưởng\s*<b>\s*#(\d{5})\s*<\/b>\s*ngày\s*<b>\s*(\d{2})\/(\d{2})\/(\d{4})\s*<\/b>/i);
 if(!title)throw Error('Không tìm được mã kỳ/ngày trong HTML Vietlott');
 const section=clean.slice(title.index).match(/<div class="day_so_ket_qua_v2">([\s\S]*?)<\/div>/);if(!section)throw Error('Không tìm thấy vùng kết quả');
 const nums=Array.from(section[1].matchAll(/<span class="bong_tron[^\"]*">\s*(\d{2})\s*<\/span>/g),m=>+m[1]);
 const r=row(game,{id:title[1],date:`${title[4]}-${title[3]}-${title[2]}`,result:nums});
 return {game,...r,source_url:'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/'+(game==='mega'?'645':'655')};
}
const api={GAMES,validDate,officialURL,row,validate,describe,scheduled,compare,parsePackage,parseOfficialHTML};if(typeof module!=='undefined')module.exports=api;root.VLTData=api;
})(typeof window!=='undefined'?window:globalThis);
