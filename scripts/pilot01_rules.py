"""Reviewed selection rules from the owner-supplied PILOT-01; NumPy version pinned."""
import math
import numpy as np
METHODS = ('random', 'balanced', 'frequency', 'decay')
VERSION = 'pilot02-prospective-numpy-1.0.0'
SEED = 73100
TRAIN = 156

def selections(rng, n, counts, weight, method):
    prob = counts / counts.sum() if method == 'frequency' else weight / weight.sum() if method == 'decay' else None
    tickets = set()
    attempts = 0
    while len(tickets) < 5:
        attempts += 1
        if attempts > 100000:
            raise ValueError('Unable to generate five tickets')
        ticket = tuple(sorted(int(v) for v in rng.choice(np.arange(1, n + 1), 6, replace=False, p=prob)))
        if method == 'balanced' and (sum(v % 2 == 0 for v in ticket) != 3 or not 2 <= sum(v <= n // 2 for v in ticket) <= 4):
            continue
        tickets.add(ticket)
    return sorted(tickets)

def predict_next(rows, game):
    if np.__version__ != '2.3.5':
        raise ValueError('NumPy 2.3.5 required')
    n = {'mega': 45, 'power': 55}[game]
    if len(rows) < TRAIN:
        raise ValueError('Insufficient history')
    rng = np.random.default_rng(SEED)
    counts, weight = np.ones(n), np.ones(n)
    # Advance the historical RNG stream exactly as in PILOT-01, without rerunning metrics.
    for i, row in enumerate(rows):
        if i >= TRAIN:
            for method in METHODS:
                selections(rng, n, counts, weight, method)
        ix = np.array(row['result'][:6], dtype=int) - 1
        counts[ix] += 1
        weight = 1 + (weight - 1) * math.exp(-math.log(2) / 60)
        weight[ix] += 1
    return {method: selections(rng, n, counts, weight, method) for method in METHODS}
