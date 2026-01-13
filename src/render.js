throw new Error("ATOM RENDERER CONFIRMED");
console.log("USING ATOM-LEVEL RENDERER v0.5");
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
    atoms: {
      C:  { x: 0,  y: 0 },
      Br: { x: 40, y: 0 }
    },
    bonds: [["C", "Br"]]
  },

  "OH-": {
    atoms: {
      O: { x: 0,  y: 0 },
      H: { x: 20, y: 0 }
    },
    bonds: [["O", "H"]]
  },

  "CN-": {
    atoms: {
      C: { x: 0,   y: 0 },
      N: { x: -25, y: 0 }
    },
    bonds: [["C", "N"]]
  },

  "CH3-OH": {
    atoms: {
      C: { x: 0,  y: 0 },
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
  products:  { x: 520, y: 150, gap: 60 }
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

    const bonds = (template.bonds || [])
      .map(([a, b]) => {
        if (!atoms[a] || !atoms[b]) return null;
        return {
          a, b,
          x1: atoms[a].x,
          y1: atoms[a].y,
          x2: atoms[b].x,
          y2: atoms[b].y,
          mx: (atoms[a].x + atoms[b].x) / 2,
          my: (atoms[a].y + atoms[b].y) / 2
        };
      })
      .filter(Boolean);

    return { name, base, atoms, bonds };
  });
}

const reactantMolecules = buildMolecules(
  ast.reaction.reactants,
  layout.reactants.x,
  layout.reactants.y
);

const productMolecules = buildMolecules(
  ast.reaction.products,
  layout.products.x,
  layout.products.y
);

const molecules = [...reactantMolecules, ...productMolecules];

/* ===============================
   Rendering helpers
   =============================== */

function renderBonds(molecules) {
  return molecules.flatMap(mol =>
    mol.bonds.map(b =>
      `<line x1="${b.x1}" y1="${b.y1}"
             x2="${b.x2}" y2="${b.y2}"
             stroke="black" stroke-width="1.5" />`
    )
  ).join("\n");
}

function renderAtoms(molecules) {
  return molecules.flatMap(mol =>
    Object.entries(mol.atoms).map(([sym, pos]) =>
      `<text x="${pos.x}" y="${pos.y + 5}"
             font-size="14"
             text-anchor="middle"
             font-family="serif">${sym}</text>`
    )
  ).join("\n");
}

function renderMoleculeLabels(molecules) {
  if (!SHOW_MOLECULE_LABELS) return "";
  return molecules.map(m =>
    `<text x="${m.base.x}" y="${m.base.y + 20}" font-size="12">${m.name}</text>`
  ).join("\n");
}

/* ===============================
   Anchor resolution (v0.5)
   =============================== */

function resolveArrowTarget(target, direction) {
  const clean = target.replace(":", "");

  // --- BOND TARGET (C-Br) ---
  if (clean.includes("-")) {
    const [a, b] = clean.split("-");
    for (const mol of molecules) {
      const bond = mol.bonds.find(
        bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
      );
      if (bond) {
        return { x: bond.mx, y: bond.my };
      }
    }
  }

  // --- ATOM TARGET ---
  if (/^[A-Z][a-z]?$/.test(clean)) {
    for (const mol of molecules) {
      if (mol.atoms[clean]) return mol.atoms[clean];
    }
  }

  console.warn("Unresolved arrow target:", target);
  return null;
}

/* ===============================
   Arrow geometry
   =============================== */

function arrowPath(start, end) {
  const dx = end.x - start.x;
  const curvature = Math.sign(dx || 1) * 80;

  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - Math.abs(curvature);

  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

function renderArrows(arrows) {
  return arrows.map(a => {
    const start = resolveArrowTarget(a.from, "from");
    const end   = resolveArrowTarget(a.to,   "to");
    if (!start || !end) return "";
    return `
      <path d="${arrowPath(start, end)}"
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

  <!-- Arrows -->
  ${renderArrows(ast.arrows)}

  <!-- Bonds -->
  ${renderBonds(molecules)}

  <!-- Atom labels -->
  ${renderAtoms(molecules)}

  <!-- Debug molecule labels -->
  ${renderMoleculeLabels(molecules)}

  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>

</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
