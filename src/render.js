import fs from "fs";
import { parseMechlang } from "./parse.js";

console.log("USING ATOM-LEVEL, STEP-AWARE RENDERER v0.7");

const atomTemplates = {
  "CN-": {
    atoms: { C: { x: 0, y: 0 }, N: { x: -25, y: 0 } },
    bonds: [["C", "N"]]
  },
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } },
    bonds: [["C", "Br"]]
  }
};

const inputFile = process.argv[2];
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile = "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

const ast = parseMechlang(input);

function buildMolecule(name, x, y) {
  const tpl = atomTemplates[name];
  if (!tpl) return null;

  const atoms = {};
  for (const k in tpl.atoms) {
    atoms[k] = {
      x: x + tpl.atoms[k].x,
      y: y + tpl.atoms[k].y
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
}

const step = ast.steps[0];

const molecules = [];
molecules.push(buildMolecule(step.species.nucleophile, 120, 150));
molecules.push(buildMolecule(step.species.electrophile, 320, 150));

function resolveTarget(target) {
  if (!target) return null;

  if (target.includes(".")) {
    const [, selector] = target.split(".");
    return resolveTarget(selector);
  }

  if (target.includes("-")) {
    const [a, b] = target.split("-");
    for (const m of molecules) {
      const bond = m?.bonds.find(
        bd => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a)
      );
      if (bond) return { x: bond.mx, y: bond.my };
    }
  }

  for (const m of molecules) {
    if (m?.atoms[target]) return m.atoms[target];
  }

  return null;
}

function renderArrows() {
  return step.arrows.map(a => {
    const start = resolveTarget(a.from);
    const end = resolveTarget(a.to);
    if (!start || !end) return "";

    return `<path d="M ${start.x} ${start.y}
      Q ${(start.x + end.x) / 2} ${start.y - 80}
      ${end.x} ${end.y}"
      stroke="black" fill="none" marker-end="url(#arrow)"/>`;
  }).join("\n");
}

const svg = `
<svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="6" markerHeight="6"
      refX="5" refY="3" orient="auto">
      <polygon points="0 0,6 3,0 6" fill="black"/>
    </marker>
  </defs>

  ${molecules.flatMap(m =>
    m.bonds.map(b =>
      `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}" stroke="black"/>`
    )
  ).join("\n")}

  ${molecules.flatMap(m =>
    Object.entries(m.atoms).map(([k, v]) =>
      `<text x="${v.x}" y="${v.y + 5}" text-anchor="middle">${k}</text>`
    )
  ).join("\n")}

  ${renderArrows()}
</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
