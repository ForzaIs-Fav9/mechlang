import fs from "fs";
import path from "path";
import { parseMechlang } from "./parse.js";

console.log("USING ATOM-LEVEL, STEP-AWARE RENDERER v0.8");

// ---- Atom templates ----
const atomTemplates = {
  "CN-": {
    atoms: { N: { x: 0, y: 0 }, C: { x: 25, y: 0 } },
    bonds: [["N", "C"]]
  },
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } },
    bonds: [["C", "Br"]]
  }
};

// ---- CLI ----
const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: node src/render.js <file.mech>");
  process.exit(1);
}

const input = fs.readFileSync(inputFile, "utf-8");

const baseName = path.basename(inputFile);
const outputFile = path.join("out", baseName.replace(".mech", ".svg"));

const ast = parseMechlang(input);

const STEP_Y_GAP = 160;
const MOLECULE_X_GAP = 140;

// ---- Step builder ----
function buildStep(step, stepIndex) {
  const molecules = [];

  let x = 120;
  const y = 120 + stepIndex * STEP_Y_GAP;

  for (const [role, name] of Object.entries(step.species)) {
    const template = atomTemplates[name];
    if (!template) continue;

    const atoms = {};

    for (const [sym, pos] of Object.entries(template.atoms)) {
      atoms[sym] = {
        x: x + pos.x,
        y: y + pos.y
      };
    }

    const bonds = template.bonds.map(([a, b]) => ({
      a,
      b,
      x1: atoms[a].x,
      y1: atoms[a].y,
      x2: atoms[b].x,
      y2: atoms[b].y,
      mx: (atoms[a].x + atoms[b].x) / 2,
      my: (atoms[a].y + atoms[b].y) / 2
    }));

    molecules.push({ role, name, atoms, bonds });

    x += MOLECULE_X_GAP;
  }

  return molecules;
}

// ---- Arrow resolution ----
function resolveArrowTarget(expr, molecules) {
  if (!expr) return null;

  const [role, selector] = expr.split(".");
  const mol = molecules.find(m => m.role === role);
  if (!mol) return null;

  // bond target
  if (selector.includes("-")) {
    const [a, b] = selector.split("-");
    const bond = mol.bonds.find(
      bd => (bd.a === a && bd.b === b) ||
            (bd.a === b && bd.b === a)
    );
    if (bond) return { x: bond.mx, y: bond.my };
  }

  // atom target
  if (mol.atoms[selector]) {
    return mol.atoms[selector];
  }

  return null;
}

function arrowPath(start, end) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 60;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

// ---- SVG assembly ----
let svgContent = "";

ast.steps.forEach((step, i) => {
  const molecules = buildStep(step, i);

  // bonds
  molecules.forEach(m =>
    m.bonds.forEach(b =>
      svgContent += `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}" stroke="black"/>`
    )
  );

  // atoms
  molecules.forEach(m =>
    Object.entries(m.atoms).forEach(([sym, pos]) =>
      svgContent += `<text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" font-size="14">${sym}</text>`
    )
  );

  // arrows
  step.arrows.forEach(a => {
    const start = resolveArrowTarget(a.from, molecules);
    const end = resolveArrowTarget(a.to, molecules);
    if (!start || !end) return;

    svgContent += `
      <path d="${arrowPath(start, end)}"
            stroke="black"
            fill="none"
            marker-end="url(#arrowhead)" />
    `;
  });
});

const svg = `
<svg width="900" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>
  ${svgContent}
</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log("Rendered", outputFile);
