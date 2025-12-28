import fs from "fs";
import { parseMechlang } from "./parse.js";

// ---- Input / Output ----
const inputFile = process.argv[2] || "examples/sn2.mech";
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile =
  "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

// ---- Parse ----
const ast = parseMechlang(input);

// ---- Layout model (Stage A) ----
const layout = {
  reactants: { x: 100, y: 200, gap: 80 },
  products: { x: 500, y: 200, gap: 80 }
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

// ---- Crude arrow logic (unchanged, allowed for Stage A) ----
const arrow = ast.arrows[0];

let start = { x: 160, y: 200 };
let end = { x: 440, y: 200 };

if (arrow.from.includes("OH")) {
  start = { x: layout.reactants.x + 40, y: layout.reactants.y };
}

if (arrow.to === "C") {
  end = { x: layout.products.x - 40, y: layout.products.y };
}

if (arrow.to === "Br") {
  end = { x: layout.products.x - 40, y: layout.products.y + layout.products.gap };
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
