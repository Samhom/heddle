import {DEFAULT_WARP, DEFAULT_WEFT, LIMITS, draftFromJSON, editCell, floatReport, formatDraft, normalizeColor, parseDraftText, resize, warpFace, warpUp} from './engine.mjs';
import {PRESETS, plainWeave} from './drafts.mjs';

const CELL = 15;
const GAP = 3;

const threadingHost = document.querySelector('#threading');
const tieHost = document.querySelector('#tieup');
const treadHost = document.querySelector('#treadling');
const cloth = document.querySelector('#cloth');
const face = document.querySelector('#face');
const clothSize = document.querySelector('#cloth-size');
const sizeForm = document.querySelector('#size');
const sizeMsg = document.querySelector('#size-msg');
const warpInput = document.querySelector('#warp');
const weftInput = document.querySelector('#weft');
const repeatButton = document.querySelector('#repeat');
const scriptBox = document.querySelector('#script');
const scriptMsg = document.querySelector('#script-msg');
const sizeInputs = {
  ends: document.querySelector('#ends'),
  picks: document.querySelector('#picks'),
  shafts: document.querySelector('#shafts'),
  treadles: document.querySelector('#treadles')
};
const ctx = cloth.getContext('2d');

const sizeLabels = {ends: '经线', picks: '纬线', shafts: '综片', treadles: '踏板'};
for (const [key, input] of Object.entries(sizeInputs)) {
  input.min = String(LIMITS[key].min);
  input.max = String(LIMITS[key].max);
  input.addEventListener('change', applySize);
}
sizeForm.addEventListener('submit', (event) => {
  event.preventDefault();
  applySize();
});

const presetHost = document.querySelector('#presets');
let draft = plainWeave();
let yarn = {warp: DEFAULT_WARP, weft: DEFAULT_WEFT};
let repeat = 1;
let pendingFocus = null;
let loadNote = '';
let scriptDirty = false;

const STORAGE_KEY = 'heddle.draft';

function recall() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 20000) return;
    const stored = draftFromJSON(JSON.parse(raw));
    draft = stored.draft;
    yarn = {warp: stored.warp, weft: stored.weft};
    repeat = stored.repeat;
  } catch {
    loadNote = '上次的组织图读不出来，先打开平纹';
  }
}

function remember() {
  try {
    const payload = JSON.stringify({
      ends: draft.ends,
      picks: draft.picks,
      shafts: draft.shafts,
      treadles: draft.treadles,
      threading: draft.threading,
      tieUp: draft.tieUp,
      treadling: draft.treadling,
      warp: yarn.warp,
      weft: yarn.weft,
      repeat
    });
    if (payload.length > 20000) return;
    localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // 无痕窗口或空间满了时，这张图仍然留在页面上。
  }
}

recall();

for (const preset of PRESETS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pill';
  button.dataset.preset = preset.id;
  button.textContent = preset.name;
  button.title = preset.title;
  button.addEventListener('click', () => {
    draft = preset.build();
    pendingFocus = null;
    render();
  });
  presetHost.append(button);
}

function readCount(input, label) {
  const token = input.value.trim();
  if (!/^\d{1,3}$/.test(token)) throw new Error(`${label}要是整数`);
  return Number(token);
}

function syncSize() {
  for (const [key, input] of Object.entries(sizeInputs)) input.value = String(draft[key]);
}

function applySize() {
  try {
    draft = resize(draft, {
      ends: readCount(sizeInputs.ends, sizeLabels.ends),
      picks: readCount(sizeInputs.picks, sizeLabels.picks),
      shafts: readCount(sizeInputs.shafts, sizeLabels.shafts),
      treadles: readCount(sizeInputs.treadles, sizeLabels.treadles)
    });
    sizeMsg.textContent = '';
    pendingFocus = null;
    render();
  } catch (error) {
    sizeMsg.textContent = error instanceof Error ? error.message : '尺寸没有改成';
    syncSize();
  }
}

function shaftAt(row) {
  return draft.shafts - 1 - row;
}

function paintGrid(host, kind, rows, cols, labelAt, isOn) {
  host.replaceChildren();
  host.style.gridTemplateColumns = `repeat(${cols}, ${CELL}px)`;
  host.style.gridTemplateRows = `repeat(${rows}, ${CELL}px)`;
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const on = isOn(row, col);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = on ? 'cell on' : 'cell';
      const label = labelAt(row, col);
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      const focused = pendingFocus?.host === host && pendingFocus.row === row && pendingFocus.col === col;
      button.tabIndex = focused || (!pendingFocus && row === 0 && col === 0) ? 0 : -1;
      button.addEventListener('click', () => {
        draft = editCell(draft, {grid: kind, row, col});
        pendingFocus = {host, row, col};
        render();
      });
      if (focused) queueMicrotask(() => button.focus());
      fragment.append(button);
    }
  }
  host.append(fragment);
}

function paintCloth() {
  const step = CELL + GAP;
  const copies = repeat === 2 ? 2 : 1;
  const ratio = window.devicePixelRatio || 1;
  const width = draft.ends * copies * step - GAP;
  const height = draft.picks * copies * step - GAP;
  cloth.width = Math.round(width * ratio);
  cloth.height = Math.round(height * ratio);
  cloth.style.width = `${width}px`;
  cloth.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const grid = warpUp(draft);
  for (let copyY = 0; copyY < copies; copyY += 1) {
    for (let copyX = 0; copyX < copies; copyX += 1) {
      for (let pick = 0; pick < draft.picks; pick += 1) {
        for (let end = 0; end < draft.ends; end += 1) {
          ctx.fillStyle = grid[pick][end] ? yarn.warp : yarn.weft;
          ctx.fillRect((copyX * draft.ends + end) * step, (copyY * draft.picks + pick) * step, CELL, CELL);
        }
      }
    }
  }
}

