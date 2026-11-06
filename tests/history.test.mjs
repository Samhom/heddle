import assert from 'node:assert/strict';
import test from 'node:test';
import {HISTORY_LIMIT, recordChange, redoChange, undoChange} from '../history.mjs';

test('undo and redo walk a short draft history', () => {
  const first = {id: 1};
  const second = {id: 2};
  const third = {id: 3};
  let past = [];
  let future = [];
  let current = first;
  ({past, future, current} = recordChange(past, future, current, second));
  ({past, future, current} = recordChange(past, future, current, third));
  assert.equal(current, third);
  assert.equal(future.length, 0);
  ({past, future, current} = undoChange(past, future, current));
  assert.equal(current, second);
  ({past, future, current} = undoChange(past, future, current));
  assert.equal(current, first);
  assert.equal(undoChange(past, future, current), null);
  ({past, future, current} = redoChange(past, future, current));
  assert.equal(current, second);
  ({past, future, current} = recordChange(past, future, current, third));
  assert.deepEqual(future, []);
  assert.equal(redoChange(past, future, current), null);
});

test('history keeps only the newest steps', () => {
  let past = [];
  let future = [];
  let current = 0;
  for (let step = 1; step <= HISTORY_LIMIT + 5; step += 1) {
    ({past, future, current} = recordChange(past, future, current, step));
  }
  assert.equal(past.length, HISTORY_LIMIT);
  assert.equal(past[0], 5);
  assert.equal(current, HISTORY_LIMIT + 5);
});
