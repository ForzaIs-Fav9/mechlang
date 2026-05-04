import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { parseMechlang } from './parse.js';
import { moleculeRegistry } from './molecules.js';

// ─── Layout Constants ─────────────────────────────────────────────────────────
const STEP_Y_GAP     = 240;
const STEP_X_GAP     = 260;
const MOLECULE_X_GAP = 180;
const MOLECULE_Y_GAP = 100;
const STEP_Y_ORIGIN  = 140;
const STEP_X_ORIGIN  = 120;
const PADDING        = 80;

// ─── Collision Registry (v0.13) ───────────────────────────────────────────────
let LABEL_BOXES = [];

// ─── CLI Args ─────────────────────────────────────────────────────────────────
const args             = process.argv.slice(2);
const mechFile         = args.find(a => !a.startsWith('--'));
const layoutHorizontal = args.includes('--layout=horizontal');

if (!mechFile) {
  console.error('Usage: node src/render.js <file.mech> [--layout=horizontal]');
  process.exit(1);
}

// ─── Parse ────────────────────────────────────────────────────────────────────
const source = readFileSync(mechFile, 'utf8');
const ast    = parseMechlang(source);

// ─── Alias Resolution ─────────────────────────────────────────────────────────
function resolveMol(alias, step) {
  const molKey = step.species[alias];
  return molKey ? moleculeRegistry[molKey] : null;
}

// ─── Dot Notation Parser ──────────────────────────────────────────────────────
function parseArrowRef(ref) {
  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) {
    return { alias: ref, atomLabel: null, atomB: null };
  }

  const alias    = ref.slice(0, dotIndex);
  const atomPart = ref.slice(dotIndex + 1);
  const dashIdx  = atomPart.indexOf('-');

  if (dashIdx === -1) {
    return { alias, atomLabel: atomPart, atomB: null };
  }

  return {
    alias,
    atomLabel: atomPart.slice(0, dashIdx),
    atomB:     atomPart.slice(dashIdx + 1),
  };
}

// ─── Atom Position Lookup ─────────────────────────────────────────────────────
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

  const first = Object.values(mol.atoms)[0];
  return first ?? { x: 0, y: 0 };
}

// ─── Lane Map ─────────────────────────────────────────────────────────────────
function buildLaneMap(ast) {
  const laneMap = new Map();
  let laneCount = 0;

  for (const step of ast.steps) {
    for (const molKey of Object.values(step.species)) {
      if (!laneMap.has(molKey)) {
        laneMap.set(molKey, laneCount++);
      }
    }
  }

  return laneMap;
}

// ─── Position Computation ─────────────────────────────────────────────────────
function computePositions(ast, horizontal, laneMap) {
  return ast.steps.map((step, si) => {
    const stepPos    = {};
    const persistSet = new Set(step.persist || []);
    const aliases    = Object.keys(step.species);

    const persistent = aliases
      .filter(a => persistSet.has(a))
      .sort((a, b) => laneMap.get(step.species[a]) - laneMap.get(step.species[b]));

    const novel  = aliases.filter(a => !persistSet.has(a));
    const sorted = [...persistent, ...novel];

    sorted.forEach((alias, localIndex) => {
      if (horizontal) {
        stepPos[alias] = {
          x: STEP_X_ORIGIN + si * STEP_X_GAP,
          y: STEP_Y_ORIGIN + localIndex * MOLECULE_Y_GAP,
        };
      } else {
        stepPos[alias] = {
          x: STEP_X_ORIGIN + localIndex * MOLECULE_X_GAP,
          y: STEP_Y_ORIGIN + si * STEP_Y_GAP,
        };
      }
    });

    return stepPos;
  });
}

