import fs from "fs";
import { parseMechlang } from "./parse.js";

const input = fs.readFileSync("examples/sn2.mech", "utf-8");
const ast = parseMechlang(input);

// Very simple SVG layout (hardcoded)
const svg = `
<svg width="500" height="200" xmlns="http://www.w3.org/2000/svg">

  <!-- Reactants -->
  <text x="100" y="100" font-size="16">CH3-Br</text>
  <text x="40" y="80" font-size="16">OH⁻</text>

  <!-- Curved arrow -->
  <path d="M 60 85 Q 100 40 120 95"
        stroke="black" fill="none"
        marker-end="url(#arrowhead)" />

  <!-- Products -->
  <text x="300" y="100" font-size="16">CH3-OH</text>
  <text x="340" y="80" font-size="16">Br⁻</text>

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

fs.writeFileSync("out/sn2.svg", svg);
console.log("Rendered out/sn2.svg");
