import {LIMITS, editCell, resize, warpFace, warpUp} from './engine.mjs';
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
let pendingFocus = null;

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
  const ratio = window.devicePixelRatio || 1;
  const width = draft.ends * step - GAP;
  const height = draft.picks * step - GAP;
  cloth.width = Math.round(width * ratio);
  cloth.height = Math.round(height * ratio);
  cloth.style.width = `${width}px`;
  cloth.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const grid = warpUp(draft);
  for (let pick = 0; pick < draft.picks; pick += 1) {
    for (let end = 0; end < draft.ends; end += 1) {
      ctx.fillStyle = grid[pick][end] ? '#1e2a4a' : '#f7f1e6';
      ctx.fillRect(end * step, pick * step, CELL, CELL);
    }
  }
}

function sameDraft(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function render() {
  const ratio = warpFace(draft);
  face.textContent = `经面 ${ratio.percent}%`;
  clothSize.textContent = `${draft.ends} 经 × ${draft.picks} 纬`;
  syncSize();
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

render();
