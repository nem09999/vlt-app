/* VLT PILOT-02 preview engine. No network, no issuance. */
(function(root){
'use strict';
const VERSION='pilot02-browser-preview-1.0.0';
function validate(rows,n){
 if(!Array.isArray(rows)||rows.length<157)throw Error('Cần ít nhất 157 kỳ lịch sử');
 let prev='',ids=new Set();
 for(const r of rows){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||r.date<=prev||ids.has(r.id))throw Error('Ngày hoặc mã kỳ không hợp lệ');
  if(!Array.isArray(r.result)||r.result.length!==(n===55?7:6)||new Set(r.result).size!==r.result.length||r.result.some(x=>!Number.isInteger(x)||x<1||x>n))throw Error('Bộ số dữ liệu không hợp lệ');
  prev=r.date;ids.add(r.id);
 }
}
function replay(game,rows,seed=73100){
 const n=game==='mega'?45:game==='power'?55:0;if(!n)throw Error('Sai sản phẩm');validate(rows,n);
 if(!Number.isInteger(seed)||seed<1||seed>4294967295)throw Error('Seed phải từ 1 đến 4294967295');
 const target=rows[rows.length-1],train=rows.slice(0,-1);
 let state=seed>>>0;
 function random(){state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;}
 const counts=Array(n).fill(1),decay=Array(n).fill(1),factor=Math.exp(-Math.log(2)/60);
 for(const row of train){for(let j=0;j<n;j++)decay[j]=1+(decay[j]-1)*factor;for(const v of row.result.slice(0,6)){counts[v-1]++;decay[v-1]++;}}
 const tickets=[];
 for(const method of ['random','balanced','frequency','decay']){
  const seen=new Set();let attempts=0;
  while(seen.size<5){
   if(++attempts>10000)throw Error('Không sinh đủ bộ số');
   const pool=Array.from({length:n},(_,i)=>i+1),t=[];
   while(t.length<6){
    const w=pool.map(v=>method==='frequency'?counts[v-1]:method==='decay'?decay[v-1]:1);
    let x=random()*w.reduce((a,b)=>a+b,0),k=0;for(;k<w.length-1;k++){x-=w[k];if(x<0)break;}
    t.push(pool.splice(k,1)[0]);
   }
   t.sort((a,b)=>a-b);
   if(method==='balanced'&&(t.filter(v=>v%2===0).length!==3||t.filter(v=>v<=Math.floor(n/2)).length<2||t.filter(v=>v<=Math.floor(n/2)).length>4))continue;
   const key=t.join('-');if(seen.has(key))continue;seen.add(key);
   tickets.push({method,numbers:t,matches:t.filter(v=>target.result.slice(0,6).includes(v)).length});
  }
 }
 return {schema:'vlt-pilot02-preview-v1',version:VERSION,status:'HISTORICAL_DEMO_ONLY',official_issuance:false,prospective_lock:false,game,seed,prng:'xorshift32; differs from PILOT-01 NumPy',target:{id:target.id,date:target.date,result:target.result},training_rows:train.length,training_cutoff:train.at(-1).date,tickets};
}
const api={VERSION,replay,validate};if(typeof module!=='undefined')module.exports=api;root.VLT=api;
})(typeof window!=='undefined'?window:globalThis);
