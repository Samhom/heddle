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

export function invertShed(draft) {
  return createDraft({
    ...draft,
    tieUp: draft.tieUp.map((row) => row.map((cell) => !cell))
  });
}

export function reverseTreadling(draft) {
  return createDraft({
    ...draft,
    treadling: draft.treadling.slice().reverse()
  });
}

export function reverseThreading(draft) {
  return createDraft({
    ...draft,
    threading: draft.threading.slice().reverse()
  });
}

function roll(values) {
  return values.slice(1).concat(values[0]);
}

export function rollThreading(draft) {
  return createDraft({...draft, threading: roll(draft.threading)});
}

export function rollTreadling(draft) {
  return createDraft({...draft, treadling: roll(draft.treadling)});
}

function straightSequence(length, count) {
  return Array.from({length}, (_, index) => index % count);
}

function pointedSequence(length, count) {
  const unit = [];
  for (let index = 0; index < count; index += 1) unit.push(index);
  for (let index = count - 2; index >= 1; index -= 1) unit.push(index);
  return Array.from({length}, (_, index) => unit[index % unit.length]);
}

export function straightThreading(draft) {
  return createDraft({...draft, threading: straightSequence(draft.ends, draft.shafts)});
}

export function pointedThreading(draft) {
  return createDraft({...draft, threading: pointedSequence(draft.ends, draft.shafts)});
}

export function tabbyTie(draft) {
  return createDraft({
    ...draft,
    tieUp: draft.tieUp.map((row, shaft) => row.map((_, treadle) => shaft % 2 === treadle % 2))
  });
}

export function twillTie(draft) {
  return createDraft({
    ...draft,
    tieUp: draft.tieUp.map((row, shaft) => row.map((_, treadle) => {
      const step = treadle % draft.shafts;
      return shaft === step || shaft === (step + 1) % draft.shafts;
    }))
  });
}

export function treadleAsDrawn(draft) {
  return createDraft({
    ...draft,
    treadling: Array.from({length: draft.picks}, (_, index) => {
      const shaft = draft.threading[index % draft.ends];
      return shaft < draft.treadles ? shaft : draft.treadles - 1;
    })
  });
}

export function turnDraft(draft) {
  return createDraft({
    ends: draft.picks,
    picks: draft.ends,
    shafts: draft.treadles,
    treadles: draft.shafts,
    threading: draft.treadling.slice(),
    treadling: draft.threading.slice(),
    tieUp: Array.from({length: draft.treadles}, (_, shaft) => (
      Array.from({length: draft.shafts}, (_, treadle) => draft.tieUp[treadle][shaft])
    ))
  });
}

export function loomNotes(draft) {
  const notes = [];
  const usedShafts = new Set(draft.threading);
  const emptyShafts = [];
  for (let shaft = 0; shaft < draft.shafts; shaft += 1) {
    if (!usedShafts.has(shaft)) emptyShafts.push(shaft + 1);
  }
  if (emptyShafts.length > 0) notes.push(`第 ${emptyShafts.join('、')} 片综没有经`);
  const usedTreadles = new Set(draft.treadling);
  const idle = [];
  const dead = [];
  for (let treadle = 0; treadle < draft.treadles; treadle += 1) {
    if (!usedTreadles.has(treadle)) {
      idle.push(treadle + 1);
      continue;
    }
    let lifts = false;
    for (const row of draft.tieUp) {
      if (row[treadle]) {
        lifts = true;
        break;
      }
    }
    if (!lifts) dead.push(treadle + 1);
  }
  if (idle.length > 0) notes.push(`第 ${idle.join('、')} 个踏板没有梭`);
  if (dead.length > 0) notes.push(`第 ${dead.join('、')} 个踏板一块综都没提`);
  return notes;
}

export function balanceNote(draft) {
  const counts = Array.from({length: draft.shafts}, () => 0);
  for (const shaft of draft.threading) counts[shaft] += 1;
  const used = counts.filter((count) => count > 0);
  if (used.length < 2) return '';
  const most = Math.max(...used);
  const least = Math.min(...used);
  if (most <= least * 2) return '';
  const heavy = [];
  const light = [];
  counts.forEach((count, shaft) => {
    if (count === most) heavy.push(shaft + 1);
    if (count > 0 && count === least) light.push(shaft + 1);
  });
  return `第 ${heavy.join('、')} 片综穿了 ${most} 根，第 ${light.join('、')} 片只穿了 ${least} 根`;
}

