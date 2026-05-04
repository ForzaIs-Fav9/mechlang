import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { parseMechlang } from './parse.js';
import { moleculeRegistry } from './molecules.js';

const STEP_Y_GAP     = 240;
const STEP_X_GAP     = 260;
const MOLECULE_X_GAP = 180;
const MOLECULE_Y_GAP = 100;
const STEP_Y_ORIGIN  = 140;
const STEP_X_ORIGIN  = 120;
const PADDING        = 80;

let LABEL_BOXES = [];

const args             = process.argv.slice(2);
const mechFile         = args.find(a => !a.startsWith('--'));
const layoutHorizontal = args.includes('--layout=horizontal');

if (!mechFile) {
  console.error('Usage: node src/render.js <file.mech> [--layout=horizontal]');
  process.exit(1);
}

const source = readFileSync(mechFile, 'utf8');
const ast    = parseMechlang(source);

function resolveMol(alias, step) {
  const molKey = step.species[alias];
  return molKey ? moleculeRegistry[molKey] : null;
}

function parseArrowRef(ref) {
  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) return { alias: ref, atomLabel: null, atomB: null };

  const alias = ref.slice(0, dotIndex);
  const atomPart = ref.slice(dotIndex + 1);
  const dashIdx = atomPart.indexOf('-');

  if (dashIdx === -1) return { alias, atomLabel: atomPart, atomB: null };

  return {
    alias,
    atomLabel: atomPart.slice(0, dashIdx),
    atomB: atomPart.slice(dashIdx + 1)
  };
}

function getAtomPos(mol, ref, role = 'to') {
  if (!mol) return { x: 0, y: 0 };

  if (ref.atomB && mol.atoms[ref.atomLabel] && mol.atoms[ref.atomB]) {
    const a = mol.atoms[ref.atomLabel];
    const b = mol.atoms[ref.atomB];
    if (role === 'from') {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    return a;
  }

  if (ref.atomLabel && mol.atoms[ref.atomLabel]) {
    return mol.atoms[ref.atomLabel];
  }

  return Object.values(mol.atoms)[0];
}

function buildLaneMap(ast) {
  const map = new Map();
  let i = 0;
  for (const step of ast.steps) {
    for (const mol of Object.values(step.species)) {
      if (!map.has(mol)) map.set(mol, i++);
    }
  }
  return map;
}

function computePositions(ast, horizontal, laneMap) {
  return ast.steps.map((step, si) => {
    const stepPos = {};
    const aliases = Object.keys(step.species);

    aliases.forEach((alias, i) => {
      stepPos[alias] = horizontal
        ? { x: STEP_X_ORIGIN + si * STEP_X_GAP, y: STEP_Y_ORIGIN + i * MOLECULE_Y_GAP }
        : { x: STEP_X_ORIGIN + i * MOLECULE_X_GAP, y: STEP_Y_ORIGIN + si * STEP_Y_GAP };
    });

    return stepPos;
  });
}

function computeCanvas(positions) {
  let maxX = 0, maxY = 0;
  for (const step of positions) {
    for (const p of Object.values(step)) {
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { width: maxX + PADDING * 2, height: maxY + PADDING * 2 };
}

function renderMolecule(alias, step, ox, oy) {
  const mol = moleculeRegistry[step.species[alias]];
  let svg = '';

  for (const bond of mol.bonds || []) {
    const [a, b] = bond;
    const A = mol.atoms[a], B = mol.atoms[b];
    svg += `<line x1="${ox + A.x}" y1="${oy + A.y}" x2="${ox + B.x}" y2="${oy + B.y}" stroke="black"/>`;
  }

  for (const [k, pos] of Object.entries(mol.atoms)) {
    const lx = ox + pos.x, ly = oy + pos.y;
    const w = 14;

    const box = { x: lx - w/2, y: ly - 9, width: w, height: 18 };
    LABEL_BOXES.push(box);

    svg += `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="white"/>`;
    svg += `<text x="${lx}" y="${ly}" text-anchor="middle">${k}</text>`;
  }

  if (mol.charge) {
    const p = Object.values(mol.atoms)[0];
    svg += `<text x="${ox + p.x + 10}" y="${oy + p.y - 12}">${mol.charge === -1 ? '−' : '+'}</text>`;
  }

  return svg;
}

function sampleQuadratic(x1, y1, cx, cy, x2, y2, t) {
  return {
    x: (1 - t)**2 * x1 + 2*(1 - t)*t * cx + t**2 * x2,
    y: (1 - t)**2 * y1 + 2*(1 - t)*t * cy + t**2 * y2
  };
}

function collides(x1, y1, cx, cy, x2, y2) {
  for (let t = 0; t <= 1; t += 0.05) {
    const p = sampleQuadratic(x1, y1, cx, cy, x2, y2, t);
    for (const b of LABEL_BOXES) {
      if (p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height) {
        return true;
      }
    }
  }
  return false;
}

function arrowPath(x1, y1, x2, y2, arrowIndex = 0) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const base = 40 + arrowIndex * 20;
  const attempts = [
    -base,
    base,
    -(base + 30),
    base + 30,
    -(base + 60),
    base + 60
  ];

  for (const offset of attempts) {
    const cx = mx + offset;
    const cy = my;

    if (!collides(x1, y1, cx, cy, x2, y2)) {
      return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
    }
  }

  // fallback (last attempt)
  const cx = mx - (base + 90);
  return `M ${x1} ${y1} Q ${cx} ${my} ${x2} ${y2}`;
}

function render(ast, horizontal) {
  LABEL_BOXES = [];

  const laneMap = buildLaneMap(ast);
  const pos = computePositions(ast, horizontal, laneMap);
  const { width, height } = computeCanvas(pos);

  let body = '';

  ast.steps.forEach((step, si) => {
    for (const alias of Object.keys(step.species)) {
      const p = pos[si][alias];
      body += renderMolecule(alias, step, p.x, p.y);
    }

    step.arrows.forEach((arrow, ai) => {
      const f = parseArrowRef(arrow.from);
      const t = parseArrowRef(arrow.to);

      const p1 = pos[si][f.alias];
      const p2 = pos[si][t.alias];

      const a1 = getAtomPos(resolveMol(f.alias, step), f, 'from');
      const a2 = getAtomPos(resolveMol(t.alias, step), t, 'to');

      const d = arrowPath(p1.x + a1.x, p1.y + a1.y, p2.x + a2.x, p2.y + a2.y, ai);
      body += `<path d="${d}" stroke="black" fill="none"/>`;
    });
  });

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

const svg = render(ast, layoutHorizontal);
const out = `out/${path.basename(mechFile, '.mech')}.svg`;

mkdirSync('out', { recursive: true });
writeFileSync(out, svg);

console.log(`Rendered → ${out}`);
