import fs from "fs";
import { parseMechlang } from "./parse.js";

// ---- Input / Output ----
const inputFile = process.argv[2] || "examples/sn2.mech";
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile =
  "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

// ---- Parse ----
const ast = parseMechlang(input);

// ---- Layout model (Stage B) ----
const layout = {
  reactants: { x: 100, y: 150, gap: 60 },
  products: { x: 450, y: 150, gap: 60 }
};

// ---- Anchor offsets ----
const anchorOffsets = {
  "C":  { dx: 0,   dy: 0 },
  "Br": { dx: 40,  dy: 0 },
  "Cl": { dx: 40,  dy: 0 },
  "OH": { dx: -40, dy: 0 },
  "CN": { dx: -40, dy: 0 }
};

// ---- Generate text blocks ----
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

// ---- Build molecule position map ----
const moleculePositions = {};

// Reactants
ast.reaction.reactants.forEach((mol, i) => {
  moleculePositions[mol] = {
    x: layout.reactants.x,
    y: layout.reactants.y + i * layout.reactants.gap
  };
});

// Products
ast.reaction.products.forEach((mol, i) => {
  moleculePositions[mol] = {
    x: layout.products.x,
    y: layout.products.y + i * layout.products.gap
  };
});

// ---- Resolve arrow anchors ----
const arrow = ast.arrows[0];

function resolveAnchor(target) {
  const key = target.replace(/[^A-Z]/g, "");

  // 1️⃣ Exact match (OH-, Br-, CN-, etc.)
  for (const mol in moleculePositions) {
    if (mol.startsWith(key)) {
      const base = moleculePositions[mol];
      const offset = anchorOffsets[key] || { dx: 0, dy: 0 };
      return {
        x: base.x + offset.dx,
        y: base.y + offset.dy
      };
    }
  }

  // 2️⃣ Carbon fallback (Stage B rule)
  if (key === "C") {
    for (const mol in moleculePositions) {
      if (mol.includes("C")) {
        return moleculePositions[mol];
      }
    }
  }

  return null;
}


const start = resolveAnchor(arrow.from);
const end   = resolveAnchor(arrow.to);
if (!start || !end) {
  throw new Error(
    `Failed to resolve arrow anchors: from=${arrow.from}, to=${arrow.to}`
  );
}


// ---- SVG ----
const svg = `
<svg width="650" height="400" xmlns="http://www.w3.org/2000/svg">

  <!-- Reactants -->
  ${reactantTexts}

  <!-- Curved arrow -->
  <path
    d="M ${start.x} ${start.y}
       Q ${(start.x + end.x) / 2} ${start.y - 80}
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

// ---- Write output ----
fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
