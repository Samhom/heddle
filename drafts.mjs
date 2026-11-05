import {createDraft} from './engine.mjs';

function cycle(length, pattern) {
  return Array.from({length}, (_, index) => pattern[index % pattern.length]);
}

function twillTieUp() {
  return Array.from({length: 4}, (_, shaft) => (
    Array.from({length: 4}, (_, treadle) => shaft === treadle || shaft === (treadle + 1) % 4)
  ));
}

export function plainWeave(ends = 16, picks = 16) {
  return createDraft({
    ends,
    picks,
    shafts: 2,
    treadles: 2,
    threading: cycle(ends, [0, 1]),
    tieUp: [
      [true, false],
      [false, true]
    ],
    treadling: cycle(picks, [0, 1])
  });
}

export function twill(ends = 16, picks = 16) {
  return createDraft({
    ends,
    picks,
    shafts: 4,
    treadles: 4,
    threading: cycle(ends, [0, 1, 2, 3]),
    tieUp: twillTieUp(),
    treadling: cycle(picks, [0, 1, 2, 3])
  });
}

export function herringbone(ends = 18, picks = 18) {
  return createDraft({
    ends,
    picks,
    shafts: 4,
    treadles: 4,
    threading: cycle(ends, [0, 1, 2, 3, 2, 1]),
    tieUp: twillTieUp(),
    treadling: cycle(picks, [0, 1, 2, 3, 2, 1])
  });
}

export function satin(ends = 20, picks = 20) {
  const count = 5;
  const step = 2;
  return createDraft({
    ends,
    picks,
    shafts: count,
    treadles: count,
    threading: cycle(ends, [0, 1, 2, 3, 4]),
    tieUp: Array.from({length: count}, (_, shaft) => (
      Array.from({length: count}, (_, treadle) => shaft !== (treadle * step) % count)
    )),
    treadling: cycle(picks, [0, 1, 2, 3, 4])
  });
}

export const PRESETS = Object.freeze([
  Object.freeze({id: 'plain', name: '平纹', title: '两片综，一上一下', ends: 16, picks: 16, build: plainWeave}),
  Object.freeze({id: 'twill', name: '斜纹', title: '四片综的 2/2 斜纹', ends: 16, picks: 16, build: twill}),
  Object.freeze({id: 'herringbone', name: '人字', title: '穿综折返的人字斜纹', ends: 18, picks: 18, build: herringbone}),
  Object.freeze({id: 'satin', name: '缎纹', title: '五枚缎，每梭只沉一根经', ends: 20, picks: 20, build: satin})
]);
