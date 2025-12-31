import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Atom templates
   =============================== */

const atomTemplates = {
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } }
  },
  "OH-": {
    atoms: { O: { x: 0, y: 0 }, H: { x: 20, y: 0 } }
  },
  "CN-": {
    atoms: { C: { x: 0, y: 0 }, N: { x: -25, y: 0 } }
  },
  "CH3-OH": {
    atoms: { C: { x: 0, y: 0 }, O: { x: 40, y: 0 }, H: { x: 60, y: 0 } }
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
   Labels
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
  const atom = canonicalAtom(target.replace(":", ""), direction);
  if (!atom) return null;

  for (const mol in moleculePositions) {
    const m = moleculePositions[mol];
    if (!m.atoms[atom]) continue;
    return {
      x: m.base.x + m.atoms[atom].x,
      y: m.base.y + m.atoms[atom].y
    };
  }
  return null;
}

/* ===============================
   Arrow geometry (FIXED)
   =============================== */

function arrowPath(start, end) {
  const dx = end.x - start.x;

  // Force left → right chemistry bias
  const curvature = Math.sign(dx || 1) * 80;

  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - Math.abs(curvature);

  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

/* ===============================
   Resolve arrow
   =============================== */

const arrow = ast.arrows[0];
const start = resolveAnchor(arrow.from, "from");
const end   = resolveAnchor(arrow.to,   "to");

if (!start || !end) {
  throw new Error("Arrow anchors unresolved");
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
