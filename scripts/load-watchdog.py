"""Run the approved one-minute localhost trial with a 10-second sustained-error guard."""
import json
import math
import pathlib
import subprocess
import time
from collections import defaultdict

root = pathlib.Path(__file__).resolve().parent.parent
raw = root / 'evidence/raw/load.jsonl'
raw.parent.mkdir(parents=True, exist_ok=True)
raw.write_text('')
log = open(root / 'evidence/load-console.txt', 'w')
process = subprocess.Popen(['k6', 'run', '--out', f'json={raw}', '--summary-export',
    str(root / 'evidence/load-summary.json'), 'scripts/load.js'], cwd=root, stdout=log, stderr=subprocess.STDOUT)
buckets = defaultdict(lambda: {'duration': [], 'failed': []})
consecutive = 0
last_second = int(time.time()) - 1
aborted = False
with raw.open() as stream:
    while process.poll() is None:
        time.sleep(1)
        for line in stream:
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get('type') != 'Point':
                continue
            metric = event.get('metric')
            if metric not in ('http_req_duration', 'http_req_failed'):
                continue
            from datetime import datetime
            second = int(datetime.fromisoformat(event['data']['time'].replace('Z', '+00:00')).timestamp())
            field = 'duration' if metric == 'http_req_duration' else 'failed'
            buckets[second][field].append(event['data']['value'])
        completed_second = int(time.time()) - 2
        for second in range(last_second + 1, completed_second + 1):
            bucket = buckets.pop(second, {'duration': [], 'failed': []})
            durations = sorted(bucket['duration'])
            errors = bucket['failed']
            p95 = durations[math.ceil(len(durations) * 0.95) - 1] if durations else 0
            error_rate = sum(errors) / len(errors) if errors else 0
            consecutive = consecutive + 1 if p95 > 2000 or error_rate > 0.05 else 0
            if consecutive >= 10:
                process.terminate()
                aborted = True
                break
        last_second = completed_second
exit_code = process.wait()
log.close()
(root / 'evidence/load-guard.json').write_text(json.dumps({'aborted': aborted, 'exitCode': exit_code,
    'rule': 'one-second buckets exceeding 5% errors or p95 2000ms for 10 consecutive seconds'}, indent=2))
raise SystemExit(exit_code or (1 if aborted else 0))
