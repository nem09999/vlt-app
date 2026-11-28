/* v2.1.0-jackpot: isolated presentation adapter. */
(function(){'use strict';
 const KEY='vlt-jackpots-cache-v1',money=n=>Number.isSafeInteger(n)&&n>0?n.toLocaleString('vi-VN')+' ₫':'Chưa xác minh';
 let cache=null,networkError=false;
 function validRecord(r,g){
  if(!r||r.game!==g||r.verification!=='OFFICIAL_HTTPS'||!VLTData.officialURL(r.source_url)||!/^\d{5}$/.test(r.id)||!VLTData.validDate(r.date)||!/^\d{4}-\d{2}-\d{2}T/.test(r.checked_at)||!Number.isFinite(Date.parse(r.checked_at))||Date.parse(r.checked_at)>Date.now()+300000||!/^[a-f0-9]{64}$/.test(r.source_sha256))return false;
  try{VLTData.row(g,r);const u=new URL(r.source_url);if(!['vietlott.vn','www.vietlott.vn'].includes(u.hostname)||u.pathname!=='/vi/trung-thuong/ket-qua-trung-thuong/'+(g==='mega'?'645':'655')||r.date>new Date(Date.parse(r.checked_at)+7*3600000).toISOString().slice(0,10))return false;}catch{return false;}
  return (g==='mega'?['Jackpot']:['Jackpot 1','Jackpot 2']).every(k=>{const a=r.awards?.[k];return a&&[a.winners,a.publishedAmount,a.totalAmount,a.perTicketAmount].every(n=>n===null||(Number.isSafeInteger(n)&&n>=0))&&['published_unspecified','total','per_ticket'].includes(a.valueBasis);});
 }
 function node(tag,value,cls){const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;}
 function render(){for(const g of ['mega','power']){
  const box=document.getElementById(g+'-jackpot');if(!box)continue;box.replaceChildren();
  box.append(node('h3','Kết quả kỳ gần nhất'));
  const candidate=cache?.games?.[g],official=validRecord(candidate,g)?candidate:null,latest=active.data[g].at(-1),r=official||latest;
  const newer=official&&(+latest.id>+r.id||latest.date>r.date),aged=official&&Date.now()-Date.parse(r.checked_at)>36*3600000;
  box.append(node('p','#'+r.id+' · '+r.date,'jp-draw'));
  const balls=node('div',undefined,'balls jp-balls');r.result.slice(0,6).forEach(n=>balls.append(node('span',String(n).padStart(2,'0'),'ball')));
  if(g==='power'){balls.append(node('span','+','jp-plus'));const extra=node('span',String(r.result[6]).padStart(2,'0'),'ball jp-special');extra.setAttribute('aria-label','Số đặc biệt '+r.result[6]);balls.append(extra);}box.append(balls);
  if(!official)box.append(node('p','Bộ số theo snapshot hiện có · Jackpot chưa xác minh Vietlott.','jp-warning'));
  else if(!navigator.onLine||networkError||newer||aged||cache.errors?.[g])box.append(node('p','Bản lưu theo ngày nguồn '+r.date+' · chưa xác nhận có phải kỳ mới nhất hiện tại.','jp-warning'));
  else box.append(node('p','Đã đọc nguồn Vietlott · kiểm tra '+new Date(r.checked_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),'jp-source'));
  for(const name of g==='mega'?['Jackpot']:['Jackpot 1','Jackpot 2']){
   const a=official?.awards?.[name],section=node('div',undefined,'jp-award');section.append(node('strong',name));
   const count=a?.winners;
   section.append(node('p',count===0?'Không có bộ số/vé trúng · 0':Number.isSafeInteger(count)?'Có trúng · '+count+' bộ số/vé trúng':'Số bộ số/vé trúng: Chưa xác minh'));
   section.append(node('p','Giá trị nguồn công bố: '+money(a?.publishedAmount)));
   if(a?.totalAmount!=null)section.append(node('p','Tổng quỹ Jackpot: '+money(a.totalAmount)));
   if(a?.perTicketAmount!=null)section.append(node('p','Giá trị mỗi bộ số/vé: '+money(a.perTicketAmount)));
   if(a&&a.totalAmount==null&&a.perTicketAmount==null)section.append(node('small','Nguồn chưa phân định tổng quỹ/giá trị mỗi vé; không tự chia thưởng.'));
   box.append(section);
  }
  const a=node('a','Nguồn Vietlott');a.href=official?.source_url||'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/'+(g==='mega'?'645':'655');a.target='_blank';a.rel='noopener noreferrer';box.append(a);
  box.append(node('small','Số lượng theo nguồn công bố, không suy thành số người.','jp-source'));
 }}
 function accept(v){
  if(v?.schema!=='vlt-jackpots-v1'||!v.games||typeof v.games!=='object'||Array.isArray(v.games))throw Error('Sai gói Jackpot');
  for(const g of Object.keys(v.games)){
   const r=v.games[g],old=cache?.games?.[g];
   if(!['mega','power'].includes(g)||!validRecord(r,g))throw Error('Sai dữ liệu Jackpot');
   if(old&&(+r.id<+old.id||r.date<old.date))throw Error('Nguồn cũ hơn bản tốt hiện có');
   if(old&&r.id===old.id&&(r.date!==old.date||JSON.stringify(r.result)!==JSON.stringify(old.result)||JSON.stringify(r.awards)!==JSON.stringify(old.awards)))throw Error('Nguồn xung đột; giữ bản tốt');
  }
  cache={...v,games:{...cache?.games,...v.games}};
 }
 try{const seed=document.getElementById('jackpot-data');if(seed)accept(JSON.parse(seed.textContent));}catch{}
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v)accept(v);}catch{}render();
 const prior=updateCards;updateCards=function(){prior();render();};
 async function sync(){try{const res=await fetch(RAW+'source-status.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('HTTP');const text=await res.text();if(text.length>512000)throw Error('Too large');const state=JSON.parse(text);if(!state.jackpots)throw Error('Chưa có dữ liệu Jackpot được kiểm chứng');accept(state.jackpots);networkError=false;try{localStorage.setItem(KEY,JSON.stringify(cache));}catch{}}catch{networkError=true;}render();}
 const baseSync=syncOnline;syncOnline=async function(...args){await baseSync(...args);await sync();};
 window.addEventListener('offline',render);window.addEventListener('online',sync);sync();
 // Testable display boundary, independent of number selection and local journal.
 window.VLTJackpot={validRecord,render,accept,money};
})();
