import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { parseMechlang } from './parse.js';
import { moleculeRegistry } from './molecules.js';

const STEP_Y_GAP = 240;
const STEP_X_GAP = 260;
const MOLECULE_X_GAP = 180;
const MOLECULE_Y_GAP = 100;
const STEP_Y_ORIGIN = 140;
const STEP_X_ORIGIN = 120;
const PADDING = 80;

let LABEL_BOXES = [];

const args = process.argv.slice(2);
const mechFile = args.find(a => !a.startsWith('--'));
const layoutHorizontal = args.includes('--layout=horizontal');

if (!mechFile) {
  console.error('Usage: node src/render.js <file.mech> [--layout=horizontal]');
  process.exit(1);
}

const source = readFileSync(mechFile, 'utf8');
const ast = parseMechlang(source);

function resolveMol(alias, step) {
  const molKey = step.species[alias];
  return molKey ? moleculeRegistry[molKey] : null;
}

function parseArrowRef(ref) {
  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) {
    return { alias: ref, atomLabel: null, atomB: null };
  }

  const alias = ref.slice(0, dotIndex);
  const atomPart = ref.slice(dotIndex + 1);
  const dashIdx = atomPart.indexOf('-');

  if (dashIdx === -1) {
    return { alias, atomLabel: atomPart, atomB: null };
  }

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

  return Object.values(mol.atoms)[0] ?? { x: 0, y: 0 };
}

function buildLaneMap(ast) {
  const map = new Map();
  let i = 0;

  for (const step of ast.steps) {
    for (const molKey of Object.values(step.species)) {
      if (!map.has(molKey)) {
        map.set(molKey, i++);
      }
    }
  }

  return map;
}

function getOrderedAliases(step, laneMap) {
  const aliases = Object.keys(step.species);
  const persistSet = new Set(step.persist || []);

  const persistent = aliases
    .filter(alias => persistSet.has(alias))
    .sort((a, b) => {
      const laneA = laneMap.get(step.species[a]) ?? 0;
      const laneB = laneMap.get(step.species[b]) ?? 0;
      return laneA - laneB;
    });

  const novel = aliases.filter(alias => !persistSet.has(alias));

  return [...persistent, ...novel];
}

function computePositions(ast, horizontal, laneMap) {
  return ast.steps.map((step, si) => {
    const stepPos = {};
    const aliases = getOrderedAliases(step, laneMap);

    aliases.forEach((alias, localIndex) => {
      if (horizontal) {
        stepPos[alias] = {
          x: STEP_X_ORIGIN + si * STEP_X_GAP,
          y: STEP_Y_ORIGIN + localIndex * MOLECULE_Y_GAP
        };
      } else {
        stepPos[alias] = {
          x: STEP_X_ORIGIN + localIndex * MOLECULE_X_GAP,
          y: STEP_Y_ORIGIN + si * STEP_Y_GAP
        };
      }
    });

    return stepPos;
  });
}

