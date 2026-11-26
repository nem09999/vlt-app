const RAW='https://raw.githubusercontent.com/nem09999/vlt-app/main/docs/';let syncing=false;
async function syncOnline(manual=false){
 if(syncing)return;syncing=true;
 try{
  const res=await fetch(RAW+'latest.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('manifest HTTP '+res.status);const m=await res.json();
  if(m.schema!=='vlt-manifest-v1'||!/^snapshots\/[a-f0-9]{64}\.json$/.test(m.snapshot)||!/^[a-f0-9]{64}$/.test(m.sha256)||m.snapshot!=='snapshots/'+m.sha256+'.json')throw Error('Manifest không hợp lệ');
  const sr=await fetch(RAW+m.snapshot,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!sr.ok)throw Error('snapshot HTTP '+sr.status);const source=await sr.text();if(source.length>5*1024*1024)throw Error('Snapshot quá lớn');if(await digest(source)!==m.sha256)throw Error('Hash snapshot không khớp');
  const parsed=VLTData.parsePackage(source,active.data),data=parsed.data,snapshotInfo=JSON.parse(source);
  active={data,source_name:'Snapshot GitHub đã kiểm tra hash '+m.sha256.slice(0,12),trust:'BUNDLED_OFFICIAL_DELTA'};
  if(parsed.diff.added>0){last=null;el('result-panel').style.display='none';}
  save(STORE,{data,source_name:'Bản cache từ snapshot GitHub '+m.updated_at});updateCards();text('data-trust','Snapshot GitHub · đã kiểm tra hash');text('asof',new Date(m.updated_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour12:false}));
  if(snapshotInfo.pending_official_records?.length){text('data-trust','Có dữ liệu Minh Ngọc · chờ Vietlott đối chiếu');text('source-info',JSON.stringify({source:snapshotInfo.provenance,pending_official_records:snapshotInfo.pending_official_records,official_issuance:false},null,2));}
  const summary='Snapshot: Mega đến '+data.mega.at(-1).date+'; Power đến '+data.power.at(-1).date+'. '+(parsed.diff.added?'Đã thêm '+parsed.diff.added+' kỳ.':'Không có snapshot mới hơn.');text('online-status',summary);
  try{const ss=await fetch(RAW+'source-status.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});if(ss.ok){const state=await ss.json();if(state.schema==='vlt-source-status-v1'&&state.status==='SOURCE_FAILED_KEEP_PREVIOUS')text('online-status',summary+' Lượt thu thập gần nhất thất bại ('+String(state.error_code||'SOURCE_ERROR')+'); dữ liệu nguồn mới hơn chưa được xác nhận.');else if(state.schema==='vlt-source-status-v1')text('online-status',summary+' Lần kiểm tra nguồn: '+String(state.checked_at||'')+(state.provider==='MINH_NGOC'?' · Xổ Số Minh Ngọc (nguồn tổng hợp, Vietlott hiện chưa truy cập được).':''));}}catch{}
 }catch(e){text('online-status','Giữ dữ liệu hiện có. Chưa tải được snapshot mới: '+e.message+'. Khi offline, dữ liệu chỉ mới đến cutoff ghi trên thẻ.');}finally{syncing=false;}
}
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
syncOnline();
