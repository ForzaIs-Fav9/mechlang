console.log("USING ATOM-LEVEL, STEP-AWARE RENDERER v0.7");

import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Atom templates
   =============================== */

const atomTemplates = {
  "CH3-Br": {
    atoms: {
      C: { x: 0, y: 0 },
      Br: { x: 40, y: 0 }
    },
    bonds: [["C", "Br"]]
  },

  "CN-": {
    atoms: {
      C: { x: 0, y: 0 },
      N: { x: -25, y: 0 }
    },
    bonds: [["C", "N"]]
  }
};

/* ===============================
   IO
   =============================== */

const inputFile = process.argv[2];
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile = "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

/* ===============================
   Parse
   =============================== */

const ast = parseMechlang(input);

/* ===============================
   Layout
   =============================== */

const molecules = ast.reaction.molecules.map((name, i) => {
  const tpl = atomTemplates[name];
  const baseX = 120 + i * 200;
  const baseY = 200;

  const atoms = {};
  for (const a in tpl.atoms) {
    atoms[a] = {
      x: baseX + tpl.atoms[a].x,
      y: baseY + tpl.atoms[a].y
    };
  }

  const bonds = tpl.bonds.map(([a, b]) => ({
    a, b,
    x1: atoms[a].x,
    y1: atoms[a].y,
    x2: atoms[b].x,
    y2: atoms[b].y,
    mx: (atoms[a].x + atoms[b].x) / 2,
    my: (atoms[a].y + atoms[b].y) / 2
  }));

  return { name, atoms, bonds };
});

/* ===============================
   Arrow resolution
   =============================== */

function resolveTarget(ref) {
  const [molName, selector] = ref.split(".");

  const mol = molecules.find(m => m.name === molName);
  if (!mol) return null;

  if (selector.includes("-")) {
    const [a, b] = selector.split("-");
    return mol.bonds.find(
      bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
    );
  }

  return mol.atoms[selector] || null;
}

/* ===============================
   Render
   =============================== */

function arrowPath(start, end) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 60;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

const svg = `
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">

  ${molecules.flatMap(m =>
    m.bonds.map(b =>
      `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}"
             stroke="black" stroke-width="1.5"/>`
    )
  ).join("")}

  ${molecules.flatMap(m =>
    Object.entries(m.atoms).map(([k, v]) =>
      `<text x="${v.x}" y="${v.y + 5}" font-size="14" text-anchor="middle">${k}</text>`
    )
  ).join("")}

  ${ast.reaction.arrows.map(a => {
    const from = resolveTarget(a.from);
    const to   = resolveTarget(a.to);
    if (!from || !to) return "";
    return `<path d="${arrowPath(from, to)}" stroke="black" fill="none"
                  marker-end="url(#arrow)"/>`;
  }).join("")}

  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>

</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
