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
   Input / Output
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
  reactants: { x: 100, y: 150, gap: 60 },
  products:  { x: 450, y: 150, gap: 60 }
};

/* ===============================
   Molecule labels
   =============================== */

const reactantTexts = ast.reaction.reactants
  .map((mol, i) => {
    const y = layout.reactants.y + i * layout.reactants.gap;
    return `<text x="${layout.reactants.x}" y="${y}" font-size="16">${mol}</text>`;
  })
  .join("\n");

const productTexts = ast.reaction.products
  .map((mol, i) => {
    const y = layout.products.y + i * layout.products.gap;
    return `<text x="${layout.products.x}" y="${y}" font-size="16">${mol}</text>`;
  })
  .join("\n");

/* ===============================
   Molecule positions
   =============================== */

const moleculePositions = {};

function addMolecules(list, xBase, yBase) {
  list.forEach((mol, i) => {
    moleculePositions[mol] = {
      base: {
        x: xBase,
        y: yBase + i * layout.reactants.gap
      },
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

  const groupMap = {
    OH: "O",
    CN: "C",
    NO2: "N",
    NH2: "N",
    COOH: "C"
  };
  if (groupMap[target]) return groupMap[target];

  if (target.includes("-")) {
    const [a, b] = target.split("-");
    return direction === "from" ? b : a;
  }

  return null;
}

/* ===============================
   Lone pair offset
   =============================== */

function lonePairOffset(atom) {
  return {
    x: atom === "Br" ? 12 : -12,
    y: -12
  };
}

/* ===============================
   Anchor resolution (C.5)
   =============================== */

function resolveAnchor(target, direction) {
  const isLonePair = target.startsWith(":");
  const clean = isLonePair ? target.slice(1) : target;

  // 🔹 BOND TARGET → midpoint
  if (clean.includes("-") && direction === "to") {
    const [a, b] = clean.split("-");

    for (const mol in moleculePositions) {
      const atoms = moleculePositions[mol].atoms;
      if (atoms[a] && atoms[b]) {
        const base = moleculePositions[mol].base;
        return {
          x: base.x + (atoms[a].x + atoms[b].x) / 2,
          y: base.y + (atoms[a].y + atoms[b].y) / 2
        };
      }
    }
  }

  // 🔹 ATOM / GROUP TARGET
  const atom = canonicalAtom(clean, direction);
  if (!atom) return null;

  for (const mol in moleculePositions) {
    const molData = moleculePositions[mol];
    const atomData = molData.atoms[atom];
    if (!atomData) continue;

    let x = molData.base.x + atomData.x;
    let y = molData.base.y + atomData.y;

    if (isLonePair) {
      const offset = lonePairOffset(atom);
      x += offset.x;
      y += offset.y;
    }

    return { x, y };
  }

  return null;
}

/* ===============================
   Resolve arrow
   =============================== */

const arrow = ast.arrows[0];

const start = resolveAnchor(arrow.from, "from");
const end   = resolveAnchor(arrow.to,   "to");

if (!start || !end) {
  throw new Error(
    `Failed to resolve arrow anchors: from=${arrow.from}, to=${arrow.to}`
  );
}

/* ===============================
   SVG
   =============================== */

const svg = `
<svg width="650" height="400" xmlns="http://www.w3.org/2000/svg">

  ${reactantTexts}

  <path
    d="M ${start.x} ${start.y}
       Q ${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - 80}
       ${end.x} ${end.y}"
    stroke="black"
    fill="none"
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

/* ===============================
   Write output
   =============================== */

fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
