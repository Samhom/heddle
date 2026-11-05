export const LIMITS = Object.freeze({
  ends: Object.freeze({min: 4, max: 80}),
  picks: Object.freeze({min: 4, max: 80}),
  shafts: Object.freeze({min: 2, max: 8}),
  treadles: Object.freeze({min: 2, max: 8})
});

function requireCount(value, label, limits) {
  if (!Number.isInteger(value) || value < limits.min || value > limits.max) {
    throw new Error(`${label}要在 ${limits.min} 和 ${limits.max} 之间`);
  }
  return value;
}

export function createDraft({ends, picks, shafts, treadles, threading, tieUp, treadling}) {
  const spec = {
    ends: requireCount(ends, '经线', LIMITS.ends),
    picks: requireCount(picks, '纬线', LIMITS.picks),
    shafts: requireCount(shafts, '综片', LIMITS.shafts),
    treadles: requireCount(treadles, '踏板', LIMITS.treadles)
  };
  if (!Array.isArray(threading) || threading.length !== spec.ends) {
    throw new Error('经线根数和穿综对不上');
  }
  if (!Array.isArray(treadling) || treadling.length !== spec.picks) {
    throw new Error('纬线梭数和踏板对不上');
  }
  if (!Array.isArray(tieUp) || tieUp.length !== spec.shafts) {
    throw new Error('打结的综片数不对');
  }
  return {
    ...spec,
    threading: threading.map((value, index) => {
      if (!Number.isInteger(value) || value < 0 || value >= spec.shafts) {
        throw new Error(`第 ${index + 1} 根经没有落在综片上`);
      }
      return value;
    }),
    treadling: treadling.map((value, index) => {
      if (!Number.isInteger(value) || value < 0 || value >= spec.treadles) {
        throw new Error(`第 ${index + 1} 梭没有落在踏板上`);
      }
      return value;
    }),
    tieUp: tieUp.map((row, shaft) => {
      if (!Array.isArray(row) || row.length !== spec.treadles) {
        throw new Error(`第 ${shaft + 1} 片综的结数不对`);
      }
      return row.map((cell) => {
        if (typeof cell !== 'boolean') throw new Error('结只能是开或关');
        return cell;
      });
    })
  };
}

export function warpUp(draft) {
  const grid = [];
  for (let pick = 0; pick < draft.picks; pick += 1) {
    const treadle = draft.treadling[pick];
    const row = [];
    for (let end = 0; end < draft.ends; end += 1) {
      row.push(draft.tieUp[draft.threading[end]][treadle]);
    }
    grid.push(row);
  }
  return grid;
}

function requireIndex(value, max, label) {
  if (!Number.isInteger(value) || value < 0 || value >= max) {
    throw new Error(`${label}不在这张图上`);
  }
  return value;
}

export function editCell(draft, {grid, row, col}) {
  if (grid === 'threading') {
    const shaft = draft.shafts - 1 - requireIndex(row, draft.shafts, '综片');
    const end = requireIndex(col, draft.ends, '经线');
    const threading = draft.threading.slice();
    threading[end] = shaft;
    return createDraft({...draft, threading});
  }
  if (grid === 'tie') {
    const shaft = draft.shafts - 1 - requireIndex(row, draft.shafts, '综片');
    const treadle = requireIndex(col, draft.treadles, '踏板');
    const tieUp = draft.tieUp.map((line) => line.slice());
    tieUp[shaft][treadle] = !tieUp[shaft][treadle];
    return createDraft({...draft, tieUp});
  }
  if (grid === 'treadling') {
    const pick = requireIndex(row, draft.picks, '纬线');
    const treadle = requireIndex(col, draft.treadles, '踏板');
    const treadling = draft.treadling.slice();
    treadling[pick] = treadle;
    return createDraft({...draft, treadling});
  }
  throw new Error('没有这一格');
}

export function resize(draft, patch) {
  const ends = patch.ends === undefined ? draft.ends : requireCount(patch.ends, '经线', LIMITS.ends);
  const picks = patch.picks === undefined ? draft.picks : requireCount(patch.picks, '纬线', LIMITS.picks);
  const shafts = patch.shafts === undefined ? draft.shafts : requireCount(patch.shafts, '综片', LIMITS.shafts);
  const treadles = patch.treadles === undefined ? draft.treadles : requireCount(patch.treadles, '踏板', LIMITS.treadles);
  const threadingBase = draft.threading.map((value) => Math.min(value, shafts - 1));
  const treadlingBase = draft.treadling.map((value) => Math.min(value, treadles - 1));
  return createDraft({
    ends,
    picks,
    shafts,
    treadles,
    threading: Array.from({length: ends}, (_, index) => threadingBase[index % threadingBase.length]),
    treadling: Array.from({length: picks}, (_, index) => treadlingBase[index % treadlingBase.length]),
    tieUp: Array.from({length: shafts}, (_, shaft) => (
      Array.from({length: treadles}, (_, treadle) => (
        shaft < draft.shafts && treadle < draft.treadles ? draft.tieUp[shaft][treadle] : false
      ))
    ))
  });
}

export function warpFace(draft) {
  const grid = warpUp(draft);
  let up = 0;
  for (const row of grid) {
    for (const cell of row) if (cell) up += 1;
  }
  const total = draft.ends * draft.picks;
  return {up, total, percent: Math.round((up / total) * 100)};
}
