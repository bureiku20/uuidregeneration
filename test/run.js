const assert = require('assert');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const cli = path.resolve(__dirname, '../bin/mc-uuid.js');

function run(args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile('node', [cli, ...args], opts, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

(async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-uuid-'));
  const fixtures = name => path.join(__dirname, 'fixtures', name);
  const copy = async name => {
    const src = fixtures(name);
    const dest = path.join(tmp, 'manifest.json');
    await fs.copyFile(src, dest);
    return dest;
  };

  // happy path
  {
    const file = await copy('valid.json');
    const res = await run([file], { cwd: tmp });
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.notStrictEqual(data.header.uuid, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    assert.ok(res.stdout.includes('header.uuid'));
    await fs.stat(file + '.bak');
  }

  // missing header
  {
    try {
      await run([fixtures('noHeader.json')]);
      assert.fail('should have failed');
    } catch (err) {
      assert.strictEqual(err.code, 1);
    }
  }

  // malformed json
  {
    try {
      await run([fixtures('badJson.json')]);
      assert.fail('should have failed');
    } catch (err) {
      assert.strictEqual(err.code, 1);
    }
  }

  // dry run
  {
    const file = await copy('valid.json');
    const before = await fs.readFile(file, 'utf8');
    const res = await run([file, '--dry'], { cwd: tmp });
    assert.ok(res.stdout.startsWith('[dry-run]'));
    const after = await fs.readFile(file, 'utf8');
    assert.strictEqual(before, after);
    try { await fs.stat(file + '.bak'); assert.fail(); } catch {}
  }

  // seed deterministic
  {
    const file = await copy('valid.json');
    const r1 = await run([file, '--seed', 'abc', '--dry'], { cwd: tmp });
    const r2 = await run([file, '--seed', 'abc', '--dry'], { cwd: tmp });
    assert.strictEqual(r1.stdout, r2.stdout);
  }

  console.log('All tests passed.');
})();
