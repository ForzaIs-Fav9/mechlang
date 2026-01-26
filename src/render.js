import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Config
   =============================== */

const SHOW_MOLECULE_LABELS = false;

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
  }
};

/* ===============================
   IO
   =============================== */

const inputFile = process.argv[2];
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile = "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

/* ===============================
   Parse
   =============================== */

const ast = parseMechlang(input);

/* ===============================
   Layout
   =============================== */

const layout = {
  x: 150,
  y: 150,
  gap: 80
};

/* ===============================
   Build molecules
   =============================== */

function buildMolecules(step) {
  return Object.values(step.species).map((name, i) => {
    const template = atomTemplates[name];
    if (!template) return null;

    const base = { x: layout.x, y: layout.y + i * layout.gap };

    const atoms = {};
    for (const a in template.atoms) {
      atoms[a] = {
        x: base.x + template.atoms[a].x,
        y: base.y + template.atoms[a].y
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

    return { name, atoms, bonds };
  }).filter(Boolean);
}

/* ===============================
   Arrow resolution (v0.7)
   =============================== */

function resolveArrowTarget(target, step, molecules) {
  const [role, selector] = target.split(".");
  const moleculeName = step.species[role];

  if (!moleculeName) return null;

  const mol = molecules.find(m => m.name === moleculeName);
  if (!mol) return null;

  if (selector.includes("-")) {
    const [a, b] = selector.split("-");
    const bond = mol.bonds.find(
      bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
    );
    return bond ? { x: bond.mx, y: bond.my } : null;
  }

  return mol.atoms[selector] || null;
}

/* ===============================
   Arrow geometry
   =============================== */

function arrowPath(start, end) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 60;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

/* ===============================
   Rendering
   =============================== */

function renderStep(step) {
  const molecules = buildMolecules(step);

  const bonds = molecules.flatMap(m =>
    m.bonds.map(b =>
      `<line x1="${b.x1}" y1="${b.y1}"
             x2="${b.x2}" y2="${b.y2}"
             stroke="black" />`
    )
  ).join("");

  const atoms = molecules.flatMap(m =>
    Object.entries(m.atoms).map(([s, p]) =>
      `<text x="${p.x}" y="${p.y + 5}"
             font-size="14"
             text-anchor="middle">${s}</text>`
    )
  ).join("");

  const arrows = step.arrows.map(a => {
    const start = resolveArrowTarget(a.from, step, molecules);
    const end = resolveArrowTarget(a.to, step, molecules);
    if (!start || !end) return "";
    return `<path d="${arrowPath(start, end)}"
                  stroke="black"
                  fill="none"
                  marker-end="url(#arrowhead)" />`;
  }).join("");

  return bonds + atoms + arrows;
}

/* ===============================
   SVG
   =============================== */

const svg = `
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>

  ${ast.steps.map(renderStep).join("")}
</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log("Rendered", outputFile);
