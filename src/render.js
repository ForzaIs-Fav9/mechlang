import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Atom layout templates (Stage C.2)
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
   Layout (Stage B)
   =============================== */

const layout = {
  reactants: { x: 100, y: 150, gap: 60 },
  products:  { x: 450, y: 150, gap: 60 }
};

/* ===============================
   Render molecule labels
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
   Molecule + atom positions
   =============================== */

const moleculePositions = {};

// Reactants
ast.reaction.reactants.forEach((mol, i) => {
  moleculePositions[mol] = {
    base: {
      x: layout.reactants.x,
      y: layout.reactants.y + i * layout.reactants.gap
    },
    atoms: atomTemplates[mol]?.atoms || {}
  };
});

// Products
ast.reaction.products.forEach((mol, i) => {
  moleculePositions[mol] = {
    base: {
      x: layout.products.x,
      y: layout.products.y + i * layout.products.gap
    },
    atoms: atomTemplates[mol]?.atoms || {}
  };
});

/* ===============================
   Stage C.3 — Implicit atom resolution
   =============================== */

function canonicalAtom(target, direction) {
  // 1. Explicit atom (O, N, Br)
  if (/^[A-Z][a-z]?$/.test(target)) return target;

  // 2. Functional groups
  const groupMap = {
    "OH": "O",
    "CN": "C",
    "NO2": "N",
    "NH2": "N",
    "COOH": "C"
  };
  if (groupMap[target]) return groupMap[target];

  // 3. Bond reference (C-Br)
  if (target.includes("-")) {
    const [a, b] = target.split("-");
    return direction === "from" ? b : a;
  }

  return null;
}

/* ===============================
   Stage C.4 — Lone-pair offsets
   =============================== */

function lonePairOffset(atom) {
  const offsets = {
    O:  { x: -12, y: -12 },
    N:  { x: -12, y: -12 },
    Br: { x:  12, y: -12 },
    Cl: { x:  12, y: -12 }
  };
  return offsets[atom] || { x: -10, y: -10 };
}

/* ===============================
   Anchor resolution (C.4)
   =============================== */

function resolveAnchor(target, direction) {
  const isLonePair = target.startsWith(":");
  const cleanTarget = isLonePair ? target.slice(1) : target;

  const atom = canonicalAtom(cleanTarget, direction);
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
   SVG output
   =============================== */

const svg = `
<svg width="650" height="400" xmlns="http://www.w3.org/2000/svg">

  <!-- Reactants -->
  ${reactantTexts}

  <!-- Curved arrow -->
  <path
    d="M ${start.x} ${start.y}
       Q ${(start.x + end.x) / 2} ${Math.min(start.y, end.y) - 80}
       ${end.x} ${end.y}"
    stroke="black"
    fill="none"
    marker-end="url(#arrowhead)" />

  <!-- Products -->
  ${productTexts}

  <!-- Arrowhead -->
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>

</svg>
`;

/* ===============================
   Write file
   =============================== */

fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
