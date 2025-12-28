import fs from "fs";
import { parseMechlang } from "./parse.js";

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
   Layout (Stage B: molecules only)
   =============================== */

const layout = {
  reactants: { x: 100, y: 150, gap: 60 },
  products: { x: 450, y: 150, gap: 60 }
};

/* ===============================
   Render molecule text
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
   Build molecule positions
   =============================== */

const reactantPositions = {};
const productPositions = {};

// Reactants
ast.reaction.reactants.forEach((mol, i) => {
  reactantPositions[mol] = {
    x: layout.reactants.x,
    y: layout.reactants.y + i * layout.reactants.gap
  };
});

// Products
ast.reaction.products.forEach((mol, i) => {
  productPositions[mol] = {
    x: layout.products.x,
    y: layout.products.y + i * layout.products.gap
  };
});


/* ===============================
   Stage B anchor resolution
   RULE:
   - take last token of arrow target
   - attach to molecule containing it
   =============================== */

const arrow = ast.arrows[0];

function resolveAnchor(target, preferredMap, fallbackMap) {
  const token = target
    .split("-")
    .pop()
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();

  //  Preferred side first
  for (const mol in preferredMap) {
    const key = mol.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (key.includes(token)) {
      return preferredMap[mol];
    }
  }

  //  Fallback side
  for (const mol in fallbackMap) {
    const key = mol.replace(/[^A-Za-z]/g, "").toUpperCase();
    if (key.includes(token)) {
      return fallbackMap[mol];
    }
  }

  return null;
}


const start = resolveAnchor(
  arrow.from,
  reactantPositions,
  productPositions
);

const end = resolveAnchor(
  arrow.to,
  productPositions,
  reactantPositions
);

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

/* ===============================
   Write file
   =============================== */

fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
