import assert from 'node:assert/strict';
import test from 'node:test';
import {createDraft, draftFromJSON, editCell, floatReport, formatDraft, invertShed, parseDraftText, resize, reverseTreadling, turnDraft, warpFace, warpUp} from '../engine.mjs';
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

test('float length counts across the repeat and flags a loose cloth', () => {
  assert.deepEqual(floatReport(plainWeave(8, 8)), {warp: 1, weft: 1, loose: false});
  assert.deepEqual(floatReport(twill(8, 8)), {warp: 2, weft: 2, loose: false});
  assert.deepEqual(floatReport(satin(20, 20)), {warp: 4, weft: 1, loose: false});
  const solid = createDraft({
    ends: 4,
    picks: 6,
    shafts: 2,
    treadles: 2,
    threading: [0, 0, 0, 0],
    tieUp: [[true, true], [false, false]],
    treadling: [0, 0, 0, 0, 0, 0]
  });
  assert.deepEqual(floatReport(solid), {warp: 6, weft: 0, loose: true});
  const open = createDraft({
    ends: 6,
    picks: 4,
    shafts: 2,
    treadles: 2,
    threading: [0, 0, 0, 0, 0, 0],
    tieUp: [[false, false], [false, false]],
    treadling: [0, 1, 0, 1]
  });
  assert.deepEqual(floatReport(open), {warp: 0, weft: 6, loose: true});
});

test('inverting, reversing, and turning a draft can be done twice', () => {
  const draft = twill(8, 6);
  assert.deepEqual(invertShed(invertShed(draft)), draft);
  assert.deepEqual(reverseTreadling(reverseTreadling(draft)), draft);
  assert.deepEqual(turnDraft(turnDraft(draft)), draft);
  assert.equal(draft.treadling[0], 0);
  const face = warpFace(satin(20, 20));
  assert.equal(warpFace(invertShed(satin(20, 20))).up, face.total - face.up);
  const reversed = reverseTreadling(draft);
  assert.equal(reversed.treadling[0], draft.treadling.at(-1));
  assert.deepEqual(draft.treadling, [0, 1, 2, 3, 0, 1]);
  const turned = turnDraft(draft);
  assert.equal(turned.ends, draft.picks);
  assert.equal(turned.picks, draft.ends);
  assert.equal(turned.shafts, draft.treadles);
  assert.equal(turned.tieUp[1][2], draft.tieUp[2][1]);
  assert.deepEqual(turned.threading, draft.treadling);
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

test('a written draft round-trips and rejects anything outside the loom text', () => {
  const draft = satin(10, 10);
  const text = formatDraft(draft, {warp: '#ABCDEF', weft: 'blue'});
  assert.match(text, /^heddle 1\n/);
  assert.match(text, /warp #abcdef/);
  assert.match(text, /weft #f7f1e6/);
  const parsed = parseDraftText(`# 备注\r\n${text}`);
  assert.deepEqual(parsed.draft, draft);
  assert.equal(parsed.warp, '#abcdef');
  assert.equal(parsed.weft, '#f7f1e6');
  assert.throws(() => parseDraftText('plain weave'), /开头要是 heddle 1/);
  assert.throws(() => parseDraftText('x'.repeat(20001)), /太长/);
  assert.throws(() => parseDraftText(text.replace(/threading .*/, 'threading 1e2 1')), /要是 1 到 8/);
  const stored = draftFromJSON({...draft, warp: '#112233', weft: '#445566', repeat: 2});
  assert.equal(stored.repeat, 2);
  assert.equal(stored.warp, '#112233');
  assert.equal(draftFromJSON({...draft, repeat: 9}).repeat, 1);
  assert.throws(() => draftFromJSON({...draft, tieUp: draft.tieUp.map((row) => row.map((cell) => (cell ? 1 : 0)))}), /结只能是开或关/);
  const polluted = JSON.parse('{"ends":4,"picks":4,"shafts":2,"treadles":2,"threading":[0,1,0,1],"tieUp":[[true,false],[false,true]],"treadling":[0,1,0,1],"__proto__":{"polluted":true}}');
  draftFromJSON(polluted);
  assert.equal({}.polluted, undefined);
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
