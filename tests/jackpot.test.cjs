'use strict';
const {test}=require('node:test'),A=require('node:assert/strict'),fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const J=require('../lib/jackpot.cjs'),D=require('../lib/data.cjs');
const fixture=g=>fs.readFileSync(__dirname+'/fixtures/'+g+'-jackpot.html','utf8');
const checked='2026-11-28T04:37:00.000Z',record=g=>J.parse(fixture(g),g,checked);
test('official Mega latest six and zero winners',()=>{const r=record('mega');A.deepEqual(r.result,[5,23,27,35,38,45]);A.equal(r.id,'01594');A.equal(r.awards.Jackpot.winners,0);A.equal(r.awards.Jackpot.publishedAmount,24014533000);A.equal(r.awards.Jackpot.perTicketAmount,null);});
test('official Power six plus distinct special, two jackpots',()=>{const r=record('power');A.deepEqual(r.result,[14,18,24,28,34,55,32]);A.equal(r.id,'01429');A.equal(r.awards['Jackpot 1'].winners,0);A.equal(r.awards['Jackpot 2'].winners,1);A.equal(r.awards['Jackpot 2'].publishedAmount,3992642500);});
test('multiple winners preserved without dividing prize',()=>{const s=fixture('mega').replace(/(<td[^>]*>\s*)0(\s*<\/td>)/,'$1'+'3'+'$2');const r=J.parse(s,'mega',checked);A.equal(r.awards.Jackpot.winners,3);A.equal(r.awards.Jackpot.perTicketAmount,null);});
test('missing/duplicate/negative/noninteger winner schema rejected',()=>{const s=fixture('mega');for(const value of ['','-1','1.5','Chưa xác minh'])A.throws(()=>J.parse(s.replace(/(<td[^>]*>\s*)0(\s*<\/td>)/,'$1'+value+'$2'),'mega',checked));A.throws(()=>J.parse(s+s.match(/<tr[\s\S]*?<\/tr>/)[0],'mega',checked));A.throws(()=>J.parse(s.replace('Jackpot','Other'),'mega',checked));});
test('amount validation never coerces unknown into zero',()=>{for(const s of ['', '0','null','12.34','-1.000','1e9'])A.equal(J.amount(s),null);A.equal(J.amount('3.992.642.500 đ'),3992642500);});
test('future draw/date and wrong game rejected',()=>{A.throws(()=>J.parse(fixture('mega'),'mega','2026-11-20T00:00:00Z'));A.throws(()=>J.parse(fixture('mega'),'power',checked));});
test('source error retains exact previous good games',async()=>{const prior={games:{mega:record('mega'),power:record('power')}};const out=await J.collect(prior,async()=>({ok:false,status:403}));A.deepEqual(out.games,prior.games);A.equal(out.errors.mega,'HTTP_403');});
test('collector success checks both official source URLs and source hashes',async()=>{const out=await J.collect({},async(u,o)=>{A.equal(o.redirect,'error');const g=u.endsWith('645')?'mega':'power';return {ok:true,text:async()=>fixture(g)};});A.equal(Object.keys(out.games).length,2);A.deepEqual(out.errors,{});A.equal(out.games.mega.source_sha256,crypto.createHash('sha256').update(fixture('mega')).digest('hex'));});
test('conflicting official publication preserves prior and records error',async()=>{const prior={games:{mega:record('mega')}};const out=await J.collect(prior,async u=>({ok:true,text:async()=>u.endsWith('645')?fixture('mega').replace('24.014.533.000','25.014.533.000'):fixture('power')}));A.deepEqual(out.games.mega,prior.games.mega);A.equal(out.errors.mega,'SOURCE_CONFLICT');});
test('existing algorithm, data, UI logic and prospective scripts byte-identical',()=>{const baseline=require('./fixtures/baseline-script-hashes.json'),now=fs.readFileSync(__dirname+'/../docs/index.html','utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');const scripts=Array.from(now.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g),m=>m[1]);A.equal(scripts.length,8);for(let i=0;i<6;i++)A.equal(hash(scripts[i].replace(/\r\n/g,'\n')),baseline.inline_scripts[i],'baseline inline script '+i);for(const [f,h]of Object.entries(baseline.files))A.equal(hash(fs.readFileSync(__dirname+'/../'+f,'utf8').replace(/\r\n/g,'\n')),h);A.equal(now.split('/* v2.1.0-jackpot:').length-1,1);});
test('bundled official evidence matches the published fixture records',()=>{
 const html=fs.readFileSync(__dirname+'/../docs/index.html','utf8');
 const bundled=JSON.parse(html.match(/id="jackpot-data">([\s\S]*?)<\/script>/)[1]);
 for(const game of ['mega','power']){
  const draw=bundled.games[game];
  const expected=record(game);
  D.row(game,draw);
  for(const key of ['id','date','result','awards','source_url','verification'])A.deepEqual(draw[key],expected[key],game+' '+key);
 }
 A.equal(bundled.games.power.awards['Jackpot 2'].winners,1);
});
