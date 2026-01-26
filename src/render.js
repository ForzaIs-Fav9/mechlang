import fs from "fs";
import { parseMechlang } from "./parse.js";

/* ===============================
   Config
   =============================== */

const SHOW_MOLECULE_LABELS = false;

/* ===============================
   Atom templates (visual only)
   =============================== */

const atomTemplates = {
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } },
    bonds: [["C", "Br"]]
  },
  "OH-": {
    atoms: { O: { x: 0, y: 0 }, H: { x: 20, y: 0 } },
    bonds: [["O", "H"]]
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

const inputFile = process.argv[2] || "examples/sn2_steps.mech";
const input = fs.readFileSync(inputFile, "utf-8");
const outputFile =
  "out/" + inputFile.split("/").pop().replace(".mech", ".svg");

/* ===============================
   Parse
   =============================== */

const ast = parseMechlang(input);

/* ===============================
   Layout
   =============================== */

const layout = {
  reactants: { x: 120, y: 150, gap: 80 },
  products:  { x: 520, y: 150, gap: 80 }
};

/* ===============================
   Build molecule models
   =============================== */

function buildMolecules(list, xBase, yBase) {
  return list.map((name, i) => {
    const template = atomTemplates[name] || { atoms: {}, bonds: [] };
    const base = { x: xBase, y: yBase + i * layout.reactants.gap };

    // Build atom absolute positions if template exists; else atoms stays empty
    const atoms = {};
    for (const atom in template.atoms) {
      atoms[atom] = {
        x: base.x + template.atoms[atom].x,
        y: base.y + template.atoms[atom].y
      };
    }

    const bonds = (template.bonds || [])
      .map(([a, b]) => {
        if (!atoms[a] || !atoms[b]) return null;
        return {
          a, b,
          x1: atoms[a].x,
          y1: atoms[a].y,
          x2: atoms[b].x,
          y2: atoms[b].y,
          mx: (atoms[a].x + atoms[b].x) / 2,
          my: (atoms[a].y + atoms[b].y) / 2
        };
      })
      .filter(Boolean);

    return { name, base, atoms, bonds };
  });
}

const reactantMolecules = buildMolecules(
  ast.reaction?.reactants || [], layout.reactants.x, layout.reactants.y
);

const productMolecules = buildMolecules(
  ast.reaction?.products || [], layout.products.x, layout.products.y
);

const molecules = [...reactantMolecules, ...productMolecules];

/* ===============================
   Rendering helpers
   =============================== */

function renderBonds() {
  return molecules.flatMap(m =>
    m.bonds.map(b =>
      `<line x1="${b.x1}" y1="${b.y1}"
             x2="${b.x2}" y2="${b.y2}"
             stroke="black" stroke-width="1.5" />`
    )
  ).join("\n");
}

function renderAtoms() {
  return molecules.flatMap(m =>
    Object.entries(m.atoms).map(([sym, pos]) =>
      `<text x="${pos.x}" y="${pos.y + 5}"
             font-size="14"
             text-anchor="middle"
             font-family="serif">${sym}</text>`
    )
  ).join("\n");
}

function renderMoleculeLabels() {
  if (!SHOW_MOLECULE_LABELS) return "";
  return molecules.map(m =>
    `<text x="${m.base.x}" y="${m.base.y + 20}" font-size="12">${m.name}</text>`
  ).join("\n");
}

/* ===============================
   Step-aware target resolution (robust)
   =============================== */

function sanitizeName(s) {
  return (s || "").replace(/\s+/g, "").replace(/[^A-Za-z0-9\-]/g, "");
}

/**
 * Try to find a molecule by a "base" name.
 * We attempt strict match first, then a suffix/prefix match, then contains.
 */
function findMoleculeByName(targetRaw) {
  if (!targetRaw) return null;
  const t = sanitizeName(targetRaw);
  // strict
  let mol = molecules.find(m => sanitizeName(m.name) === t);
  if (mol) return mol;
  // try with/without trailing dash: 'CN' -> 'CN-'
  const alt = t.endsWith("-") ? t.slice(0, -1) : `${t}-`;
  mol = molecules.find(m => sanitizeName(m.name) === alt);
  if (mol) return mol;
  // contains
  mol = molecules.find(m => sanitizeName(m.name).includes(t) || t.includes(sanitizeName(m.name)));
  return mol || null;
}

/**
 * Resolve an alias like "CN:" to a likely nucleophilic atom within that molecule.
 */
function resolveStepAlias(alias) {
  const base = alias.replace(":", "");
  const mol = findMoleculeByName(base);
  if (!mol) return null;

  // Prefer heteroatoms for nucleophile
  const priority = ["N", "O", "S"];
  for (const p of priority) {
    if (mol.atoms[p]) return mol.atoms[p];
  }

  // If the template didn't give atoms, fallback to molecule center base coords
  const firstAtom = Object.values(mol.atoms)[0];
  if (firstAtom) return firstAtom;

  // Fallback: CENTER of the molecule (always available)
  return { x: mol.base.x, y: mol.base.y };
}

/**
 * Resolve an arbitrary target string:
 * - symbolic alias (ends with ':')
 * - bond 'C-Br' -> bond midpoint
 * - atom 'C' -> atom position
 * - fallback: molecule center if nothing else
 */
function resolveArrowTarget(target) {
  if (!target) return null;
  const trimmed = String(target).trim();

  // Symbolic step alias: CN:
  if (trimmed.endsWith(":")) {
    const pos = resolveStepAlias(trimmed);
    if (pos) return pos;
    console.warn("Unresolved symbolic target:", trimmed);
    return null;
  }

  const clean = trimmed.replace(":", "");

  // Bond target C-Br
  if (clean.includes("-")) {
    const [a, b] = clean.split("-");
    for (const mol of molecules) {
      const bd = mol.bonds.find(
        bobj => (bobj.a === a && bobj.b === b) || (bobj.a === b && bobj.b === a)
      );
      if (bd) return { x: bd.mx, y: bd.my };
    }
  }

  // Atom target (exact)
  if (/^[A-Z][a-z]?$/.test(clean)) {
    for (const mol of molecules) {
      if (mol.atoms[clean]) return mol.atoms[clean];
    }
  }

  // Fuzzy fallback: find molecule containing the token and return its center
  const fuzzyMol = findMoleculeByName(clean);
  if (fuzzyMol) {
    // if atoms exist, prefer first atom; else molecule center
    const firstAtom = Object.values(fuzzyMol.atoms)[0];
    if (firstAtom) return firstAtom;
    return { x: fuzzyMol.base.x, y: fuzzyMol.base.y };
  }

  // Final fallback: warn and return null
  console.warn("Unresolved arrow target:", target);
  return null;
}

/* ===============================
   Arrow geometry
   =============================== */

function arrowPath(start, end) {
  const dx = end.x - start.x;
  const curvature = Math.sign(dx || 1) * 80;
  const cx = (start.x + end.x) / 2;
  const cy = Math.min(start.y, end.y) - Math.abs(curvature);
  return `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`;
}

/* Accept either an array of arrows or null */
function renderArrowsForList(arrows) {
  if (!Array.isArray(arrows) || arrows.length === 0) return "";
  return arrows.map(a => {
    const start = resolveArrowTarget(a.from);
    const end   = resolveArrowTarget(a.to);
    if (!start || !end) return "";
    return `
      <path d="${arrowPath(start, end)}"
            stroke="black"
            fill="none"
            stroke-width="1.5"
            marker-end="url(#arrowhead)" />
    `;
  }).join("\n");
}

/* ===============================
   Build arrow-rendering blocks
   =============================== */

/* Support both old AST (ast.arrows) and new AST (ast.steps[].arrows) */
function renderAllArrowsFromAST(ast) {
  const parts = [];

  if (Array.isArray(ast.steps) && ast.steps.length > 0) {
    for (const step of ast.steps) {
      const arrows = step.arrows || [];
      parts.push(renderArrowsForList(arrows));
    }
  }

  // legacy single-level arrows
  if (Array.isArray(ast.arrows) && ast.arrows.length > 0) {
    parts.push(renderArrowsForList(ast.arrows));
  }

  return parts.join("\n");
}

/* ===============================
   SVG output
   =============================== */

const svg = `
<svg width="750" height="420" xmlns="http://www.w3.org/2000/svg">

  <!-- Arrows -->
  ${renderAllArrowsFromAST(ast)}

  <!-- Bonds -->
  ${renderBonds()}

  <!-- Atom labels -->
  ${renderAtoms()}

  <!-- Molecule debug labels (optional) -->
  ${renderMoleculeLabels()}

  <defs>
    <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="5" refY="3" orient="auto">
      <polygon points="0 0, 6 3, 0 6" fill="black"/>
    </marker>
  </defs>

</svg>
`;

fs.writeFileSync(outputFile, svg);
console.log(`Rendered ${outputFile}`);
