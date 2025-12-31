import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Atom layout templates
   =============================== */

const atomTemplates = {
  "CH3-Br": {
    atoms: {
      C:  { x: 0,  y: 0 },
      Br: { x: 40, y: 0 }
    }
  },
  "OH-": {
    atoms: {
      O: { x: 0,  y: 0 },
      H: { x: 20, y: 0 }
    }
  },
  "CN-": {
    atoms: {
      C: { x: 0,   y: 0 },
      N: { x: -25, y: 0 }
    }
  },
  "CH3-OH": {
    atoms: {
      C: { x: 0,  y: 0 },
      O: { x: 40, y: 0 },
      H: { x: 60, y: 0 }
    }
  }
};

/* ===============================
   IO
   =============================== */

const inputFile = process.argv[2] || "examples/sn2.mech";
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
  reactants: { x: 120, y: 150, gap: 60 },
  products:  { x: 520, y: 150, gap: 60 }
};

/* ===============================
   Molecule labels
   =============================== */

function renderLabels(list, x, yBase) {
  return list.map((mol, i) =>
    `<text x="${x}" y="${yBase + i * layout.reactants.gap}" font-size="16">${mol}</text>`
  ).join("\n");
}

const reactantTexts = renderLabels(ast.reaction.reactants, layout.reactants.x, layout.reactants.y);
const productTexts  = renderLabels(ast.reaction.products,  layout.products.x,  layout.products.y);

/* ===============================
   Molecule positions
   =============================== */

const moleculePositions = {};

function addMolecules(list, xBase, yBase) {
  list.forEach((mol, i) => {
    moleculePositions[mol] = {
      base: { x: xBase, y: yBase + i * layout.reactants.gap },
      atoms: atomTemplates[mol]?.atoms || {}
    };
  });
}

addMolecules(ast.reaction.reactants, layout.reactants.x, layout.reactants.y);
addMolecules(ast.reaction.products,  layout.products.x,  layout.products.y);

/* ===============================
   Canonical atom resolution
   =============================== */

function canonicalAtom(target, direction) {
  if (/^[A-Z][a-z]?$/.test(target)) return target;

  const groupMap = { OH: "O", CN: "C", NO2: "N", NH2: "N", COOH: "C" };
  if (groupMap[target]) return groupMap[target];

  if (target.includes("-")) {
    const [a, b] = target.split("-");
    return direction === "from" ? b : a;
  }
  return null;
}

/* ===============================
   Anchor resolution
   =============================== */

function resolveAnchor(target, direction) {
  const atom = canonicalAtom(target.replace(":", ""), direction);
  if (!atom) return null;

  for (const mol in moleculePositions) {
    const molData = moleculePositions[mol];
    const atomData = molData.atoms[atom];
    if (!atomData) continue;

    return {
      x: molData.base.x + atomData.x,
      y: molData.base.y + atomData.y
    };
  }
  return null;
}

/* ===============================
   Arrow geometry (C.6)
   =============================== */

function arrowPath(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;

  // normal vector
  const nx = -dy / len;
  const ny = dx / len;

  // push arrow off the molecule
  const offset = 14;
  const sx = start.x + nx * offset;
  const sy = start.y + ny * offset;
  const ex = end.x + nx * offset;
  const ey = end.y + ny * offset;

  // curvature
  const curve = 60;
  const cx = (sx + ex) / 2 + nx * curve;
  const cy = (sy + ey) / 2 + ny * curve;

  return `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
}

/* ===============================
   Resolve arrow
   =============================== */

const arrow = ast.arrows[0];
const start = resolveAnchor(arrow.from, "from");
const end   = resolveAnchor(arrow.to,   "to");

if (!start || !end) {
  throw new Error(`Failed to resolve arrow anchors`);
}

/* ===============================
   SVG
   =============================== */

const svg = `
<svg width="750" height="420" xmlns="http://www.w3.org/2000/svg">

  ${reactantTexts}

  <path
    d="${arrowPath(start, end)}"
    stroke="black"
    fill="none"
    stroke-width="1.5"
    marker-end="url(#arrowhead)" />

  ${productTexts}

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
