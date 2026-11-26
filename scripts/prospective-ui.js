const LOCK_API='https://api.github.com/repos/nem09999/vlt-app/actions/runs/';
let viewedLocks={};
async function loadLocks(){
 const host=el('locked-records');host.replaceChildren();text('lock-status','Đang kiểm tra bản khóa trên GitHub…');
 try{
  const res=await fetch(RAW+'locks/index.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error('Chưa có bản khóa trên GitHub (HTTP '+res.status+')');const index=await res.json();
  if(index.schema!=='vlt-lock-index-v1'||!Array.isArray(index.records)||index.records.length>20000)throw Error('Danh mục khóa không hợp lệ');
  const selected=['mega','power'].map(g=>index.records.filter(r=>r.game===g).sort((a,b)=>b.target_date.localeCompare(a.target_date))[0]).filter(Boolean);
  for(const entry of selected){
   if(!/^(mega|power)-\d{5}\.json$/.test(entry.file)||entry.file!==entry.game+'-'+entry.target_id+'.json'||!/^[a-f0-9]{64}$/.test(entry.sha256))throw Error('Đường dẫn bản khóa không hợp lệ');
   const rr=await fetch(RAW+'locks/'+entry.file,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!rr.ok)throw Error('Không đọc được bản khóa');const raw=await rr.text();if(raw.length>100000||await digest(raw)!==entry.sha256)throw Error('Mã kiểm tra bản khóa không khớp');
   const lock=JSON.parse(raw),n=entry.game==='mega'?45:55;
   if(lock.schema!=='vlt-prospective-lock-v1'||lock.mode!=='PROSPECTIVE_RESEARCH'||lock.game!==entry.game||lock.target.id!==entry.target_id||lock.target.date!==entry.target_date||lock.github_run_id!==entry.github_run_id||!Number.isSafeInteger(lock.github_run_id)||!VLTData.validDate(lock.target.date)||!Array.isArray(lock.tickets)||lock.tickets.length!==20||lock.tickets.some(t=>!Array.isArray(t.numbers)||t.numbers.length!==6||new Set(t.numbers).size!==6||t.numbers.some(x=>!Number.isInteger(x)||x<1||x>n)))throw Error('Nội dung khóa không hợp lệ');
   if(!Number.isSafeInteger(lock.github_run_attempt)||lock.github_run_attempt<1)throw Error('Thiếu lần chạy GitHub');const attemptAPI=LOCK_API+lock.github_run_id+'/attempts/'+lock.github_run_attempt;const ar=await fetch(attemptAPI,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!ar.ok)throw Error('Chưa xác nhận được thời gian GitHub (HTTP '+ar.status+')');const run=await ar.json();
   const deadline=Date.parse(lock.target.date+'T17:45:00+07:00'),created=Date.parse(lock.created_at_runner),completed=Date.parse(run.updated_at),started=Date.parse(run.created_at);
   if(Date.parse(lock.target.lock_before)!==deadline||Date.parse(lock.target.draw_at)!==Date.parse(lock.target.date+'T18:00:00+07:00')||!VLTData.validDate(lock.training_cutoff)||lock.training_cutoff>=lock.target.date)throw Error('Hạn khóa hoặc ngày huấn luyện sai');
   if(![deadline,created,completed,started].every(Number.isFinite)||run.repository?.full_name!=='nem09999/vlt-app'||run.path!=='.github/workflows/lock-predictions.yml'||run.status!=='completed'||run.conclusion!=='success'||!(started<=created&&created<=completed&&completed<deadline))throw Error('Chưa có lượt GitHub thành công trước hạn khóa; không công nhận đã khóa');
   const jr=await fetch(attemptAPI+'/jobs',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!jr.ok)throw Error('Chưa đọc được bằng chứng hash trong lượt GitHub');const jobs=await jr.json();
   const binding=(jobs.jobs||[]).find(j=>j.name?.startsWith('Lock SHA256 ')&&j.name.split(' ').includes(entry.sha256)&&j.status==='completed'&&j.conclusion==='success'&&Number.isFinite(Date.parse(j.completed_at))&&Date.parse(j.completed_at)<deadline);
   if(!binding)throw Error('Hash bộ số chưa được ràng buộc với lượt GitHub hoàn tất trước hạn');
   viewedLocks[entry.game]={lock,sha256:entry.sha256};
   const box=document.createElement('section');box.className='panel';const title=document.createElement('h3');title.textContent=names[entry.game]+' · #'+lock.target.id+' · '+lock.target.date;box.append(title);
   const note=document.createElement('p');note.className='sub';note.textContent='Đã lưu trước hạn theo thời gian hoàn tất GitHub: '+new Date(completed).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+'. Dữ liệu đến '+lock.training_cutoff+'. Kỳ dự kiến theo lịch định kỳ; ngoại lệ lịch cần đối chiếu. Đây là thử nghiệm nghiên cứu, không phải cam kết trúng thưởng.';box.append(note);
   for(const t of lock.tickets){const row=document.createElement('p');row.textContent=t.method+': '+t.numbers.map(x=>String(x).padStart(2,'0')).join(' – ');box.append(row);}
   for(const [label,type]of [['Tải bộ đã khóa CSV','csv'],['Tải receipt khóa JSON','json']]){const b=document.createElement('button');b.className='secondary';b.textContent=label;b.onclick=()=>exportLocked(entry.game,type);box.append(b);}
   const link=document.createElement('a');link.href='https://github.com/nem09999/vlt-app/actions/runs/'+lock.github_run_id;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' Xem bằng chứng GitHub';box.append(link);host.append(box);
  }
  text('lock-status',selected.length?'Các bản dưới đây được kiểm tra hash và lượt GitHub hoàn tất trước hạn 17:45 giờ Việt Nam. Không tạo lại bộ số khi bấm xem.':'Chưa có bản khóa hợp lệ.');
  try{const er=await fetch(RAW+'locks/evaluations.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});if(er.ok){const e=await er.json();if(e.schema==='vlt-lock-evaluations-v1')for(const r of e.records||[]){const v=viewedLocks[r.game];if(v&&v.lock.target.id===r.target_id&&v.sha256===r.lock_sha256){const p=document.createElement('p');p.className='notice';p.textContent=names[r.game]+' #'+r.target_id+' đã có kết quả: '+r.actual.result.join(' – ')+'. Số chính trùng cao nhất trong 20 bộ: '+Math.max(...r.tickets.map(t=>t.matches))+'/6. Nguồn đối chiếu: '+r.source_verification+'.';host.append(p);}}}}catch{}
 }catch(e){text('lock-status','Chưa xác nhận bản khóa: '+e.message+'. Bản chạy thử lịch sử vẫn dùng được.');}
}
function exportLocked(game,type){const item=viewedLocks[game];if(!item)return;const r=item.lock;if(type==='json')blobDownload(JSON.stringify({lock:r,sha256:item.sha256,hash_scope:'canonical JSON bytes in GitHub record'},null,2),'VLT_KHOA_'+game+'_'+r.target.id+'.json','application/json');else blobDownload('\uFEFF'+['mode,game,target_id,target_date,method,n1,n2,n3,n4,n5,n6,seed',...r.tickets.map(t=>[r.mode,game,r.target.id,r.target.date,t.method,...t.numbers,r.seed].join(','))].join('\r\n'),'VLT_KHOA_'+game+'_'+r.target.id+'.csv','text/csv;charset=utf-8');}
loadLocks();