// ─── Canvas Dimensions ────────────────────────────────────────────────────────
function computeCanvas(positions) {
  let maxX = 0;
  let maxY = 0;

  for (const stepPos of positions) {
    for (const { x, y } of Object.values(stepPos)) {
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  return { width: maxX + PADDING * 2, height: maxY + PADDING * 2 };
}

// ─── Molecule Renderer ────────────────────────────────────────────────────────
function renderMolecule(alias, step, ox, oy) {
  const molKey = step.species[alias];
  const mol    = molKey ? moleculeRegistry[molKey] : null;

  if (!mol) {
    return `<text x="${ox}" y="${oy}" font-family="sans-serif" font-size="13" fill="red">[${alias}?]</text>`;
  }

  let svg = '';

  // Bonds
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
      const nx  = (-dy / len) * 3;
      const ny  = (dx / len) * 3;

      svg += `<line x1="${x1+nx}" y1="${y1+ny}" x2="${x2+nx}" y2="${y2+ny}" stroke="black" stroke-width="1.5"/>`;
      svg += `<line x1="${x1-nx}" y1="${y1-ny}" x2="${x2-nx}" y2="${y2-ny}" stroke="black" stroke-width="1.5"/>`;
    } else {
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="1.5"/>`;
    }
  }

  // Labels + Bounding Boxes
  for (const [key, pos] of Object.entries(mol.atoms)) {
    const label = (mol.labels && mol.labels[key]) ? mol.labels[key] : key;
    const lx    = ox + pos.x;
    const ly    = oy + pos.y;
    const w     = label.length > 1 ? label.length * 9 : 14;

    const box = {
      x: lx - w / 2,
      y: ly - 9,
      width: w,
      height: 18
    };

    LABEL_BOXES.push(box);

    svg += `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="white"/>`;
    svg += `<text x="${lx}" y="${ly}" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  }

  if (mol.charge && mol.charge !== 0) {
    const firstPos = Object.values(mol.atoms)[0];
    const chargeLabel = mol.charge === 1 ? '+' :
                        mol.charge === -1 ? '−' :
                        mol.charge > 0 ? `${mol.charge}+` :
                        `${Math.abs(mol.charge)}−`;

    svg += `<text x="${ox + firstPos.x + 10}" y="${oy + firstPos.y - 12}" font-size="11">${chargeLabel}</text>`;
  }

  return svg;
}

// ─── Arrow Path ───────────────────────────────────────────────────────────────
function arrowPath(x1, y1, x2, y2, arrowIndex = 0) {
  const dx     = Math.abs(x2 - x1);
  const dy     = Math.abs(y2 - y1);
  const offset = 60 + arrowIndex * 30;
  const mx     = (x1 + x2) / 2;
  const my     = (y1 + y2) / 2;

  let cx, cy;

  if (dx < dy * 0.5) {
    cx = mx - offset;
    cy = my;
  } else if (dx >= dy) {
    cx = mx;
    cy = Math.min(y1, y2) - offset;
  } else {
    cx = Math.max(x1, x2) + offset;
    cy = my;
  }

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function render(ast, horizontal) {

  LABEL_BOXES = []; // reset

  const laneMap           = buildLaneMap(ast);
  const positions         = computePositions(ast, horizontal, laneMap);
  const { width, height } = computeCanvas(positions);

  let body = '';

  for (let si = 0; si < ast.steps.length; si++) {
    const step    = ast.steps[si];
    const stepPos = positions[si];

    for (const alias of Object.keys(step.species)) {
      const pos = stepPos[alias];
      body += renderMolecule(alias, step, pos.x, pos.y);
    }

    for (let ai = 0; ai < step.arrows.length; ai++) {
      const arrow = step.arrows[ai];

      const fromRef = parseArrowRef(arrow.from ?? '');
      const toRef   = parseArrowRef(arrow.to   ?? '');

      const fromMol = resolveMol(fromRef.alias, step);
      const toMol   = resolveMol(toRef.alias,   step);

      const fromAtom = getAtomPos(fromMol, fromRef, 'from');
      const toAtom   = getAtomPos(toMol,   toRef,   'to');

      const p1 = stepPos[fromRef.alias];
      const p2 = stepPos[toRef.alias];
      if (!p1 || !p2) continue;

      const x1 = p1.x + fromAtom.x;
      const y1 = p1.y + fromAtom.y;
      const x2 = p2.x + toAtom.x;
      const y2 = p2.y + toAtom.y;

      const d = arrowPath(x1, y1, x2, y2, ai);

      body += `<path d="${d}" fill="none" stroke="black" stroke-width="1.5"/>`;
    }
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// ─── Output ───────────────────────────────────────────────────────────────────
const svgContent = render(ast, layoutHorizontal);
const baseName   = path.basename(mechFile, '.mech');
const outPath    = `out/${baseName}.svg`;

mkdirSync('out', { recursive: true });
writeFileSync(outPath, svgContent);

console.log(`Rendered → ${outPath}`);