export function fullLiftNote(draft) {
  const used = new Set(draft.treadling);
  const full = [];
  for (let treadle = 0; treadle < draft.treadles; treadle += 1) {
    if (!used.has(treadle)) continue;
    if (draft.tieUp.every((row) => row[treadle])) full.push(treadle + 1);
  }
  if (full.length === 0) return '';
  return `第 ${full.join('、')} 个踏板把综全提起来了，这一梭没有梭口`;
}

export function stuckShaftNote(draft) {
  const usedShafts = new Set(draft.threading);
  const usedTreadles = [...new Set(draft.treadling)];
  const sunk = [];
  const raised = [];
  for (let shaft = 0; shaft < draft.shafts; shaft += 1) {
    if (!usedShafts.has(shaft)) continue;
    const lifts = usedTreadles.map((treadle) => draft.tieUp[shaft][treadle]);
    if (lifts.every((cell) => !cell)) sunk.push(shaft + 1);
    else if (lifts.every(Boolean)) raised.push(shaft + 1);
  }
  const notes = [];
  if (sunk.length > 0) notes.push(`第 ${sunk.join('、')} 片综一次都没提，这几根经一直沉着`);
  if (raised.length > 0) notes.push(`第 ${raised.join('、')} 片综每一梭都提着，这几根经没有交织`);
  return notes.join('。');
}

export function sequenceRepeat(values) {
  const count = values.length;
  for (let size = 1; size <= count; size += 1) {
    if (count % size !== 0) continue;
    let fits = true;
    for (let index = size; index < count; index += 1) {
      if (values[index] !== values[index % size]) {
        fits = false;
        break;
      }
    }
    if (fits) return size;
  }
  return count;
}

export function clothRepeat(draft) {
  return {
    ends: sequenceRepeat(draft.threading),
    picks: sequenceRepeat(draft.treadling)
  };
}

function croppedLength(length, repeat, min) {
  let size = repeat;
  while (size < min) size += repeat;
  return size < length ? size : length;
}

export function cropToRepeat(draft) {
  const unit = clothRepeat(draft);
  const ends = croppedLength(draft.ends, unit.ends, LIMITS.ends.min);
  const picks = croppedLength(draft.picks, unit.picks, LIMITS.picks.min);
  if (ends === draft.ends && picks === draft.picks) return draft;
  return resize(draft, {ends, picks});
}

