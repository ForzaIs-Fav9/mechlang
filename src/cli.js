import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { parseMechlang } from './parse.js';
import { render } from './render.js';

const args = process.argv.slice(2);
const mechFile = args.find(a => !a.startsWith('--'));
const layoutHorizontal = args.includes('--layout=horizontal');

if (!mechFile) {
  console.error('Usage: node src/cli.js <file.mech> [--layout=horizontal]');
  process.exit(1);
}

const source = readFileSync(mechFile, 'utf8');
const ast = parseMechlang(source);

const svg = render(ast, layoutHorizontal);

const baseName = path.basename(mechFile, '.mech');
const suffix = layoutHorizontal ? '.horizontal.svg' : '.svg';
const out = `out/${baseName}${suffix}`;

mkdirSync('out', { recursive: true });
writeFileSync(out, svg);

console.log(`Rendered → ${out}`);
