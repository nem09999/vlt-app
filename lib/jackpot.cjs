/* Jackpot display data only. No selection or historical data mutation. */
'use strict';
const D=require('./data.cjs'),crypto=require('crypto');
const URLS={mega:'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/645',power:'https://vietlott.vn/vi/trung-thuong/ket-qua-trung-thuong/655'};
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
function amount(s){s=plain(s);if(!/^\d{1,3}(?:[.,]\d{3})+(?:\s*(?:đ|₫|đồng|VND))?$/i.test(s))return null;const n=Number(s.replace(/[^\d]/g,''));return Number.isSafeInteger(n)&&n>0?n:null;}
function parse(html,game,checkedAt=new Date().toISOString()){
 const draw=D.parseOfficialHTML(html,game),awards={};
 if(!Number.isFinite(Date.parse(checkedAt))||draw.date>new Date(Date.parse(checkedAt)+7*3600000).toISOString().slice(0,10))throw Error('Future draw or invalid timestamp');
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'');
 const names=game==='mega'?['Jackpot']:['Jackpot 1','Jackpot 2'];
 for(const name of names){
  const matches=[];
  for(const row of text.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const cells=Array.from(row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),m=>plain(m[1]));
   if(cells[0]?.toLowerCase()!==name.toLowerCase())continue;
   // Official result table: prize, match rule, number of winning combinations, published value.
   if(cells.length!==4||!/^\d+$/.test(cells[2]))throw Error('Unknown Jackpot table schema');
   const winners=Number(cells[2]),publishedAmount=amount(cells[3]);
   if(!Number.isSafeInteger(winners)||winners<0||publishedAmount===null)throw Error('Invalid Jackpot values');
   matches.push({winners,publishedAmount,totalAmount:null,perTicketAmount:null,valueBasis:'published_unspecified'});
  }
  if(matches.length!==1)throw Error('Missing or ambiguous '+name);
  awards[name]=matches[0];
 }
 return {game,id:draw.id,date:draw.date,result:draw.result,awards,verification:'OFFICIAL_HTTPS',source_url:URLS[game],checked_at:checkedAt,source_sha256:crypto.createHash('sha256').update(html).digest('hex')};
}
async function collect(previous={},request=fetch){
 const out={schema:'vlt-jackpots-v1',checked_at:new Date().toISOString(),games:{},errors:{}};
 await Promise.all(Object.keys(URLS).map(async g=>{try{
  const r=await request(URLS[g],{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP_'+r.status);
  const b=await r.text();if(b.length>3*1024*1024)throw Error('TOO_LARGE');const record=parse(b,g,out.checked_at);
  const old=previous.games?.[g];if(old&&(+record.id<+old.id||record.date<old.date))throw Error('STALE_SOURCE');
  if(old&&record.id===old.id&&(record.date!==old.date||record.result.join(',')!==old.result.join(',')||JSON.stringify(record.awards)!==JSON.stringify(old.awards)))throw Error('SOURCE_CONFLICT');
  out.games[g]=record;
 }catch(e){if(previous.games?.[g])out.games[g]=previous.games[g];out.errors[g]=String(e.message).slice(0,120);}}));
 return out;
}
module.exports={URLS,amount,parse,collect};
