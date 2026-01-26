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
  "OH-": {
    atoms: { O: { x: 0, y: 0 }, H: { x: 20, y: 0 } },
    bonds: [["O", "H"]]
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

const inputFile = process.argv[2] || "examples/sn2_steps.mech";
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
  reactants: { x: 120, y: 150, gap: 80 },
  products:  { x: 520, y: 150, gap: 80 }
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

const molecules = [
  ...buildMolecules(ast.reaction.reactants, layout.reactants.x, layout.reactants.y),
  ...buildMolecules(ast.reaction.products,  layout.products.x,  layout.products.y)
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
   Step-aware target resolution (v0.7)
   =============================== */

function resolveStepAlias(alias) {
  // alias like "CN:"
  const baseName = alias.replace(":", "");
  const molName = baseName.endsWith("-") ? baseName : `${baseName}-`;

  const mol = molecules.find(m => m.name === molName);
  if (!mol) return null;

  // Prefer heteroatoms for nucleophiles
  const priority = ["N", "O", "S"];
  for (const p of priority) {
    if (mol.atoms[p]) return mol.atoms[p];
  }

  // Fallback: first atom
  const first = Object.values(mol.atoms)[0];
  return first || null;
}

function resolveArrowTarget(target) {
  // Symbolic (step-level) target
  if (target.endsWith(":")) {
    const pos = resolveStepAlias(target);
    if (pos) return pos;
    console.warn("Unresolved symbolic target:", target);
    return null;
  }

  const clean = target.replace(":", "");

  // Bond target (C-Br)
  if (clean.includes("-")) {
    const [a, b] = clean.split("-");
    for (const mol of molecules) {
      const bond = mol.bonds.find(
        bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
      );
      if (bond) return { x: bond.mx, y: bond.my };
    }
  }

  // Atom target
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
  if (!Array.isArray(arrows) || arrows.length === 0) return "";
  return arrows.map(a => {
    const start = resolveArrowTarget(a.from);
    const end   = resolveArrowTarget(a.to);
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
   SVG (step-based)
   =============================== */

const svg = `
<svg width="750" height="420" xmlns="http://www.w3.org/2000/svg">

  ${ast.steps.map(step => renderArrows(step.arrows)).join("\n")}
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
console.log(`Rendered ${outputFile}`);
