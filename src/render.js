import fs from "fs";
import path from "path";
import { parseMechlang } from "./parse.js";
import { moleculeRegistry } from "./molecules.js";

console.log("MechLang renderer v0.10 — horizontal timeline support");

// ── CLI ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const inputFile = args.find(a => !a.startsWith("--"));
const layoutArg = args.find(a => a.startsWith("--layout="));
const layoutMode = layoutArg ? layoutArg.split("=")[1] : "vertical";

if (!inputFile) {
  console.error("Usage: node src/render.js <file.mech> [--layout=horizontal]");
  process.exit(1);
}

if (layoutMode !== "vertical" && layoutMode !== "horizontal") {
  console.error(`[mechlang] Unknown layout mode "${layoutMode}". Use vertical or horizontal.`);
  process.exit(1);
}

const input = fs.readFileSync(inputFile, "utf-8");
const baseName = path.basename(inputFile);

const outName = layoutMode === "horizontal"
  ? baseName.replace(".mech", ".horizontal.svg")
  : baseName.replace(".mech", ".svg");

const outputFile = path.join("out", outName);
const ast = parseMechlang(input);

// ── Layout constants ─────────────────────────────────────────────────────────

const STEP_Y_GAP     = 160;
const STEP_X_GAP     = 260;
const MOLECULE_X_GAP = 180;
const MOLECULE_Y_GAP = 100;
const STEP_Y_ORIGIN  = 140;
const STEP_X_ORIGIN  = 120;

// ── Step builder ─────────────────────────────────────────────────────────────

function buildStep(step, stepIndex) {
  const molecules = [];

  const stepX = layoutMode === "horizontal"
    ? STEP_X_ORIGIN + stepIndex * STEP_X_GAP
    : 120;

  const stepY = layoutMode === "horizontal"
    ? STEP_Y_ORIGIN
    : STEP_Y_ORIGIN + stepIndex * STEP_Y_GAP;

  let moleculeOffsetX = stepX;
  let moleculeOffsetY = stepY;

  for (const [role, name] of Object.entries(step.species)) {
    const template = moleculeRegistry[name];

    if (!template) {
      console.warn(
        `[mechlang] Unknown molecule "${name}" (role: "${role}") — not in registry. Skipping.`
      );
      if (layoutMode === "horizontal") {
        moleculeOffsetY += MOLECULE_Y_GAP;
      } else {
        moleculeOffsetX += MOLECULE_X_GAP;
      }
      continue;
    }

    const atoms = {};
    for (const [sym, pos] of Object.entries(template.atoms)) {
      atoms[sym] = {
        x: moleculeOffsetX + pos.x,
        y: moleculeOffsetY + pos.y
      };
    }

    const bonds = template.bonds.map(([a, b]) => ({
      a, b,
      x1: atoms[a].x, y1: atoms[a].y,
      x2: atoms[b].x, y2: atoms[b].y,
      mx: (atoms[a].x + atoms[b].x) / 2,
      my: (atoms[a].y + atoms[b].y) / 2
    }));

    molecules.push({ role, name, atoms, bonds, charge: template.charge ?? 0 });

    if (layoutMode === "horizontal") {
      moleculeOffsetY += MOLECULE_Y_GAP;
    } else {
      moleculeOffsetX += MOLECULE_X_GAP;
    }
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

  if (mol.atoms[selector]) return mol.atoms[selector];

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

function arrowPath(start, end, arrowIndex = 0) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - (60 + arrowIndex * 20);
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

// ── Charge symbol ────────────────────────────────────────────────────────────

function chargeSymbol(charge) {
  if (charge ===  1) return "+";
  if (charge === -1) return "-";
  return "";
}

// ── Step separator arrows (horizontal mode only) ──────────────────────────────

function stepSeparator(stepIndex, svgParts) {
  if (layoutMode !== "horizontal") return;
  if (stepIndex === 0) return;

  const x = STEP_X_ORIGIN + stepIndex * STEP_X_GAP - 40;
  const y = STEP_Y_ORIGIN + 20;

  svgParts.push(
    `<line x1="${x - 20}" y1="${y}" x2="${x}" y2="${y}" stroke="#999" stroke-width="1.2" marker-end="url(#arrowhead-gray)"/>`
  );
}

// ── SVG assembly ─────────────────────────────────────────────────────────────

const svgParts = [];

ast.steps.forEach((step, stepIndex) => {
  stepSeparator(stepIndex, svgParts);

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
        `<text x="${pos.x.toFixed(1)}" y="${(pos.y + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-family="sans-serif">${sym}</text>`
      )
    )
  );

  // Charge annotations
  molecules.forEach(m => {
    if (m.charge === 0) return;
    const firstPos = Object.values(m.atoms)[0];
    if (!firstPos) return;
    svgParts.push(
      `<text x="${(firstPos.x + 10).toFixed(1)}" y="${(firstPos.y - 12).toFixed(1)}" font-size="11" font-family="sans-serif" fill="#333">${chargeSymbol(m.charge)}</text>`
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

const svgWidth = layoutMode === "horizontal"
  ? STEP_X_ORIGIN + ast.steps.length * STEP_X_GAP + 200
  : 900;

const svgHeight = layoutMode === "horizontal"
  ? STEP_Y_ORIGIN + Object.keys(ast.steps[0]?.species || {}).length * MOLECULE_Y_GAP + 200
  : Math.max(300, STEP_Y_ORIGIN + ast.steps.length * STEP_Y_GAP + 100);

// ── Final SVG ────────────────────────────────────────────────────────────────

const svg = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
    <marker id="arrowhead-gray" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="#999"/>
    </marker>
  </defs>
  ${svgParts.join("\n  ")}
</svg>`;

fs.writeFileSync(outputFile, svg);
console.log(`Rendered -> ${outputFile}`);