export function keptDiff(current, kept) {
  if (!kept) return {threading: null, tieUp: null, treadling: null};
  return {
    threading: current.ends === kept.ends && current.shafts === kept.shafts
      ? current.threading.map((shaft, index) => shaft !== kept.threading[index])
      : null,
    tieUp: current.shafts === kept.shafts && current.treadles === kept.treadles
      ? current.tieUp.map((row, shaft) => row.map((cell, treadle) => cell !== kept.tieUp[shaft][treadle]))
      : null,
    treadling: current.picks === kept.picks && current.treadles === kept.treadles
      ? current.treadling.map((treadle, index) => treadle !== kept.treadling[index])
      : null
  };
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

function shows(cell, wantWarp) {
  return wantWarp ? cell === true : cell === false;
}

function maxRun(line, wantWarp) {
  const count = line.length;
  if (count === 0) return 0;
  let best = 0;
  let run = 0;
  for (let index = 0; index < count; index += 1) {
    if (shows(line[index], wantWarp)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  if (best === count) return count;
  let prefix = 0;
  while (prefix < count && shows(line[prefix], wantWarp)) prefix += 1;
  let suffix = 0;
  while (suffix < count - prefix && shows(line[count - 1 - suffix], wantWarp)) suffix += 1;
  if (prefix > 0 && suffix > 0) {
    const wrapped = prefix + suffix;
    if (wrapped > best) best = wrapped;
  }
  return best;
}

function columnAt(grid, end) {
  const column = [];
  for (let pick = 0; pick < grid.length; pick += 1) column.push(grid[pick][end]);
  return column;
}

export function floatReport(draft) {
  const grid = warpUp(draft);
  let warp = 0;
  let weft = 0;
  for (let end = 0; end < draft.ends; end += 1) {
    const run = maxRun(columnAt(grid, end), true);
    if (run > warp) warp = run;
  }
  for (const row of grid) {
    const run = maxRun(row, false);
    if (run > weft) weft = run;
  }
  return {warp, weft, loose: warp > 4 || weft > 4};
}

function markRuns(line, wantWarp, best, visit) {
  const count = line.length;
  let run = 0;
  for (let index = 0; index < count; index += 1) {
    if (shows(line[index], wantWarp)) {
      run += 1;
      if (run === best) {
        for (let cursor = index - best + 1; cursor <= index; cursor += 1) visit(cursor);
      }
    } else {
      run = 0;
    }
  }
  if (best === count) return;
  let prefix = 0;
  while (prefix < count && shows(line[prefix], wantWarp)) prefix += 1;
  let suffix = 0;
  while (suffix < count - prefix && shows(line[count - 1 - suffix], wantWarp)) suffix += 1;
  if (prefix > 0 && suffix > 0 && prefix + suffix === best) {
    for (let cursor = 0; cursor < prefix; cursor += 1) visit(cursor);
    for (let cursor = 0; cursor < suffix; cursor += 1) visit(count - 1 - cursor);
  }
}

export function looseCells(draft) {
  const grid = warpUp(draft);
  const marks = Array.from({length: draft.picks}, () => Array.from({length: draft.ends}, () => false));
  const warpEnds = [];
  const weftPicks = [];
  const columns = [];
  const columnRuns = [];
  let warp = 0;
  for (let end = 0; end < draft.ends; end += 1) {
    const column = columnAt(grid, end);
    columns.push(column);
    const run = maxRun(column, true);
    columnRuns.push(run);
    if (run > warp) warp = run;
  }
  let weft = 0;
  const rowRuns = grid.map((row) => {
    const run = maxRun(row, false);
    if (run > weft) weft = run;
    return run;
  });
  if (warp > 4) {
    columns.forEach((column, end) => {
      if (columnRuns[end] !== warp) return;
      warpEnds.push(end + 1);
      markRuns(column, true, warp, (pick) => {
        marks[pick][end] = true;
      });
    });
  }
  if (weft > 4) {
    grid.forEach((row, pick) => {
      if (rowRuns[pick] !== weft) return;
      weftPicks.push(pick + 1);
      markRuns(row, false, weft, (end) => {
        marks[pick][end] = true;
      });
    });
  }
  return {marks, warpEnds, weftPicks};
}

export const DEFAULT_WARP = '#1e2a4a';
export const DEFAULT_WEFT = '#f7f1e6';
export const DEFAULT_WARP_ALT = '#8d3b32';
export const DEFAULT_WEFT_ALT = '#c4b49a';
export const TEXT_LIMIT = 20000;

export function clampBlock(value) {
  return Number.isInteger(value) && value >= 0 && value <= 8 ? value : 0;
}

export function stripeColor(index, block, main, alt) {
  if (!Number.isInteger(block) || block <= 0) return main;
  return Math.floor(index / block) % 2 === 0 ? main : alt;
}

export function normalizeColor(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const match = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : fallback;
}

function linearChannel(hex, offset) {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function colorContrast(left, right) {
  const luminance = (hex) => (
    0.2126 * linearChannel(hex, 1) +
    0.7152 * linearChannel(hex, 3) +
    0.0722 * linearChannel(hex, 5)
  );
  const lighter = Math.max(luminance(left), luminance(right));
  const darker = Math.min(luminance(left), luminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

export function yarnNote(yarn) {
  const pairs = [[yarn.warp, yarn.weft]];
  if (yarn.warpBlock > 0) pairs.push([yarn.warpAlt, yarn.weft]);
  if (yarn.weftBlock > 0) pairs.push([yarn.warp, yarn.weftAlt]);
  if (yarn.warpBlock > 0 && yarn.weftBlock > 0) pairs.push([yarn.warpAlt, yarn.weftAlt]);
  if (pairs.some(([left, right]) => colorContrast(left, right) < 2)) return '经色和纬色太接近，布面看不清';
  return '';
}

export function formatDraft(draft, yarn = {}) {
  const warp = normalizeColor(yarn.warp, DEFAULT_WARP);
  const weft = normalizeColor(yarn.weft, DEFAULT_WEFT);
  const warpAlt = normalizeColor(yarn.warpAlt, DEFAULT_WARP_ALT);
  const weftAlt = normalizeColor(yarn.weftAlt, DEFAULT_WEFT_ALT);
  const warpBlock = clampBlock(yarn.warpBlock);
  const weftBlock = clampBlock(yarn.weftBlock);
  return [
    'heddle 1',
    `ends ${draft.ends}`,
    `picks ${draft.picks}`,
    `shafts ${draft.shafts}`,
    `treadles ${draft.treadles}`,
    `warp ${warp}`,
    `weft ${weft}`,
    `warp-stripe ${warpBlock} ${warpAlt}`,
    `weft-stripe ${weftBlock} ${weftAlt}`,
    `threading ${draft.threading.map((value) => value + 1).join(' ')}`,
    'tie-up',
    ...draft.tieUp.map((row) => row.map((cell) => (cell ? '1' : '0')).join(' ')),
    `treadling ${draft.treadling.map((value) => value + 1).join(' ')}`
  ].join('\n');
}

function parseCountToken(token, label) {
  if (!/^\d{1,3}$/.test(token ?? '')) throw new Error(`${label}要是整数`);
  return Number(token);
}

function parseOneToEight(token, label) {
  if (!/^[1-8]$/.test(token ?? '')) throw new Error(`${label}要是 1 到 8`);
  return Number(token) - 1;
}

function parseStripe(value, label) {
  const match = /^([0-8])\s+(#[0-9a-fA-F]{6})$/.exec(value ?? '');
  if (!match) throw new Error(`${label}要是 0 到 8，再加一个颜色`);
  return {block: Number(match[1]), color: match[2].toLowerCase()};
}

export function parseDraftText(text) {
  if (typeof text !== 'string' || text.length > TEXT_LIMIT) throw new Error('这份组织图太长');
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  if (lines[0] !== 'heddle 1') throw new Error('开头要是 heddle 1');
  const fields = new Map();
  const tieUp = [];
  let readingTie = false;
  for (const line of lines.slice(1)) {
    if (line === 'tie-up') {
      readingTie = true;
      continue;
    }
    if (readingTie && /^[01](?:\s+[01])*$/.test(line)) {
      tieUp.push(line.split(/\s+/).map((cell) => cell === '1'));
      continue;
    }
    readingTie = false;
    const space = line.indexOf(' ');
    if (space < 1 || !/^[a-z]+(?:-[a-z]+)*$/.test(line.slice(0, space))) throw new Error('有一行认不出');
    fields.set(line.slice(0, space), line.slice(space + 1).trim());
  }
  const threading = (fields.get('threading') ?? '').split(/\s+/).filter(Boolean).map((token) => parseOneToEight(token, '综片'));
  const treadling = (fields.get('treadling') ?? '').split(/\s+/).filter(Boolean).map((token) => parseOneToEight(token, '踏板'));
  const draft = createDraft({
    ends: parseCountToken(fields.get('ends'), '经线'),
    picks: parseCountToken(fields.get('picks'), '纬线'),
    shafts: parseCountToken(fields.get('shafts'), '综片'),
    treadles: parseCountToken(fields.get('treadles'), '踏板'),
    threading,
    tieUp,
    treadling
  });
  const warpStripe = fields.has('warp-stripe')
    ? parseStripe(fields.get('warp-stripe'), '经隔')
    : {block: 0, color: DEFAULT_WARP_ALT};
  const weftStripe = fields.has('weft-stripe')
    ? parseStripe(fields.get('weft-stripe'), '纬隔')
    : {block: 0, color: DEFAULT_WEFT_ALT};
  return {
    draft,
    warp: normalizeColor(fields.get('warp'), DEFAULT_WARP),
    weft: normalizeColor(fields.get('weft'), DEFAULT_WEFT),
    warpAlt: warpStripe.color,
    weftAlt: weftStripe.color,
    warpBlock: warpStripe.block,
    weftBlock: weftStripe.block
  };
}

export function draftFromJSON(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('组织图不是一份记录');
  if (!Array.isArray(value.tieUp) || value.tieUp.length > LIMITS.shafts.max) throw new Error('打结的综片数不对');
  const tieUp = value.tieUp.map((row) => {
    if (!Array.isArray(row) || row.length > LIMITS.treadles.max) throw new Error('结数不对');
    return row.map((cell) => {
      if (cell !== true && cell !== false) throw new Error('结只能是开或关');
      return cell;
    });
  });
  return {
    draft: createDraft({
      ends: value.ends,
      picks: value.picks,
      shafts: value.shafts,
      treadles: value.treadles,
      threading: value.threading,
      tieUp,
      treadling: value.treadling
    }),
    warp: normalizeColor(value.warp, DEFAULT_WARP),
    weft: normalizeColor(value.weft, DEFAULT_WEFT),
    warpAlt: normalizeColor(value.warpAlt, DEFAULT_WARP_ALT),
    weftAlt: normalizeColor(value.weftAlt, DEFAULT_WEFT_ALT),
    warpBlock: clampBlock(value.warpBlock),
    weftBlock: clampBlock(value.weftBlock),
    repeat: value.repeat === 2 ? 2 : 1
  };
}
