// src/render.js

import fs from "fs";
import { parseMechlang } from "./parse.js";

console.log("USING ATOM-LEVEL, STEP-AWARE RENDERER v0.7");

/* ===============================
   Atom templates (visual only)
   =============================== */

const atomTemplates = {
  "CH3-Br": {
    atoms: {
      C:  { x: 0,  y: 0 },
      Br: { x: 40, y: 0 }
    },
    bonds: [["C", "Br"]]
  },

  "CN-": {
    atoms: {
      C: { x: 0,  y: 0 },
      N: { x: -30, y: 0 }
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
   Build molecules for a step
   =============================== */

function buildMolecules(species, baseX, baseY) {
  return species.map((name, i) => {
    const template = atomTemplates[name];
    if (!template) return null;

    const base = { x: baseX, y: baseY + i * 80 };
    const atoms = {};
    const bonds = [];

    for (const a in template.atoms) {
      atoms[a] = {
        x: base.x + template.atoms[a].x,
        y: base.y + template.atoms[a].y
      };
    }

    for (const [a, b] of template.bonds) {
      bonds.push({
        a, b,
        x1: atoms[a].x,
        y1: atoms[a].y,
        x2: atoms[b].x,
        y2: atoms[b].y,
        mx: (atoms[a].x + atoms[b].x) / 2,
        my: (atoms[a].y + atoms[b].y) / 2
      });
    }

    return { name, atoms, bonds };
  }).filter(Boolean);
}

/* ===============================
   Arrow resolution (STEP-AWARE)
   =============================== */

function resolveArrowTarget(target, molecules) {
  if (!target || !target.includes(".")) {
    console.warn("Invalid arrow target:", target);
    return null;
  }

  const [role, selector] = target.split(".");

  // ---- BOND TARGET (C-Br) ----
  if (selector.includes("-")) {
    const [a, b] = selector.split("-");
    for (const mol of molecules) {
      const bond = mol.bonds.find(
        bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
      );
      if (bond) return { x: bond.mx, y: bond.my };
    }
  }

  // ---- ATOM TARGET ----
  for (const mol of molecules) {
    if (mol.atoms[selector]) return mol.atoms[selector];
  }

  console.warn("Unresolved arrow target:", target);
  return null;
}

/* ===============================
   Arrow geometry
   =============================== */

function arrowPath(start, end) {
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - 80;
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

/* ===============================
   Render
   =============================== */

let svgContent = "";

const step = ast.steps[0];
if (!step || step.arrows.length === 0) {
  console.log("No arrows to render");
} else {
  const molecules = buildMolecules(step.species, 150, 200);

  svgContent += molecules.flatMap(m =>
    m.bonds.map(b =>
      `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}"
             stroke="black" stroke-width="1.5"/>`
    )
  ).join("\n");

  svgContent += molecules.flatMap(m =>
    Object.entries(m.atoms).map(([sym, pos]) =>
      `<text x="${pos.x}" y="${pos.y + 5}"
             text-anchor="middle"
             font-size="14"
             font-family="serif">${sym}</text>`
    )
  ).join("\n");

  svgContent += step.arrows.map(a => {
    const start = resolveArrowTarget(a.from, molecules);
    const end   = resolveArrowTarget(a.to, molecules);
    if (!start || !end) return "";
    return `<path d="${arrowPath(start, end)}"
                  stroke="black"
                  fill="none"
                  stroke-width="1.5"
                  marker-end="url(#arrowhead)"/>`;
  }).join("\n");
}

/* ===============================
   SVG
   =============================== */

const svg = `
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>

  ${svgContent}
</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log("Rendered", outputFile);
