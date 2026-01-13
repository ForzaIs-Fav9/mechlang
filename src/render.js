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
          x1: atoms[a].x,
          y1: atoms[a].y,
          x2: atoms[b].x,
          y2: atoms[b].y
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
   Optional molecule labels (debug)
   =============================== */

function renderMoleculeLabels(molecules) {
  if (!SHOW_MOLECULE_LABELS) return "";
  return molecules.map(mol =>
    `<text x="${mol.base.x - 20}" y="${mol.base.y + 20}" font-size="14">
      ${mol.name}
     </text>`
  ).join("\n");
}

/* ===============================
   Bond rendering
   =============================== */

function renderBonds(molecules) {
  return molecules.flatMap(mol =>
    mol.bonds.map(bond =>
      `<line x1="${bond.x1}" y1="${bond.y1}"
             x2="${bond.x2}" y2="${bond.y2}"
             stroke="black" stroke-width="1.5" />`
    )
  ).join("\n");
}

/* ===============================
   Atom label rendering (NEW)
   =============================== */

function renderAtoms(molecules) {
  return molecules.flatMap(mol =>
    Object.entries(mol.atoms).map(([symbol, pos]) =>
      `<text x="${pos.x}" y="${pos.y + 5}"
             font-size="14"
             text-anchor="middle"
             font-family="serif">
        ${symbol}
       </text>`
    )
  ).join("\n");
}

/* ===============================
   Anchor resolution
   =============================== */

function canonicalAtom(target, direction) {
  if (/^[A-Z][a-z]?$/.test(target)) return target;

  const map = { OH: "O", CN: "C" };
  if (map[target]) return map[target];

  if (target.includes("-")) {
    const [a, b] = target.split("-");
    return direction === "from" ? b : a;
  }
  return null;
}

function resolveAnchor(target, direction) {
  const clean = target.replace(":", "");
  const atom = canonicalAtom(clean, direction);

  for (const mol of molecules) {
    if (atom && mol.atoms[atom]) {
      return mol.atoms[atom];
    }
  }

  console.warn("Unresolved arrow anchor:", target);
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

/* ===============================
   Render arrows
   =============================== */

function renderArrows(arrows) {
  return arrows.map(arrow => {
    const start = resolveAnchor(arrow.from, "from");
    const end   = resolveAnchor(arrow.to, "to");

    if (!start || !end) return "";

    return `
      <path
        d="${arrowPath(start, end)}"
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