function computeCanvas(positions) {
  let maxX = 0;
  let maxY = 0;

  for (const stepPos of positions) {
    for (const { x, y } of Object.values(stepPos)) {
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  return {
    width: maxX + PADDING * 2,
    height: maxY + PADDING * 2
  };
}

function renderMolecule(alias, step, ox, oy) {
  const molKey = step.species[alias];
  const mol = molKey ? moleculeRegistry[molKey] : null;

  if (!mol) {
    return `<text x="${ox}" y="${oy}" font-family="sans-serif" font-size="13" fill="red">[${alias}?]</text>`;
  }

  let svg = '';

for (const bond of (mol.bonds || [])) {
  const [aKey, bKey, order = 1] = bond;

  const a1 = mol.atoms[aKey];
  const a2 = mol.atoms[bKey];
  if (!a1 || !a2) continue;

  const x1 = ox + a1.x;
  const y1 = oy + a1.y;
  const x2 = ox + a2.x;
  const y2 = oy + a2.y;

  if (order === 2) {
    const dx  = x2 - x1;
    const dy  = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const nx = (-dy / len) * 3;
    const ny = (dx / len) * 3;

    svg += `<line x1="${x1 + nx}" y1="${y1 + ny}" x2="${x2 + nx}" y2="${y2 + ny}" stroke="black" stroke-width="1.5"/>`;
    svg += `<line x1="${x1 - nx}" y1="${y1 - ny}" x2="${x2 - nx}" y2="${y2 - ny}" stroke="black" stroke-width="1.5"/>`;
  } else {
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="1.5"/>`;
  }
}

  if (mol.charge && mol.charge !== 0) {
    const firstPos = Object.values(mol.atoms)[0];

    const chargeLabel =
      mol.charge === 1 ? '+' :
      mol.charge === -1 ? '−' :
      mol.charge > 0 ? `${mol.charge}+` :
      `${Math.abs(mol.charge)}−`;

    svg += `<text x="${ox + firstPos.x + 10}" y="${oy + firstPos.y - 12}" font-family="sans-serif" font-size="11">${chargeLabel}</text>`;
  }

  return svg;
}

function sampleQuadratic(x1, y1, cx, cy, x2, y2, t) {
  return {
    x: (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2,
    y: (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2
  };
}

function collides(x1, y1, cx, cy, x2, y2) {
  for (let t = 0.08; t <= 0.92; t += 0.05) {
    const p = sampleQuadratic(x1, y1, cx, cy, x2, y2, t);

    for (const b of LABEL_BOXES) {
      if (
        p.x >= b.x &&
        p.x <= b.x + b.width &&
        p.y >= b.y &&
        p.y <= b.y + b.height
      ) {
        return true;
      }
    }
  }

  return false;
}

function arrowPath(x1, y1, x2, y2, arrowIndex = 0) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const goingDown = y2 > y1;

  const base = 40 + arrowIndex * 20;

  // LOCK SIDE
  const preferredOffsets = goingDown
    ? [-base, -(base + 30), -(base + 60), -(base + 90)]
    : [ base,  (base + 30),  (base + 60),  (base + 90)];

  for (const offset of preferredOffsets) {
    const cx = mx + offset;
    const cy = my;

    if (!collides(x1, y1, cx, cy, x2, y2)) {
      return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
    }
  }

  // fallback
  const fallback = preferredOffsets[preferredOffsets.length - 1];

  return `M ${x1} ${y1} Q ${mx + fallback} ${my} ${x2} ${y2}`;
}

function render(ast, horizontal) {
  LABEL_BOXES = [];

  const laneMap = buildLaneMap(ast);
  const pos = computePositions(ast, horizontal, laneMap);
  const { width, height } = computeCanvas(pos);

  let body = '';

  ast.steps.forEach((step, si) => {
    const aliases = getOrderedAliases(step, laneMap);

    for (const alias of aliases) {
      const p = pos[si][alias];
      body += renderMolecule(alias, step, p.x, p.y);
    }

    step.arrows.forEach((arrow, ai) => {
      const f = parseArrowRef(arrow.from ?? '');
      const t = parseArrowRef(arrow.to ?? '');

      const p1 = pos[si][f.alias];
      const p2 = pos[si][t.alias];
      if (!p1 || !p2) return;

      const a1 = getAtomPos(resolveMol(f.alias, step), f, 'from');
      const a2 = getAtomPos(resolveMol(t.alias, step), t, 'to');

      const d = arrowPath(
        p1.x + a1.x,
        p1.y + a1.y,
        p2.x + a2.x,
        p2.y + a2.y,
        ai
      );

      body += `<path d="${d}" stroke="black" fill="none" stroke-width="1.5"/>`;
    });
  });

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

const svg = render(ast, layoutHorizontal);
const out = `out/${path.basename(mechFile, '.mech')}.svg`;

mkdirSync('out', { recursive: true });
writeFileSync(out, svg);

console.log(`Rendered → ${out}`);
