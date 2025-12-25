import fs from "fs";
import { parseMechlang } from "./parse.js";

const inputFile = process.argv[2] || "examples/sn2.mech";
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile =
  "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

const ast = parseMechlang(input);
const [r1, r2] = ast.reaction.reactants;
const [p1, p2] = ast.reaction.products;
const arrow = ast.arrows[0];
let start = { x: 60, y: 85 };
let end = { x: 120, y: 95 };

// crude semantic mapping (v0.1)
if (arrow.from.includes("OH")) {
  start = { x: 40, y: 80 };
}

if (arrow.to === "C") {
  end = { x: 120, y: 95 };
}

if (arrow.to === "Br") {
  end = { x: 160, y: 80 };
}


// Very simple SVG layout (hardcoded)
const svg = `
<svg width="500" height="200" xmlns="http://www.w3.org/2000/svg">

  <!-- Reactants -->
  <text x="100" y="100">${r1}</text>
<text x="40" y="80">${r2}</text>

<!-- Curved arrows -->
<path d="M ${start.x} ${start.y} 
         Q ${(start.x + end.x)/2} ${(start.y - 40)} 
         ${end.x} ${end.y}"
      stroke="black"
      fill="none"
      marker-end="url(#arrowhead)" />

  <!-- Products -->
 <text x="300" y="100">${p1}</text>
<text x="340" y="80">${p2}</text>


  <!-- Arrowhead definition -->
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3"
            orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>

</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
