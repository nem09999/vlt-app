'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),D=require('../lib/data.cjs');
const root=path.resolve(__dirname,'../docs'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const m=JSON.parse(fs.readFileSync(path.join(root,'latest.json')));
if(!/^snapshots\/[a-f0-9]{64}\.json$/.test(m.snapshot))throw Error('Invalid snapshot path');
const sb=fs.readFileSync(path.join(root,m.snapshot));if(hash(sb)!==m.sha256)throw Error('Snapshot hash');
const s=JSON.parse(sb),data=D.validate(s.data),folder=path.join(root,'locks');
if(fs.existsSync(path.join(folder,'index.json'))){
 const index=JSON.parse(fs.readFileSync(path.join(folder,'index.json'))),out=[];
 for(const entry of index.records){
  if(!/^(mega|power)-\d{5}\.json$/.test(entry.file))throw Error('Lock path');
  const raw=fs.readFileSync(path.join(folder,entry.file));if(hash(raw)!==entry.sha256)throw Error('Lock hash');
  const r=JSON.parse(raw),actual=data[r.game].find(x=>x.id===r.target.id);if(!actual)continue;
  if(actual.date!==r.target.date)throw Error('Target schedule exception: needs review');
  const pending=(s.pending_official_records||[]).some(x=>x.game===r.game&&x.id===r.target.id);
  out.push({game:r.game,target_id:r.target.id,lock_sha256:entry.sha256,actual,source_verification:pending?'SECONDARY_SOURCE_PENDING_OFFICIAL':'OFFICIAL_SNAPSHOT',snapshot_sha256:m.sha256,tickets:r.tickets.map(t=>({...t,matches:t.numbers.filter(n=>actual.result.slice(0,6).includes(n)).length,bonus_match:r.game==='power'?t.numbers.includes(actual.result[6]):null})),official_issuance:false});
 }
 fs.writeFileSync(path.join(folder,'evaluations.json'),JSON.stringify({schema:'vlt-lock-evaluations-v1',records:out}));
}
