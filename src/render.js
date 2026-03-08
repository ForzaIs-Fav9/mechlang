/**
 * render.js — MechLang Renderer v0.9
 *
 * Consumes the AST produced by parse.js and generates a deterministic SVG.
 *
 * Renderer contract:
 *   - Never crashes on valid mechlang syntax.
 *   - Produces SVG for every parsed input.
 *   - Semantic correctness over visual perfection.
 *   - Deterministic: identical input → identical output.
 *   - No chemistry inference beyond what the AST explicitly encodes.
 */

import fs from "fs";
import path from "path";
import { parseMechlang } from "./parse.js";
import { moleculeRegistry } from "./molecules.js";

console.log("MechLang renderer v0.9 — molecule registry + charge rendering");

// ── CLI ──────────────────────────────────────────────────────────────────────

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Usage: node src/render.js <file.mech>");
  process.exit(1);
}

const input = fs.readFileSync(inputFile, "utf-8");
const baseName = path.basename(inputFile);
const outputFile = path.join("out", baseName.replace(".mech", ".svg"));

const ast = parseMechlang(input);

// ── Layout constants ─────────────────────────────────────────────────────────

const STEP_Y_GAP    = 160;
const MOLECULE_X_GAP = 180;
const STEP_Y_ORIGIN  = 140;

// ── Step builder ─────────────────────────────────────────────────────────────

function buildStep(step, stepIndex) {
  const molecules = [];
  let x = 120;
  const y = STEP_Y_ORIGIN + stepIndex * STEP_Y_GAP;

  for (const [role, name] of Object.entries(step.species)) {
    const template = moleculeRegistry[name];

    if (!template) {
      console.warn(
        `[mechlang] Unknown molecule "${name}" (role: "${role}") — not in registry. Skipping.`
      );
      x += MOLECULE_X_GAP;
      continue;
    }

    const atoms = {};
    for (const [sym, pos] of Object.entries(template.atoms)) {
      atoms[sym] = { x: x + pos.x, y: y + pos.y };
    }

    const bonds = template.bonds.map(([a, b]) => ({
      a, b,
      x1: atoms[a].x, y1: atoms[a].y,
      x2: atoms[b].x, y2: atoms[b].y,
      mx: (atoms[a].x + atoms[b].x) / 2,
      my: (atoms[a].y + atoms[b].y) / 2
    }));

    molecules.push({ role, name, atoms, bonds, charge: template.charge ?? 0 });
    x += MOLECULE_X_GAP;
  }

  return molecules;
}

// ── Arrow resolution ─────────────────────────────────────────────────────────

function resolveArrowTarget(expr, molecules) {
  if (!expr) return null;

  const dotIndex = expr.indexOf(".");
  if (dotIndex === -1) {
    console.warn(`[mechlang] Arrow target "${expr}" missing role.selector format. Skipping.`);
    return null;
  }

  const role     = expr.slice(0, dotIndex);
  const selector = expr.slice(dotIndex + 1);
  const mol      = molecules.find(m => m.role === role);

  if (!mol) {
    console.warn(`[mechlang] No molecule found for role "${role}". Skipping arrow target.`);
    return null;
  }

  // Bond selector: e.g. C-Br
  if (selector.includes("-")) {
    const [a, b] = selector.split("-");
    const bond = mol.bonds.find(
      bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
    );
    if (bond) return { x: bond.mx, y: bond.my };
    console.warn(
      `[mechlang] Bond "${selector}" not found in "${mol.name}". Falling back to first atom.`
    );
  }

  // Atom selector
  if (mol.atoms[selector]) return mol.atoms[selector];

  // Last resort: first atom
  const firstAtom = Object.values(mol.atoms)[0];
  if (firstAtom) {
    console.warn(
      `[mechlang] Selector "${selector}" not found in "${mol.name}". Using first atom as fallback.`
    );
    return firstAtom;
  }

  return null;
}

// ── Arrow path ───────────────────────────────────────────────────────────────
//
// Control point is offset perpendicular to arrow direction.
// arrowIndex staggers multiple arrows per step to prevent visual overlap.

function arrowPath(start, end, arrowIndex = 0) {
  const dx  = end.x - start.x;
  const dy  = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Perpendicular unit vector (90° CCW)
  const nx = -dy / len;
  const ny =  dx / len;

  const offset = 50 + arrowIndex * 20;
  const cx = (start.x + end.x) / 2 + nx * offset;
  const cy = (start.y + end.y) / 2 + ny * offset;

  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

// ── Charge symbol ────────────────────────────────────────────────────────────

function chargeSymbol(charge) {
  if (charge ===  1) return "+";
  if (charge === -1) return "−";
  return "";
}

// ── SVG assembly ─────────────────────────────────────────────────────────────

const svgParts = [];

ast.steps.forEach((step, stepIndex) => {
  const molecules = buildStep(step, stepIndex);

  // Bonds
  molecules.forEach(m =>
    m.bonds.forEach(b =>
      svgParts.push(
        `<line x1="${b.x1.toFixed(1)}" y1="${b.y1.toFixed(1)}" x2="${b.x2.toFixed(1)}" y2="${b.y2.toFixed(1)}" stroke="black" stroke-width="1.5"/>`
      )
    )
  );

  // Atom labels
  molecules.forEach(m =>
    Object.entries(m.atoms).forEach(([sym, pos]) =>
      svgParts.push(
        `<text x="${pos.x.toFixed(1)}" y="${(pos.y + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-family="serif">${sym}</text>`
      )
    )
  );

  // Charge annotations
  molecules.forEach(m => {
    if (m.charge === 0) return;
    const firstPos = Object.values(m.atoms)[0];
    if (!firstPos) return;
    svgParts.push(
      `<text x="${(firstPos.x + 16).toFixed(1)}" y="${(firstPos.y - 12).toFixed(1)}" font-size="11" font-family="serif" fill="#333">${chargeSymbol(m.charge)}</text>`
    );
  });

  // Curved arrows
  step.arrows.forEach((a, arrowIndex) => {
    const start = resolveArrowTarget(a.from, molecules);
    const end   = resolveArrowTarget(a.to,   molecules);
    if (!start || !end) {
      console.warn(
        `[mechlang] Arrow ${arrowIndex + 1} in step ${stepIndex + 1} unresolved. Skipping.`
      );
      return;
    }
    svgParts.push(
      `<path d="${arrowPath(start, end, arrowIndex)}" stroke="black" stroke-width="1.5" fill="none" marker-end="url(#arrowhead)"/>`
    );
  });
});

// ── Dynamic canvas size ──────────────────────────────────────────────────────

const svgWidth  = 900;
const svgHeight = Math.max(300, STEP_Y_ORIGIN + ast.steps.length * STEP_Y_GAP + 100);

// ── Final SVG ────────────────────────────────────────────────────────────────

const svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>
  ${svgParts.join("\n  ")}
</svg>`;

fs.writeFileSync(outputFile, svg);
console.log(`Rendered -> ${outputFile}`);
