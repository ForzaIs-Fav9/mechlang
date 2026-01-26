import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Atom templates (visual only)
   =============================== */

const atomTemplates = {
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } },
    bonds: [["C", "Br"]]
  },
  "CN-": {
    atoms: { C: { x: 0, y: 0 }, N: { x: -25, y: 0 } },
    bonds: [["C", "N"]]
  },
  "CH3-OH": {
    atoms: { C: { x: 0, y: 0 }, O: { x: 40, y: 0 }, H: { x: 60, y: 0 } },
    bonds: [["C", "O"], ["O", "H"]]
  }
};

/* ===============================
   IO
   =============================== */

const inputFile = process.argv[2];
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile =
  "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

const ast = parseMechlang(input);

/* ===============================
   Layout
   =============================== */

const STEP_Y_GAP = 140;
const BASE_X = 200;

/* ===============================
   Molecule builder
   =============================== */

function buildMolecules(species, yBase) {
  return species.map((name, i) => {
    const template = atomTemplates[name];
    if (!template) return null;

    const base = { x: BASE_X, y: yBase + i * 40 };
    const atoms = {};
    const bonds = [];

    for (const a in template.atoms) {
      atoms[a] = {
        x: base.x + template.atoms[a].x,
        y: base.y + template.atoms[a].y
      };
    }

    for (const [a, b] of template.bonds) {
      bonds.push({
        a, b,
        x1: atoms[a].x,
        y1: atoms[a].y,
        x2: atoms[b].x,
        y2: atoms[b].y,
        mx: (atoms[a].x + atoms[b].x) / 2,
        my: (atoms[a].y + atoms[b].y) / 2
      });
    }

    return { name, atoms, bonds };
  }).filter(Boolean);
}

/* ===============================
   Arrow resolution
   =============================== */

function resolveTarget(target, molecules) {
  const clean = target.replace(":", "");

  // bond
  if (clean.includes("-")) {
    const [a, b] = clean.split("-");
    for (const m of molecules) {
      const bond = m.bonds.find(
        bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
      );
      if (bond) return { x: bond.mx, y: bond.my };
    }
  }

  // atom
  for (const m of molecules) {
    if (m.atoms[clean]) return m.atoms[clean];
  }

  console.warn("Unresolved arrow target:", target);
  return null;
}

/* ===============================
   Arrow geometry
   =============================== */

function arrowPath(start, end) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 80;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

/* ===============================
   Render
   =============================== */

let svgContent = "";
let yOffset = 100;

for (const step of ast.steps) {
  const molecules = buildMolecules(step.species, yOffset);

  // bonds
  for (const m of molecules) {
    for (const b of m.bonds) {
      svgContent += `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}" stroke="black"/>`;
    }
    for (const [sym, pos] of Object.entries(m.atoms)) {
      svgContent += `<text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle">${sym}</text>`;
    }
  }

  // arrows
  for (const a of step.arrows) {
    const start = resolveTarget(a.from, molecules);
    const end   = resolveTarget(a.to, molecules);
    if (!start || !end) continue;

    svgContent += `
      <path d="${arrowPath(start, end)}"
            stroke="black"
            fill="none"
            marker-end="url(#arrowhead)"/>`;
  }

  yOffset += STEP_Y_GAP;
}

/* ===============================
   SVG wrapper
   =============================== */

const svg = `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
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
