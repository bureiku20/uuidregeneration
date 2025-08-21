const fs = require('fs/promises');
const { v4, v5 } = require('uuid');
const { formatDiff } = require('./diff');

async function updateManifest(filePath, options = {}) {
  const pretty = options.pretty || 2;
  const seed = options.seed;
  const only = options.only || {};
  const onlyHeader = only === 'header';
  const onlyModules = only === 'modules';

  const original = await fs.readFile(filePath, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';

  let data;
  try {
    data = JSON.parse(original);
  } catch (err) {
    const match = /position (\d+)/i.exec(err.message);
    if (match) {
      const pos = Number(match[1]);
      const until = original.slice(0, pos);
      const lines = until.split(/\n/);
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      err.message = `JSON parse error at line ${line} column ${col}`;
    }
    err.type = 'parse';
    throw err;
  }

  if (!data || typeof data !== 'object') {
    const err = new Error('Invalid manifest root');
    err.type = 'schema';
    throw err;
  }
  if (!data.header || typeof data.header !== 'object' || typeof data.header.uuid !== 'string') {
    const err = new Error('Invalid manifest: missing header.uuid');
    err.type = 'schema';
    throw err;
  }
  if (!Array.isArray(data.modules)) {
    const err = new Error('Invalid manifest: missing modules array');
    err.type = 'schema';
    throw err;
  }

  const used = new Set();
  data.modules.forEach(m => { if (typeof m.uuid === 'string') used.add(m.uuid); });
  if (onlyModules) {
    used.add(data.header.uuid);
  }

  const changes = [];

  function generate(fieldPath) {
    let attempt = 0;
    let id;
    do {
      if (seed) {
        const input = `${fieldPath}|${seed}` + (attempt ? `|retry:${attempt}` : '');
        id = v5(input, v5.DNS);
      } else {
        id = v4();
      }
      attempt++;
    } while (used.has(id));
    used.add(id);
    return id;
  }

  if (!onlyModules) {
    const old = data.header.uuid;
    used.delete(old);
    const nu = generate('header.uuid');
    data.header.uuid = nu;
    changes.push(formatDiff('header.uuid', old, nu));
  }

  if (!onlyHeader) {
    data.modules.forEach((m, i) => {
      if (typeof m.uuid !== 'string') return;
      const old = m.uuid;
      used.delete(old);
      const nu = generate(`modules[${i}].uuid`);
      m.uuid = nu;
      changes.push(formatDiff(`modules[${i}].uuid`, old, nu));
    });
  }

  const text = JSON.stringify(data, null, pretty) + eol;
  return { text, summary: changes, eol };
}

module.exports = { updateManifest };
