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

export function warpFace(draft) {
  const grid = warpUp(draft);
  let up = 0;
  for (const row of grid) {
    for (const cell of row) if (cell) up += 1;
  }
  const total = draft.ends * draft.picks;
  return {up, total, percent: Math.round((up / total) * 100)};
}
