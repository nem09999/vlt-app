"""Create-only research predictions; no purchases, no tokens or private source paths."""
import csv, hashlib, io, json, os, re, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from pilot01_rules import predict_next, VERSION, SEED

UTC = timezone.utc
VN = timezone(timedelta(hours=7))
DAYS = {'mega': {2, 4, 6}, 'power': {1, 3, 5}}
SCHEDULE = {'mega': 'https://vietlott.vn/vi/choi/mega-6-45/cach-choi', 'power': 'https://vietlott.vn/vi/choi/power-6-55/cach-choi'}
ROOT = Path(__file__).resolve().parents[1]
def canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
def sha(data):
    return hashlib.sha256(data).hexdigest()
def iso(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))
def target_for(last, game):
    day = datetime.fromisoformat(last['date']).date() + timedelta(days=1)
    while day.weekday() not in DAYS[game]:
        day += timedelta(days=1)
    return {'id': f"{int(last['id']) + 1:05d}", 'date': day.isoformat(), 'draw_at': datetime.combine(day, datetime.min.time(), VN).replace(hour=18).isoformat(), 'lock_before': datetime.combine(day, datetime.min.time(), VN).replace(hour=17, minute=45).isoformat(), 'schedule_basis': 'OFFICIAL_RECURRING_SCHEDULE_EXCEPTION_NOT_CONFIRMED', 'schedule_source': SCHEDULE[game]}
def create_record(snapshot, snapshot_sha, game, now, run_id):
    rows = snapshot['data'][game]
    if any(datetime.combine(datetime.fromisoformat(row['date']).date(), datetime.min.time(), VN).replace(hour=18, minute=30) > now for row in rows):
        raise ValueError('Training result is before conservative draw completion at 18:30 Vietnam')
    target = target_for(rows[-1], game)
    if now >= iso(target['lock_before']):
        raise ValueError('Past cutoff or missing latest result; do not skip draw')
    if iso(snapshot['updated_at']) > now:
        raise ValueError('Future snapshot timestamp')
    if snapshot.get('pending_official_records'):
        raise ValueError('Pending official reconciliation; no new lock')
    chosen = predict_next(rows, game)
    return {'schema': 'vlt-prospective-lock-v1', 'mode': 'PROSPECTIVE_RESEARCH', 'model_version': VERSION, 'game': game, 'target': target, 'created_at_runner': now.isoformat(), 'seed': SEED, 'numpy': '2.3.5', 'training_rows': len(rows), 'training_cutoff': rows[-1]['date'], 'snapshot_sha256': snapshot_sha, 'source_policy': 'OFFICIAL_SNAPSHOT_NO_PENDING_RECORDS', 'pilot01_script_sha256': '18a45d4683c2c35424f6a92f6ccde77f50001fe510439c584388232591ab9bde', 'tickets': [{'method': m, 'numbers': list(t)} for m, tickets in chosen.items() for t in tickets], 'github_run_id': run_id, 'github_run_attempt': int(os.environ.get('GITHUB_RUN_ATTEMPT', '1')), 'timestamp_policy': 'CHECK_GITHUB_SUCCESS_AND_COMPLETED_AT_BEFORE_CUTOFF', 'official_issuance': False, 'advantage_claim': False}
def run(root=ROOT, now=None):
    now = now or datetime.now(UTC)
    if os.environ.get('GITHUB_REPOSITORY') != 'nem09999/vlt-app' or not re.fullmatch(r'\d+', os.environ.get('GITHUB_RUN_ID', '')):
        raise ValueError('Creation requires the approved GitHub repository run')
    docs = root / 'docs'
    manifest = json.loads((docs / 'latest.json').read_text('utf-8'))
    if not re.fullmatch(r'snapshots/[a-f0-9]{64}\.json', manifest['snapshot']):
        raise ValueError('Invalid snapshot path')
    raw = (docs / manifest['snapshot']).read_bytes()
    if sha(raw) != manifest['sha256']:
        raise ValueError('Snapshot integrity failed')
    snapshot = json.loads(raw)
    # Reuse strict JS structural, range, chronology and consecutive-ID validation.
    import subprocess
    subprocess.run(['node', '-e', "const fs=require('fs'),D=require('./lib/data.cjs');D.validate(JSON.parse(fs.readFileSync(process.argv[1])).data)", str(docs / manifest['snapshot'])], cwd=root, check=True)
    status = json.loads((docs / 'source-status.json').read_text('utf-8'))
    checked = iso(status['checked_at'])
    if status.get('status') not in ('UPDATED', 'VERIFIED_NO_CHANGE', 'SECONDARY_CHECKED_NO_CHANGE') or status.get('snapshot_sha256') != manifest['sha256'] or not timedelta(0) <= now - checked <= timedelta(hours=12):
        raise ValueError('No recent successful source check for this snapshot')
    folder = docs / 'locks'
    folder.mkdir(exist_ok=True)
    index_path = folder / 'index.json'
    index = json.loads(index_path.read_text('utf-8')) if index_path.exists() else {'schema': 'vlt-lock-index-v1', 'records': []}
    added = 0
    for game in DAYS:
        target = target_for(snapshot['data'][game][-1], game)
        name = game + '-' + target['id']
        file = folder / (name + '.json')
        existing = next((r for r in index['records'] if r['game'] == game and r['target_id'] == target['id']), None)
        if existing:
            if existing['file'] != name + '.json' or not file.exists() or sha(file.read_bytes()) != existing['sha256']:
                raise ValueError('Existing lock changed or missing; stop')
            continue
        if file.exists():
            raise ValueError('Unindexed lock exists; do not overwrite')
        try:
            record = create_record(snapshot, manifest['sha256'], game, now, int(os.environ['GITHUB_RUN_ID']))
        except ValueError as error:
            print('LOCK_BLOCKED', game, str(error))
            continue
        body = canonical(record)
        with file.open('xb') as stream:
            stream.write(body)
        csv_buffer = io.StringIO(newline='')
        writer = csv.writer(csv_buffer)
        writer.writerow(['mode', 'game', 'target_id', 'target_date', 'method', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'seed', 'snapshot_sha256'])
        for ticket in record['tickets']:
            writer.writerow([record['mode'], game, target['id'], target['date'], ticket['method'], *ticket['numbers'], SEED, manifest['sha256']])
        with (folder / (name + '.csv')).open('x', encoding='utf-8-sig', newline='') as stream:
            stream.write(csv_buffer.getvalue())
        index['records'].append({'game': game, 'target_id': target['id'], 'target_date': target['date'], 'file': file.name, 'sha256': sha(body), 'github_run_id': record['github_run_id']})
        added += 1
        print('LOCK_SHA256', file.name, sha(body))
    index['records'].sort(key=lambda r: (r['target_date'], r['game']))
    # A bot commit publishes records, CSV and index together; failure publishes none.
    if added:
        temporary = folder / 'index.json.new'
        temporary.write_bytes(canonical(index))
        temporary.replace(index_path)
    print('LOCKS_ADDED', added)
    if os.environ.get('GITHUB_OUTPUT'):
        target_ids={(game,target_for(snapshot['data'][game][-1],game)['id']) for game in DAYS}
        bindings=[r['sha256'] for r in index['records'] if (r['game'],r['target_id']) in target_ids]
        if any(not re.fullmatch(r'[a-f0-9]{64}',value) for value in bindings):
            raise ValueError('Invalid binding hash')
        with open(os.environ['GITHUB_OUTPUT'],'a',encoding='utf-8') as output:
            output.write('binding='+' '.join(bindings)+'\n')

if __name__ == '__main__':
    run()
