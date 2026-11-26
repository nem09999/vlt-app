const RAW='https://raw.githubusercontent.com/nem09999/vlt-app/main/docs/';let syncing=false;
function secondaryMeta(snapshot){
 const records=Array.isArray(snapshot?.pending_official_records)?snapshot.pending_official_records.filter(r=>r&&['mega','power'].includes(r.game)&&/^\d{5}$/.test(r.id)&&VLTData.validDate(r.date)).map(r=>({game:r.game,id:r.id,date:r.date,provider:'MINH_NGOC',verification:'SECONDARY_SOURCE_PENDING_OFFICIAL'})):[];
 return {isSecondary:records.length>0||snapshot?.trust==='SECONDARY_SOURCE_PENDING_OFFICIAL'||snapshot?.provenance?.verification==='SECONDARY_SOURCE_PENDING_OFFICIAL',records,provenance:snapshot?.provenance||null};
}
function attachSecondary(target,snapshot){const meta=secondaryMeta(snapshot);if(meta.isSecondary){target.trust='SECONDARY_SOURCE_PENDING_OFFICIAL';target.pending_official_records=meta.records;target.provenance=meta.provenance;}return meta.isSecondary;}
function cacheActive(){save(STORE,{schema:'vlt-offline-snapshot-v2',cache_schema:'vlt-snapshot-cache-v1',data:active.data,source_name:active.source_name,trust:active.trust,provenance:active.provenance||null,pending_official_records:active.pending_official_records||[]});}
function showSecondary(){if(active.trust==='SECONDARY_SOURCE_PENDING_OFFICIAL'){text('data-trust','Có dữ liệu Minh Ngọc · chờ Vietlott đối chiếu');text('source-info',JSON.stringify({source:active.provenance,pending_official_records:active.pending_official_records||[],verification:'SECONDARY_SOURCE_PENDING_OFFICIAL',official_issuance:false},null,2));}}
const baseUpdateCards=updateCards;updateCards=function(){baseUpdateCards();showSecondary();};
function restoreSecondaryCache(){try{const stored=JSON.parse(localStorage.getItem(STORE)||'null');if(stored?.data&&stored.cache_schema==='vlt-snapshot-cache-v1'&&JSON.stringify(VLTData.validate(stored.data))===JSON.stringify(active.data))attachSecondary(active,stored);}catch{}showSecondary();}
const baseReadStored=readStored;readStored=function(){baseReadStored();restoreSecondaryCache();};
const baseReadImport=readImport;readImport=async function(input){await baseReadImport(input);if(!pending)return;try{const f=input.files?.[0];if(!f||/\.html?$/i.test(f.name))return;const parsed=JSON.parse((await f.text()).replace(/^\uFEFF/,''));attachSecondary(pending,parsed);}catch{}};
const baseApplyImport=applyImport;applyImport=function(){baseApplyImport();if(active.trust==='SECONDARY_SOURCE_PENDING_OFFICIAL')cacheActive();showSecondary();};
exportSnapshot=function(){blobDownload(JSON.stringify({schema:'vlt-offline-snapshot-v2',source_name:active.source_name,trust:active.trust,provenance:active.provenance||null,pending_official_records:active.pending_official_records||[],exported_at_device:new Date().toISOString(),official_issuance:false,data:active.data},null,2),'VLT_snapshot_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json','application/json');};
restoreSecondaryCache();
async function syncOnline(manual=false){
 if(syncing)return;syncing=true;
 try{
  const res=await fetch(RAW+'latest.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('manifest HTTP '+res.status);const m=await res.json();
  if(m.schema!=='vlt-manifest-v1'||!/^snapshots\/[a-f0-9]{64}\.json$/.test(m.snapshot)||!/^[a-f0-9]{64}$/.test(m.sha256)||m.snapshot!=='snapshots/'+m.sha256+'.json')throw Error('Manifest không hợp lệ');
  const sr=await fetch(RAW+m.snapshot,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!sr.ok)throw Error('snapshot HTTP '+sr.status);const source=await sr.text();if(source.length>5*1024*1024)throw Error('Snapshot quá lớn');if(await digest(source)!==m.sha256)throw Error('Hash snapshot không khớp');
  const parsed=VLTData.parsePackage(source,active.data),data=parsed.data,snapshotInfo=JSON.parse(source);
  active={data,source_name:'Snapshot GitHub đã kiểm tra hash '+m.sha256.slice(0,12),trust:'BUNDLED_OFFICIAL_DELTA',provenance:snapshotInfo.provenance||null,pending_official_records:[]};attachSecondary(active,snapshotInfo);
  if(parsed.diff.added>0){last=null;el('result-panel').style.display='none';}
  cacheActive();updateCards();if(active.trust!=='SECONDARY_SOURCE_PENDING_OFFICIAL')text('data-trust','Snapshot GitHub · đã kiểm tra hash');text('asof',new Date(m.updated_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour12:false}));
  const summary='Snapshot: Mega đến '+data.mega.at(-1).date+'; Power đến '+data.power.at(-1).date+'. '+(parsed.diff.added?'Đã thêm '+parsed.diff.added+' kỳ.':'Không có snapshot mới hơn.');text('online-status',summary);
  try{const ss=await fetch(RAW+'source-status.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});if(ss.ok){const state=await ss.json();if(state.schema==='vlt-source-status-v1'&&state.status==='SOURCE_FAILED_KEEP_PREVIOUS')text('online-status',summary+' Lượt thu thập gần nhất thất bại ('+String(state.error_code||'SOURCE_ERROR')+'); dữ liệu nguồn mới hơn chưa được xác nhận.');else if(state.schema==='vlt-source-status-v1')text('online-status',summary+' Lần kiểm tra nguồn: '+String(state.checked_at||'')+(state.provider==='MINH_NGOC'?' · Xổ Số Minh Ngọc (nguồn tổng hợp, Vietlott hiện chưa truy cập được).':''));}}catch{}
 }catch(e){text('online-status','Giữ dữ liệu hiện có. Chưa tải được snapshot mới: '+e.message+'. Khi offline, dữ liệu chỉ mới đến cutoff ghi trên thẻ.');}finally{syncing=false;}
}
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
syncOnline();
