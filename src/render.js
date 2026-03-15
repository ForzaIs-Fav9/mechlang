import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { parse } from './parse.js';
import { moleculeRegistry } from './molecules.js';

// ─── Layout Constants ─────────────────────────────────────────────────────────
const STEP_Y_GAP      = 240;
const STEP_X_GAP      = 260;
const MOLECULE_X_GAP  = 180;
const MOLECULE_Y_GAP  = 100;
const STEP_Y_ORIGIN   = 140;
const STEP_X_ORIGIN   = 120;
const PADDING         = 80;

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
const ast    = parse(source);

// ─── Position Computation ─────────────────────────────────────────────────────
// Returns: positions[stepIndex] = { speciesName: { x, y } }
function computePositions(ast, horizontal) {
  return ast.steps.map((step, si) => {
    const speciesNames = Object.keys(step.species);
    const stepPos = {};

    speciesNames.forEach((name, mi) => {
      if (horizontal) {
        stepPos[name] = {
          x: STEP_X_ORIGIN + si * STEP_X_GAP,
          y: STEP_Y_ORIGIN + mi * MOLECULE_Y_GAP,
        };
      } else {
        stepPos[name] = {
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

  return {
    width:  maxX + PADDING * 2,
    height: maxY + PADDING * 2,
  };
}

// ─── Molecule Renderer ────────────────────────────────────────────────────────
function renderMolecule(name, ox, oy) {
  const mol = moleculeRegistry[name];

  if (!mol) {
    return `<text x="${ox}" y="${oy}" font-family="sans-serif" font-size="14" fill="red">[${name}?]</text>`;
  }

  let svg = '';

  // Bonds
  for (const bond of (mol.bonds || [])) {
    const a1 = mol.atoms[bond.from];
    const a2 = mol.atoms[bond.to];
    const x1 = ox + a1.x;
    const y1 = oy + a1.y;
    const x2 = ox + a2.x;
    const y2 = oy + a2.y;

    if (bond.order === 2) {
      const dx  = x2 - x1;
      const dy  = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx  = (-dy / len) * 3;
      const ny  = (dx / len) * 3;
      svg += `<line x1="${x1 + nx}" y1="${y1 + ny}" x2="${x2 + nx}" y2="${y2 + ny}" stroke="black" stroke-width="1.5"/>`;
      svg += `<line x1="${x1 - nx}" y1="${y1 - ny}" x2="${x2 - nx}" y2="${y2 - ny}" stroke="black" stroke-width="1.5"/>`;
    } else {
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="1.5"/>`;
    }
  }

  // Atom labels
  for (const atom of mol.atoms) {
    const ax = ox + atom.x;
    const ay = oy + atom.y;
    svg += `<text x="${ax}" y="${ay}" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">${atom.label}</text>`;
  }

  // Charge label (offset from first atom)
  if (mol.charge !== undefined && mol.charge !== 0) {
    const first       = mol.atoms[0];
    const cx          = ox + first.x + 10;
    const cy          = oy + first.y - 12;
    const chargeLabel = mol.charge === 1  ? '+'
                      : mol.charge === -1 ? '−'
                      : mol.charge > 0    ? `${mol.charge}+`
                      :                     `${Math.abs(mol.charge)}−`;
    svg += `<text x="${cx}" y="${cy}" font-family="sans-serif" font-size="11" fill="black">${chargeLabel}</text>`;
  }

  return svg;
}

// ─── Arrow Path ───────────────────────────────────────────────────────────────
// CRITICAL: x1/y1 = fromAtom, x2/y2 = toAtom — direction always preserved from AST.
// Bowing mode is geometry-based, but START and END are never swapped.
function arrowPath(x1, y1, x2, y2, arrowIndex = 0) {
  const dx     = Math.abs(x2 - x1);
  const dy     = Math.abs(y2 - y1);
  const offset = 60 + arrowIndex * 20;

  let cx, cy;

  if (dx >= dy) {
    // Horizontal-dominant → bow upward
    cx = (x1 + x2) / 2;
    cy = Math.min(y1, y2) - offset;
  } else {
    // Vertical-dominant → bow rightward
    cx = Math.max(x1, x2) + offset;
    cy = (y1 + y2) / 2;
  }

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

// ─── Step Transition Arrow (→) ────────────────────────────────────────────────
function renderStepArrow(x, y) {
  return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="20" fill="#888" text-anchor="middle">→</text>`;
}

// ─── Main Render ──────────────────────────────────────────────────────────────
function render(ast, horizontal) {
  const positions          = computePositions(ast, horizontal);
  const { width, height }  = computeCanvas(positions);

  let body = '';

  // Arrowhead marker
  body += `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="black"/>
    </marker>
  </defs>`;

  for (let si = 0; si < ast.steps.length; si++) {
    const step    = ast.steps[si];
    const stepPos = positions[si];

    // Render all molecules in this step
    for (const [name, pos] of Object.entries(stepPos)) {
      body += renderMolecule(name, pos.x, pos.y);
    }

    // Render mechanism arrows — direction strictly from AST (from → to), never swapped
    for (let ai = 0; ai < step.arrows.length; ai++) {
      const arrow   = step.arrows[ai];
      const fromPos = stepPos[arrow.from];
      const toPos   = stepPos[arrow.to];

      if (!fromPos || !toPos) continue;

      const fromMol  = moleculeRegistry[arrow.from];
      const toMol    = moleculeRegistry[arrow.to];
      const fromAtom = fromMol?.atoms?.[0] ?? { x: 0, y: 0 };
      const toAtom   = toMol?.atoms?.[0]   ?? { x: 0, y: 0 };

      // ✅ from is always x1/y1, to is always x2/y2 — no geometry-based swapping
      const x1 = fromPos.x + fromAtom.x;
      const y1 = fromPos.y + fromAtom.y;
      const x2 = toPos.x  + toAtom.x;
      const y2 = toPos.y  + toAtom.y;

      const d = arrowPath(x1, y1, x2, y2, ai);
      body += `<path d="${d}" fill="none" stroke="black" stroke-width="1.5" marker-end="url(#arrowhead)"/>`;
    }

    // Render → between steps
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
