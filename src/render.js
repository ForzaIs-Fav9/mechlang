import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Config
   =============================== */

const SHOW_MOLECULE_LABELS = false;
const ARROW_VERTICAL_SPACING = 22;

/* ===============================
   Atom templates (visual only)
   =============================== */

const atomTemplates = {
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } },
    bonds: [["C", "Br"]]
  },

  "OH-": {
    atoms: { O: { x: 0, y: 0 }, H: { x: 20, y: 0 } },
    bonds: [["O", "H"]]
  },

  "CN-": {
    atoms: { C: { x: 0, y: 0 }, N: { x: -25, y: 0 } },
    bonds: [["C", "N"]]
  },

  "CH3-OH": {
    atoms: {
      C: { x: 0, y: 0 },
      O: { x: 40, y: 0 },
      H: { x: 60, y: 0 }
    },
    bonds: [["C", "O"], ["O", "H"]]
  }
};

/* ===============================
   IO
   =============================== */

const inputFile = process.argv[2] || "examples/sn2.mech";
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile =
  "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

/* ===============================
   Parse
   =============================== */

const ast = parseMechlang(input);

/* ===============================
   Layout
   =============================== */

const layout = {
  reactants: { x: 120, y: 150, gap: 60 },
  products: { x: 520, y: 150, gap: 60 }
};

/* ===============================
   Build molecule models
   =============================== */

function buildMolecules(list, xBase, yBase) {
  return list.map((name, i) => {
    const template = atomTemplates[name] || { atoms: {}, bonds: [] };
    const base = { x: xBase, y: yBase + i * layout.reactants.gap };

    const atoms = {};
    for (const atom in template.atoms) {
      atoms[atom] = {
        x: base.x + template.atoms[atom].x,
        y: base.y + template.atoms[atom].y
      };
    }

    const bonds = template.bonds
      .map(([a, b]) => ({
        a, b,
        x1: atoms[a].x,
        y1: atoms[a].y,
        x2: atoms[b].x,
        y2: atoms[b].y,
        mx: (atoms[a].x + atoms[b].x) / 2,
        my: (atoms[a].y + atoms[b].y) / 2
      }));

    return { name, base, atoms, bonds };
  });
}

const molecules = [
  ...buildMolecules(ast.reaction.reactants, layout.reactants.x, layout.reactants.y),
  ...buildMolecules(ast.reaction.products, layout.products.x, layout.products.y)
];

/* ===============================
   Rendering helpers
   =============================== */

function renderBonds() {
  return molecules.flatMap(m =>
    m.bonds.map(b =>
      `<line x1="${b.x1}" y1="${b.y1}"
             x2="${b.x2}" y2="${b.y2}"
             stroke="black" stroke-width="1.5" />`
    )
  ).join("\n");
}

function renderAtoms() {
  return molecules.flatMap(m =>
    Object.entries(m.atoms).map(([sym, pos]) =>
      `<text x="${pos.x}" y="${pos.y + 5}"
             font-size="14"
             text-anchor="middle"
             font-family="serif">${sym}</text>`
    )
  ).join("\n");
}

/* ===============================
   Arrow anchor resolution
   =============================== */

function resolveTarget(target) {
  const clean = target.replace(":", "");

  if (clean.includes("-")) {
    const [a, b] = clean.split("-");
    for (const m of molecules) {
      const bond = m.bonds.find(
        bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
      );
      if (bond) return { x: bond.mx, y: bond.my };
    }
  }

  for (const m of molecules) {
    if (m.atoms[clean]) return m.atoms[clean];
  }

  return null;
}

/* ===============================
   Arrow geometry (v0.6)
   =============================== */

function arrowPath(start, end, index) {
  const dx = end.x - start.x;
  const curvature = Math.sign(dx || 1) * (70 + index * 10);
  const verticalLift = index * ARROW_VERTICAL_SPACING;

  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - curvature - verticalLift;

  return `M ${start.x} ${start.y}
          Q ${cx} ${cy}
            ${end.x} ${end.y}`;
}

function renderArrows() {
  return ast.arrows.map((a, i) => {
    const start = resolveTarget(a.from);
    const end = resolveTarget(a.to);
    if (!start || !end) return "";

    return `
      <path d="${arrowPath(start, end, i)}"
            stroke="black"
            fill="none"
            stroke-width="1.5"
            marker-end="url(#arrowhead)" />
    `;
  }).join("\n");
}

/* ===============================
   SVG
   =============================== */

const svg = `
<svg width="750" height="420" xmlns="http://www.w3.org/2000/svg">

  ${renderArrows()}
  ${renderBonds()}
  ${renderAtoms()}

  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>

</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log("Rendered", outputFile);
