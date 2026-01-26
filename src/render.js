import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Atom templates (visual only)
   =============================== */

const atomTemplates = {
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } },
    bonds: [["C", "Br"]]
  },
  "CN-": {
    atoms: { C: { x: 0, y: 0 }, N: { x: -25, y: 0 } },
    bonds: [["C", "N"]]
  },
  "CH3-OH": {
    atoms: { C: { x: 0, y: 0 }, O: { x: 40, y: 0 }, H: { x: 60, y: 0 } },
    bonds: [["C", "O"], ["O", "H"]]
  }
};

/* ===============================
   IO
   =============================== */

const inputFile = process.argv[2];
if (!inputFile) {
  console.error("Usage: node src/render.js <input-file.mech>");
  process.exit(1);
}
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile =
  "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

const ast = parseMechlang(input);

/* ===============================
   Layout constants
   =============================== */

const STEP_Y_GAP = 140;
const BASE_X = 160;

/* ===============================
   Molecule builder
   =============================== */

function buildMolecules(species, yBase) {
  return (species || []).map((name, i) => {
    const template = atomTemplates[name];
    if (!template) {
      // unknown template: skip but warn so user can add template or species
      console.warn(`No atom template for species: ${name}`);
      return null;
    }

    const base = { x: BASE_X, y: yBase + i * 40 };
    const atoms = {};
    const bonds = [];

    for (const a in template.atoms) {
      atoms[a] = {
        x: base.x + template.atoms[a].x,
        y: base.y + template.atoms[a].y
      };
    }

    for (const [a, b] of (template.bonds || [])) {
      if (!atoms[a] || !atoms[b]) continue;
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
   Token canonicalization
   =============================== */

function normalizeToken(tok) {
  if (!tok) return "";
  return tok.replace(/[:+\s]/g, "").trim(); // remove colons, pluses, whitespace
}

function canonicalAtom(token) {
  // token might be "CN", "CN-", "OH", "C", "Br", etc.
  const cleaned = (token || "").replace(/[-:]/g, "").trim(); // remove '-' and ':'
  const t = cleaned; // e.g. "CN", "OH", "C", "Br"

  // common maps (expandable)
  const map = {
    CN: "C",
    OH: "O"
    // add more shorthand -> anchor mappings here if needed
  };

  if (map[t]) return map[t];
  if (/^[A-Z][a-z]?$/.test(t)) return t; // valid atom symbol (C, N, O, Br, Cl ...)
  return null;
}

/* ===============================
   Resolve arrow target (robust)
   =============================== */

function resolveTarget(rawTarget, molecules) {
  if (!rawTarget) return null;
  const clean = rawTarget.replace(/\s+/g, ""); // trim spaces

  // ---- bond target (e.g., "C-Br" or "C-Br:")
  if (clean.includes("-")) {
    const [rawA, rawB] = clean.split("-");
    const aSym = canonicalAtom(rawA);
    const bSym = canonicalAtom(rawB);
    if (!aSym || !bSym) {
      // cannot canonicalize parts
      console.warn("Cannot canonicalize bond parts:", rawA, rawB);
      return null;
    }
    for (const mol of molecules) {
      const bd = mol.bonds.find(b => (b.a === aSym && b.b === bSym) || (b.a === bSym && b.b === aSym));
      if (bd) return { x: bd.mx, y: bd.my };
    }
  }

  // ---- atom-like target (including mapped tokens like "CN" -> "C")
  const atomSym = canonicalAtom(clean.replace(/[:-]/g, ""));
  if (atomSym) {
    for (const mol of molecules) {
      if (mol.atoms[atomSym]) return mol.atoms[atomSym];
    }
  }

  // Not found
  console.warn("Unresolved arrow target:", rawTarget);
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
   Render steps
   =============================== */

let svgContent = "";
let yOffset = 80;

if (!ast.steps || ast.steps.length === 0) {
  console.warn("No steps to render in AST; make sure your file uses 'step { ... }' blocks");
}

ast.steps.forEach((step, si) => {
  const molecules = buildMolecules(step.species, yOffset);

  // draw bonds and atom labels
  for (const m of molecules) {
    for (const b of m.bonds) {
      svgContent += `<line x1="${b.x1}" y1="${b.y1}" x2="${b.x2}" y2="${b.y2}" stroke="black" stroke-width="1.5"/>`;
    }
    for (const [sym, pos] of Object.entries(m.atoms)) {
      svgContent += `<text x="${pos.x}" y="${pos.y + 5}" font-size="14" text-anchor="middle" font-family="serif">${sym}</text>`;
    }
  }

  // render arrows for this step
  for (const a of step.arrows || []) {
    const start = resolveTarget(a.from, molecules);
    const end   = resolveTarget(a.to, molecules);

    if (!start || !end) {
      // skip arrow if unresolved (we already warn inside resolveTarget)
      continue;
    }

    svgContent += `
      <path d="${arrowPath(start, end)}" stroke="black" fill="none" stroke-width="1.5" marker-end="url(#arrowhead)"/>
    `;
  }

  // step separator (optional visual cue) -- small label
  svgContent += `<text x="40" y="${yOffset + 6}" font-size="12" font-family="serif">step ${si+1}</text>`;

  yOffset += STEP_Y_GAP;
});

/* ===============================
   Final SVG
   =============================== */

const svg = `
<svg width="900" height="${Math.max(420, yOffset + 40)}" xmlns="http://www.w3.org/2000/svg">
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