function sameDraft(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function showStats() {
  const ratio = warpFace(draft);
  const floats = floatReport(draft);
  const longest = Math.max(floats.warp, floats.weft);
  face.textContent = `经面 ${ratio.percent}% · 经浮 ${floats.warp} · 纬浮 ${floats.weft}`;
  face.classList.toggle('loose', floats.loose);
  face.title = floats.loose
    ? `最长浮长 ${longest}，超过 4 根布容易松。循环接到下一份时连着的也算。`
    : '经浮是一根经连续压住的纬，纬浮是一梭纬连续压住的经。循环接到下一份时连着的也算。';
}

function render() {
  if (loadNote === '') sizeMsg.textContent = '';
  showStats();
  clothSize.textContent = repeat === 2
    ? `${draft.ends} 经 × ${draft.picks} 纬，并了两份`
    : `${draft.ends} 经 × ${draft.picks} 纬`;
  syncSize();
  warpInput.value = yarn.warp;
  weftInput.value = yarn.weft;
  repeatButton.textContent = repeat === 1 ? '看两份' : '看一份';
  repeatButton.setAttribute('aria-pressed', repeat === 2 ? 'true' : 'false');
  if (!scriptDirty) scriptBox.value = formatDraft(draft, yarn);
  remember();
  for (const button of presetHost.querySelectorAll('button')) {
    const preset = PRESETS.find((item) => item.id === button.dataset.preset);
    button.setAttribute('aria-pressed', preset && sameDraft(draft, preset.build()) ? 'true' : 'false');
  }
  paintGrid(
    threadingHost,
    'threading',
    draft.shafts,
    draft.ends,
    (row, col) => `第 ${col + 1} 根经，第 ${shaftAt(row) + 1} 片综`,
    (row, col) => draft.threading[col] === shaftAt(row)
  );
  paintGrid(
    tieHost,
    'tie',
    draft.shafts,
    draft.treadles,
    (row, col) => `第 ${shaftAt(row) + 1} 片综，第 ${col + 1} 个踏板`,
    (row, col) => draft.tieUp[shaftAt(row)][col]
  );
  paintGrid(
    treadHost,
    'treadling',
    draft.picks,
    draft.treadles,
    (row, col) => `第 ${row + 1} 梭，第 ${col + 1} 个踏板`,
    (row, col) => draft.treadling[row] === col
  );
  paintCloth();
  pendingFocus = null;
}

function setYarn(kind, input) {
  yarn[kind] = normalizeColor(input.value, kind === 'warp' ? DEFAULT_WARP : DEFAULT_WEFT);
  render();
}

warpInput.addEventListener('input', () => setYarn('warp', warpInput));
weftInput.addEventListener('input', () => setYarn('weft', weftInput));
repeatButton.addEventListener('click', () => {
  repeat = repeat === 2 ? 1 : 2;
  render();
});
scriptBox.addEventListener('input', () => {
  scriptDirty = true;
});
document.querySelector('#copy-script').addEventListener('click', async () => {
  const text = formatDraft(draft, yarn);
  scriptDirty = false;
  scriptBox.value = text;
  try {
    await navigator.clipboard.writeText(text);
    scriptMsg.textContent = '已复制';
  } catch {
    scriptBox.focus();
    scriptBox.select();
    scriptMsg.textContent = '浏览器没有允许复制，文字已经选中';
  }
});
document.querySelector('#read-script').addEventListener('click', () => {
  try {
    const parsed = parseDraftText(scriptBox.value);
    draft = parsed.draft;
    yarn = {warp: parsed.warp, weft: parsed.weft};
    scriptDirty = false;
    scriptMsg.textContent = '已按这段排好';
    pendingFocus = null;
    render();
  } catch (error) {
    scriptMsg.textContent = error instanceof Error ? error.message : '这段没有排成';
  }
});
document.addEventListener('keydown', (event) => {
  const button = event.target;
  if (!(button instanceof HTMLButtonElement) || !button.classList.contains('cell')) return;
  const host = button.parentElement;
  const row = Number(button.dataset.row);
  const col = Number(button.dataset.col);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    const nextRow = row + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0);
    const nextCol = col + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0);
    host.querySelector(`button[data-row="${nextRow}"][data-col="${nextCol}"]`)?.focus();
    return;
  }
  if (!/^[1-8]$/.test(event.key)) return;
  const number = Number(event.key);
  if (host === threadingHost && number <= draft.shafts) {
    event.preventDefault();
    const visualRow = draft.shafts - number;
    draft = editCell(draft, {grid: 'threading', row: visualRow, col});
    pendingFocus = {host, row: visualRow, col};
    render();
  } else if (host === treadHost && number <= draft.treadles) {
    event.preventDefault();
    draft = editCell(draft, {grid: 'treadling', row, col: number - 1});
    pendingFocus = {host, row, col: number - 1};
    render();
  }
});

render();
if (loadNote) sizeMsg.textContent = loadNote;
loadNote = '';
