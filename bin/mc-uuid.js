#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const { updateManifest } = require('../lib/updateManifest');

function parseArgs(argv) {
  const opts = { pretty: 2 };
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') opts.dry = true;
    else if (a === '--no-backup') opts.noBackup = true;
    else if (a === '--quiet') opts.quiet = true;
    else if (a.startsWith('--pretty=')) opts.pretty = Number(a.split('=')[1]);
    else if (a === '--pretty') opts.pretty = Number(argv[++i]);
    else if (a.startsWith('--only=')) opts.only = a.split('=')[1];
    else if (a === '--only') opts.only = argv[++i];
    else if (a.startsWith('--seed=')) opts.seed = a.split('=')[1];
    else if (a === '--seed') opts.seed = argv[++i];
    else if (a.startsWith('--')) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      args.push(a);
    }
  }
  return { opts, args };
}

(async () => {
  try {
    const { opts, args } = parseArgs(process.argv.slice(2));
    const target = path.resolve(args[0] || './manifest.json');
    let result;
    try {
      result = await updateManifest(target, opts);
    } catch (err) {
      if (err.code === 'ENOENT') {
        if (!opts.quiet) console.error(`File not found: ${target}`);
        process.exit(2);
      }
      if (!opts.quiet) console.error(err.message);
      process.exit(1);
    }

    const { text, summary, eol } = result;

    if (opts.dry) {
      if (!opts.quiet) {
        console.log('[dry-run]');
        summary.forEach(l => console.log(l));
      }
      process.exit(0);
    }

    if (!opts.quiet) {
      summary.forEach(l => console.log(l));
    }

    if (!opts.noBackup) {
      try {
        await fs.copyFile(target, target + '.bak');
        if (!opts.quiet) console.log(`Saved backup: ${path.basename(target)}.bak`);
      } catch (err) {
        if (!opts.quiet) console.error('Write error: ' + err.message);
        process.exit(3);
      }
    }

    try {
      await fs.writeFile(target, text);
    } catch (err) {
      if (!opts.quiet) console.error('Write error: ' + err.message);
      process.exit(3);
    }

    if (!opts.quiet) {
      console.log(`Wrote: ${path.basename(target)} (pretty=${opts.pretty}, eol=${JSON.stringify(eol)})`);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
