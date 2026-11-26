const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { minify } = require('terser');

const scripts = ['fighters-art.js', 'arena-art.js', 'engine.js', 'render.js', 'app.js'];
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const site = path.resolve(args.find(arg => arg !== '--check') || path.join(__dirname, '..', 'docs'));
const output = path.join(site, 'runtime');

async function build() {
  const indexPath = path.join(site, 'index.html');
  const original = await fs.readFile(indexPath, 'utf8');
  let index = original;
  if (!checkOnly) await fs.mkdir(output, { recursive: true });

  for (const name of scripts) {
    const source = await fs.readFile(path.join(site, name), 'utf8');
    // Only shorten local identifiers and remove whitespace. Replay fields and public APIs use property names.
    const result = await minify(source, {
      compress: false,
      mangle: true,
      keep_fnames: true,
      keep_classnames: true,
      format: { comments: /^!/ }
    });
    const code = result.code + '\n';
    const version = createHash('sha256').update(code).digest('hex').slice(0, 16);
    const tag = new RegExp('src="\\./runtime/' + name.replace('.', '\\.') + '\\?v=[a-z0-9-]+"', 'g');
    if (Array.from(index.matchAll(tag)).length !== 1) throw Error('Expected one runtime script for ' + name);
    index = index.replace(tag, 'src="./runtime/' + name + '?v=' + version + '"');

    const file = path.join(output, name);
    if (checkOnly) {
      const existing = await fs.readFile(file, 'utf8');
      if (existing.replace(/\r\n/g, '\n') !== code) throw Error('Rebuild runtime/' + name);
    } else {
      await fs.writeFile(file, code);
    }
  }
  if (index !== original) {
    if (checkOnly) throw Error('Rebuild the script versions in index.html');
    await fs.writeFile(indexPath, index);
  }
}

build().catch(error => { console.error(error.message); process.exitCode = 1; });
