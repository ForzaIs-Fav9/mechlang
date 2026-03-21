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
// Returns { alias, atomLabel, atomB }
// For "substrate.C-Br": alias="substrate", atomLabel="C", atomB="Br"
// For "nucleophile.O":  alias="nucleophile", atomLabel="O",  atomB=null
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
// role = 'from': electrons LEAVE from bond midpoint (e.g. C-Br bond breaking)
// role = 'to':   electrons ARRIVE at primary atom   (e.g. C being attacked)
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

  if (ref.atomLabel && mol.atoms[ref.atomLabel]) return mol.atoms[ref.atomLabel];
  const first = Object.values(mol.atoms)[0];
  return first ?? { x: 0, y: 0 };
}

// ─── Lane Map ─────────────────────────────────────────────────────────────────
// Assigns each unique molecule key a global lane index by first appearance.
// Used only to determine relative ordering of persistent species within a step.
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

// ─── Position Computation (v0.12) ─────────────────────────────────────────────
// Per-step local re-indexing:
//   - Persistent aliases sorted first by global lane order (visual consistency)
//   - New aliases packed consecutively after persistent ones
//   - Local index 0,1,2,... assigned to this sorted order
// This eliminates lane gap accumulation — every step is compact regardless
// of how many molecules existed in prior steps.
function computePositions(ast, horizontal, laneMap) {
  return ast.steps.map((step, si) => {
    const stepPos    = {};
    const persistSet = new Set(step.persist || []);
    const aliases    = Object.keys(step.species);

    // persistent aliases sorted by global lane (maintains relative order)
    const persistent = aliases
      .filter(a => persistSet.has(a))
      .sort((a, b) => laneMap.get(step.species[a]) - laneMap.get(step.species[b]));

    // new aliases in declaration order
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

  for (const [key, pos] of Object.entries(mol.atoms)) {
    const label = (mol.labels && mol.labels[key]) ? mol.labels[key] : key;
    const lx    = ox + pos.x;
    const ly    = oy + pos.y;
    const w     = label.length > 1 ? label.length * 9 : 14;
    svg += `<rect x="${lx - w/2}" y="${ly - 9}" width="${w}" height="18" fill="white"/>`;
    svg += `<text x="${lx}" y="${ly}" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
  }

  if (mol.charge && mol.charge !== 0) {
    const firstPos    = Object.values(mol.atoms)[0];
    const chargeLabel = mol.charge === 1  ? '+'
                      : mol.charge === -1 ? '−'
                      : mol.charge > 0    ? `${mol.charge}+`
                      :                    `${Math.abs(mol.charge)}−`;
    svg += `<text x="${ox + firstPos.x + 10}" y="${oy + firstPos.y - 12}" font-family="sans-serif" font-size="11">${chargeLabel}</text>`;
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

// ─── Step Transition Arrow ────────────────────────────────────────────────────
function renderStepArrow(x, y) {
  return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="20" fill="#888" text-anchor="middle">→</text>`;
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function render(ast, horizontal) {
  const laneMap           = buildLaneMap(ast);
  const positions         = computePositions(ast, horizontal, laneMap);
  const { width, height } = computeCanvas(positions);

  let body = `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="black"/>
    </marker>
  </defs>`;

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

      const fromMol     = resolveMol(fromRef.alias, step);
      const toMol       = resolveMol(toRef.alias,   step);
      const fromAtomPos = getAtomPos(fromMol, fromRef, 'from');
      const toAtomPos   = getAtomPos(toMol,   toRef,   'to');

      const fromStepPos = stepPos[fromRef.alias];
      const toStepPos   = stepPos[toRef.alias];

      if (!fromStepPos || !toStepPos) continue;

      const x1 = fromStepPos.x + fromAtomPos.x;
      const y1 = fromStepPos.y + fromAtomPos.y;
      const x2 = toStepPos.x  + toAtomPos.x;
      const y2 = toStepPos.y  + toAtomPos.y;

      const d = arrowPath(x1, y1, x2, y2, ai);
      body += `<path d="${d}" fill="none" stroke="black" stroke-width="1.5" marker-end="url(#arrowhead)"/>`;
    }

    if (si < ast.steps.length - 1) {
      if (horizontal) {
        const x = STEP_X_ORIGIN + si * STEP_X_GAP + STEP_X_GAP / 2;
        const y = STEP_Y_ORIGIN - 40;
        body += renderStepArrow(x, y);
      } else {
        const x = width / 2;
        const y = STEP_Y_ORIGIN + si * STEP_Y_GAP + STEP_Y_GAP / 2;
        body += renderStepArrow(x, y);
      }
    }
  }

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`;
}

// ─── Output ───────────────────────────────────────────────────────────────────
const svgContent = render(ast, layoutHorizontal);
const baseName   = path.basename(mechFile, '.mech');
const suffix     = layoutHorizontal ? '.horizontal.svg' : '.svg';
const outPath    = `out/${baseName}${suffix}`;

mkdirSync('out', { recursive: true });
writeFileSync(outPath, svgContent);
console.log(`✅  Rendered → ${outPath}`);
