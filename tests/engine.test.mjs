import assert from 'node:assert/strict';
import test from 'node:test';
import {createDraft, editCell, resize, warpFace, warpUp} from '../engine.mjs';
import {herringbone, plainWeave, satin, twill} from '../drafts.mjs';

function rowBits(row) {
  return row.map((cell) => (cell ? '1' : '0')).join('');
}

test('plain weave is a checkerboard and half warp', () => {
  const draft = plainWeave(8, 8);
  const grid = warpUp(draft);
  assert.equal(rowBits(grid[0]), '10101010');
  assert.equal(rowBits(grid[1]), '01010101');
  assert.equal(warpFace(draft).percent, 50);
});

test('2/2 twill walks one step each pick', () => {
  const draft = twill(8, 8);
  const grid = warpUp(draft);
  assert.equal(rowBits(grid[0]), '11001100');
  assert.equal(rowBits(grid[1]), '01100110');
  assert.equal(rowBits(grid[2]), '00110011');
  assert.equal(rowBits(grid[3]), '10011001');
  assert.equal(warpFace(draft).percent, 50);
  assert.notEqual(rowBits(warpUp(herringbone(8, 8))[0]), rowBits(grid[0]));
});

test('5-end satin sinks one warp in every five', () => {
  const draft = satin(20, 20);
  const grid = warpUp(draft);
  assert.equal(rowBits(grid[0]), '01111011110111101111');
  assert.equal(rowBits(grid[1]), '11011110111101111011');
  for (const row of grid) {
    assert.equal(row.filter((cell) => !cell).length, 4);
  }
  assert.equal(warpFace(draft).percent, 80);
});

test('a cell edit changes one end, one tie, or one pick', () => {
  const draft = plainWeave(4, 4);
  const moved = editCell(draft, {grid: 'threading', row: 0, col: 0});
  assert.deepEqual(moved.threading, [1, 1, 0, 1]);
  assert.deepEqual(draft.threading, [0, 1, 0, 1]);
  const tied = editCell(draft, {grid: 'tie', row: 1, col: 0});
  assert.equal(tied.tieUp[0][0], false);
  assert.equal(draft.tieUp[0][0], true);
  const stepped = editCell(draft, {grid: 'treadling', row: 0, col: 1});
  assert.deepEqual(stepped.treadling, [1, 1, 0, 1]);
  assert.equal(rowBits(warpUp(stepped)[0]), '0101');
  assert.throws(() => editCell(draft, {grid: 'cloth', row: 0, col: 0}), /没有这一格/);
  assert.throws(() => editCell(draft, {grid: 'threading', row: 5, col: 0}), /不在这张图上/);
});

test('resizing repeats the draft that is already drawn', () => {
  const draft = twill(4, 4);
  const wider = resize(draft, {ends: 8});
  assert.deepEqual(wider.threading, [0, 1, 2, 3, 0, 1, 2, 3]);
  assert.equal(wider.tieUp[0][0], true);
  assert.deepEqual(draft.threading, [0, 1, 2, 3]);
  const bone = herringbone(6, 6);
  assert.deepEqual(resize(bone, {ends: 12, picks: 12}).threading, [...bone.threading, ...bone.threading]);
  const fewer = resize(wider, {shafts: 2});
  assert.deepEqual(fewer.threading, [0, 1, 1, 1, 0, 1, 1, 1]);
  assert.equal(fewer.tieUp.length, 2);
  assert.equal(fewer.tieUp[0][0], true);
  const more = resize(draft, {treadles: 6, picks: 6});
  assert.equal(more.tieUp[0].length, 6);
  assert.equal(more.tieUp[0][5], false);
  assert.deepEqual(more.treadling, [0, 1, 2, 3, 0, 1]);
  assert.equal(warpFace(resize(plainWeave(8, 8), {ends: 20, picks: 20})).percent, 50);
  assert.throws(() => resize(draft, {ends: 3}), /经线要在 4 和 80 之间/);
});

test('a draft rejects counts and cells outside the loom', () => {
  const good = plainWeave(4, 4);
  assert.throws(() => plainWeave(2, 4), /经线要在 4 和 80 之间/);
  assert.throws(() => createDraft({...good, ends: 81, threading: Array(81).fill(0)}), /经线要在/);
  assert.throws(() => createDraft({...good, threading: [0, 1, 0]}), /穿综对不上/);
  assert.throws(() => createDraft({...good, threading: [0, 1, 2, 0]}), /没有落在综片上/);
  assert.throws(() => createDraft({...good, tieUp: [[true, false], [false]]}), /结数不对/);
  assert.throws(() => createDraft({...good, tieUp: [[1, 0], [0, 1]]}), /结只能是开或关/);
  assert.throws(() => createDraft({...good, treadling: [0, 1, 0, -1]}), /没有落在踏板上/);
});
