import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {createApp} from '../server.mjs';

test('the page is static and only serves the loom itself', async () => {
  for (const name of ['engine.mjs', 'drafts.mjs', 'history.mjs', 'app.js', 'server.mjs']) {
    const source = await readFile(new URL(`../${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\beval\s*\(/);
    assert.doesNotMatch(source, /\bnew\s+Function\b/);
    assert.doesNotMatch(source, /innerHTML/);
    assert.doesNotMatch(source, /document\.write/);
    assert.doesNotMatch(source, /child_process/);
  }
  const app = createApp();
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  try {
    const {port} = app.address();
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
    assert.match(await home.text(), /Heddle/);
    const script = await fetch(`http://127.0.0.1:${port}/app.js`, {method: 'HEAD'});
    assert.equal(script.status, 200);
    assert.equal(await script.text(), '');
    const missing = await fetch(`http://127.0.0.1:${port}/package.json`);
    assert.equal(missing.status, 404);
    const posted = await fetch(`http://127.0.0.1:${port}/`, {method: 'POST'});
    assert.equal(posted.status, 405);
    const encoded = await fetch(`http://127.0.0.1:${port}/%2e%2e%2fpackage.json`);
    assert.equal(encoded.status, 404);
  } finally {
    app.close();
    await once(app, 'close');
  }
});
