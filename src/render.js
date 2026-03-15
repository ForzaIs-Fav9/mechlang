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
function parseArrowRef(ref, step) {
  const dotIndex = ref.indexOf('.');
  if (dotIndex === -1) {
    return { alias: ref, atomLabel: null };
  }
  const alias     = ref.slice(0, dotIndex);
  const atomLabel = ref.slice(dotIndex + 1).split('-')[0];
  return { alias, atomLabel };
}

// ─── Atom Position Lookup ─────────────────────────────────────────────────────
function getAtomPos(mol, atomLabel) {
  if (!mol) return { x: 0, y: 0 };
  if (atomLabel && mol.atoms[atomLabel]) return mol.atoms[atomLabel];
  const first = Object.values(mol.atoms)[0];
  return first ?? { x: 0, y: 0 };
}

// ─── Position Computation ─────────────────────────────────────────────────────
function computePositions(ast, horizontal) {
  return ast.steps.map((step, si) => {
    const aliases = Object.keys(step.species);
    const stepPos = {};

    aliases.forEach((alias, mi) => {
      if (horizontal) {
        stepPos[alias] = {
          x: STEP_X_ORIGIN + si * STEP_X_GAP,
          y: STEP_Y_ORIGIN + mi * MOLECULE_Y_GAP,
        };
      } else {
        stepPos[alias] = {
          x: STEP_X_ORIGIN + mi * MOLECULE_X_GAP,
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

  for (const [a, b] of (mol.bonds || [])) {
    const a1 = mol.atoms[a];
    const a2 = mol.atoms[b];
    if (!a1 || !a2) continue;

    const x1 = ox + a1.x;
    const y1 = oy + a1.y;
    const x2 = ox + a2.x;
    const y2 = oy + a2.y;

    if (b === '=' || (a2.order === 2)) {
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

  for (const [label, pos] of Object.entries(mol.atoms)) {
    svg += `<text x="${ox + pos.x}" y="${oy + pos.y}" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">${label}</text>`;
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
  const offset = 60 + arrowIndex * 20;

  let cx, cy;
  if (dx >= dy) {
    cx = (x1 + x2) / 2;
    cy = Math.min(y1, y2) - offset;
  } else {
    cx = Math.max(x1, x2) + offset;
    cy = (y1 + y2) / 2;
  }

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

// ─── Step Transition Arrow ────────────────────────────────────────────────────
function renderStepArrow(x, y) {
  return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="20" fill="#888" text-anchor="middle">→</text>`;
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function render(ast, horizontal) {
  const positions         = computePositions(ast, horizontal);
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

      const fromRef = parseArrowRef(arrow.from ?? '', step);
      const toRef   = parseArrowRef(arrow.to   ?? '', step);

      const fromMol     = resolveMol(fromRef.alias, step);
      const toMol       = resolveMol(toRef.alias, step);
      const fromAtomPos = getAtomPos(fromMol, fromRef.atomLabel);
      const toAtomPos   = getAtomPos(toMol,   toRef.atomLabel);

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
