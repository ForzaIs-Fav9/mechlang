import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { parseMechlang } from './parse.js';
import { moleculeRegistry } from './molecules.js';
import {
  validateTransforms,
  inferArrowsFromTransforms
} from './semantic-engine.js';

import {
  inferProducts
} from './product-engine.js';

const STEP_Y_GAP = 240;
const STEP_X_GAP = 260;
const MOLECULE_X_GAP = 180;
const MOLECULE_Y_GAP = 100;
const STEP_Y_ORIGIN = 140;
const STEP_X_ORIGIN = 120;
const PADDING = 80;

let LABEL_BOXES = [];

const args = process.argv.slice(2);
const mechFile = args.find(a => !a.startsWith('--'));
const layoutHorizontal = args.includes('--layout=horizontal');

if (!mechFile) {
  console.error('Usage: node src/render.js <file.mech> [--layout=horizontal]');
  process.exit(1);
}

const source = readFileSync(mechFile, 'utf8');
const ast = parseMechlang(source);

function resolveMol(alias, step) {
  const molKey = step.species[alias];
  return molKey ? moleculeRegistry[molKey] : null;
}

function parseArrowRef(ref) {
  const dotIndex = ref.indexOf('.');

  if (dotIndex === -1) {
    return {
      alias: ref,
      atomLabel: null,
      atomB: null
    };
  }

  const alias = ref.slice(0, dotIndex);
  const atomPart = ref.slice(dotIndex + 1);
  const dashIdx = atomPart.indexOf('-');

  if (dashIdx === -1) {
    return {
      alias,
      atomLabel: atomPart,
      atomB: null
    };
  }

  return {
    alias,
    atomLabel: atomPart.slice(0, dashIdx),
    atomB: atomPart.slice(dashIdx + 1)
  };
}

function getAtomPos(
  mol,
  ref,
  role='to'
){

  if(!mol){

    return{
      x:0,
      y:0
    };
  }

  // Bond reference

  if(

    ref.atomB &&
    mol.atoms[ref.atomLabel] &&
    mol.atoms[ref.atomB]

  ){

    const a=
      mol.atoms[
        ref.atomLabel
      ];

    const b=
      mol.atoms[
        ref.atomB
      ];

    const midpoint={

      x:
        (a.x+b.x)/2,

      y:
        (a.y+b.y)/2
    };

    // leaving-group arrow originates
    // from bond midpoint

    if(
      role==='from'
    ){
      return midpoint;
    }

    // attack arrow also targets
    // bond midpoint

    return midpoint;
  }

  if(

    ref.atomLabel &&
    mol.atoms[
      ref.atomLabel
    ]

  ){

    return mol.atoms[
      ref.atomLabel
    ];
  }

  return(
    Object.values(
      mol.atoms
    )[0]
    ??
    {
      x:0,
      y:0
    }
  );
}

function buildLaneMap(ast) {
  const map = new Map();
  let i = 0;

  for (const step of ast.steps) {
    for (const mol of Object.values(step.species)) {
      if (!map.has(mol)) {
        map.set(mol, i++);
      }
    }
  }

  return map;
}

function getOrderedAliases(
  entities,
  laneMap
) {

  return entities
    .slice()
    .sort((a, b) => {

      const laneA =
        laneMap.get(a.molecule) ?? 0;

      const laneB =
        laneMap.get(b.molecule) ?? 0;

      return laneA - laneB;
    })
    .map(entity => entity.alias);
}

function buildRenderableStep(step) {

  const renderedStep = {
    ...step,
    species: {
      ...step.species
    }
  };

  const inference =
    inferProducts(step);

  if (!inference.inferred) {
    return renderedStep;
  }

  inference.products.forEach(
    (product, index) => {

      const alias =
        `inferred_${index}`;

      renderedStep.species[alias] =
        product;
    }
  );

  return renderedStep;
}

function buildRenderEntities(step) {

  const entities = [];

  for (
    const [alias, molecule]
    of Object.entries(step.species)
  ) {

    const inferred =
      alias.startsWith('inferred_');

    entities.push({
      alias,
      molecule,

      role:
        inferred
          ? 'product'
          : 'reactant'
    });
  }

  return entities;
}

function computePositions(
  steps,
  horizontal,
  laneMap
) {

  return steps.map((step, si) => {

    const entities =
      buildRenderEntities(step);

    const reactants =
      entities.filter(
        e => e.role === 'reactant'
      );

    const products =
      entities.filter(
        e => e.role === 'product'
      );

    const orderedReactants =
      getOrderedAliases(
        reactants,
        laneMap
      );

    const orderedProducts =
      getOrderedAliases(
        products,
        laneMap
      );

    const stepPos = {};

    const reactionCenterX =
      STEP_X_ORIGIN +
      si * STEP_X_GAP;

    const reactionCenterY =
      STEP_Y_ORIGIN +
      si * STEP_Y_GAP;

    // ─────────────────────────────────────
    // Reactants
    // ─────────────────────────────────────

    orderedReactants.forEach(
      (alias, i) => {

        if (horizontal) {

          stepPos[alias] = {

            x:
              reactionCenterX,

            y:
              STEP_Y_ORIGIN +
              i * MOLECULE_Y_GAP
          };

        } else {

          stepPos[alias] = {

            x:
              reactionCenterX +
              i * MOLECULE_X_GAP,

            y:
              reactionCenterY
          };
        }
      }
    );

    // ─────────────────────────────────────
    // Products
    // ─────────────────────────────────────

    orderedProducts.forEach(
      (alias, i) => {

        if (horizontal) {

          stepPos[alias] = {

            x:
              reactionCenterX,

            y:
              STEP_Y_ORIGIN +
              (reactants.length + 3 + i)
              * MOLECULE_Y_GAP
          };

        } else {

          stepPos[alias] = {

            // Keep products clearly separated
            // from reaction center

            x:
              reactionCenterX +
              450,

            // Stack vertically

            y:
              reactionCenterY +
              120 +
              i * MOLECULE_Y_GAP
          };
        }
      }
    );

    return stepPos;

  });
}
    
function computeCanvas(positions) {

  let maxX = 0;
  let maxY = 0;

  for (const stepPos of positions) {

    for (const { x, y } of Object.values(stepPos)) {

      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  return {
    width: maxX + PADDING * 2,
    height: maxY + PADDING * 2
  };
}

function renderMolecule(alias, step, ox, oy) {

  const molKey = step.species[alias];
  const mol = molKey
    ? moleculeRegistry[molKey]
    : null;

  if (!mol) {

    return `
      <text
        x="${ox}"
        y="${oy}"
        font-family="sans-serif"
        font-size="13"
        fill="red"
      >
        [${alias}?]
      </text>
    `;
  }

  let svg = '';

  for (const bond of (mol.bonds || [])) {

    const [aKey, bKey, order = 1] = bond;

    const a1 = mol.atoms[aKey];
    const a2 = mol.atoms[bKey];

    if (!a1 || !a2) continue;

    const x1 = ox + a1.x;
    const y1 = oy + a1.y;
    const x2 = ox + a2.x;
    const y2 = oy + a2.y;

    if (order === 2) {

      const dx = x2 - x1;
      const dy = y2 - y1;

      const len =
        Math.sqrt(dx * dx + dy * dy) || 1;

      const nx = (-dy / len) * 3;
      const ny = (dx / len) * 3;

      svg += `
        <line
          x1="${x1 + nx}"
          y1="${y1 + ny}"
          x2="${x2 + nx}"
          y2="${y2 + ny}"
          stroke="black"
          stroke-width="1.5"
        />
      `;

      svg += `
        <line
          x1="${x1 - nx}"
          y1="${y1 - ny}"
          x2="${x2 - nx}"
          y2="${y2 - ny}"
          stroke="black"
          stroke-width="1.5"
        />
      `;

    } else {

      svg += `
        <line
          x1="${x1}"
          y1="${y1}"
          x2="${x2}"
          y2="${y2}"
          stroke="black"
          stroke-width="1.5"
        />
      `;
    }
  }

  for (const [key, pos] of Object.entries(mol.atoms)) {

    const label =
      mol.labels?.[key] ?? key;

    const lx = ox + pos.x;
    const ly = oy + pos.y;

    const w =
      label.length > 1
        ? label.length * 9
        : 14;

    const box = {
      x: lx - w / 2,
      y: ly - 9,
      width: w,
      height: 18
    };

    LABEL_BOXES.push(box);

    svg += `
      <rect
        x="${box.x}"
        y="${box.y}"
        width="${box.width}"
        height="${box.height}"
        fill="white"
      />
    `;

    svg += `
      <text
        x="${lx}"
        y="${ly}"
        font-family="sans-serif"
        font-size="14"
        text-anchor="middle"
        dominant-baseline="middle"
      >
        ${label}
      </text>
    `;
  }

  if (mol.charge && mol.charge !== 0) {

    const firstPos =
      Object.values(mol.atoms)[0];

    const chargeLabel =
      mol.charge === 1
        ? '+'
        : mol.charge === -1
          ? '−'
          : mol.charge > 0
            ? `${mol.charge}+`
            : `${Math.abs(mol.charge)}−`;

    svg += `
      <text
        x="${ox + firstPos.x + 10}"
        y="${oy + firstPos.y - 12}"
        font-family="sans-serif"
        font-size="11"
      >
        ${chargeLabel}
      </text>
    `;
  }

  return svg;
}

function sampleQuadratic(
  x1,
  y1,
  cx,
  cy,
  x2,
  y2,
  t
) {

  return {

    x:
      (1 - t) ** 2 * x1 +
      2 * (1 - t) * t * cx +
      t ** 2 * x2,

    y:
      (1 - t) ** 2 * y1 +
      2 * (1 - t) * t * cy +
      t ** 2 * y2
  };
}

function collides(
  x1,
  y1,
  cx,
  cy,
  x2,
  y2
) {

  for (
    let t = 0.08;
    t <= 0.92;
    t += 0.05
  ) {

    const p = sampleQuadratic(
      x1,
      y1,
      cx,
      cy,
      x2,
      y2,
      t
    );

    for (const b of LABEL_BOXES) {

      if (
        p.x >= b.x &&
        p.x <= b.x + b.width &&
        p.y >= b.y &&
        p.y <= b.y + b.height
      ) {
        return true;
      }
    }
  }

  return false;
}

function offsetEndpoint(
  x1,
  y1,
  x2,
  y2,
  distance = 12
) {

  const dx = x2 - x1;
  const dy = y2 - y1;

  const len =
    Math.sqrt(dx * dx + dy * dy) || 1;

  return {

    x:
      x2 - (dx / len) * distance,

    y:
      y2 - (dy / len) * distance
  };
}

function arrowPath(
  x1,
  y1,
  x2,
  y2,
  arrowIndex = 0
) {

  const dx = x2 - x1;
  const dy = y2 - y1;

  const mostlyVertical =
    Math.abs(dy) > Math.abs(dx);

  const base =
    24 + arrowIndex * 6;

  const attempts = [
    base,
    base + 10,
    base + 20
  ];

  for (const mag of attempts) {

    let cx;
    let cy;

    if (mostlyVertical) {

      cx = x1 + (dx * 0.35);
      cy = y1 + (dy * 0.5);

      const side =
        dx >= 0 ? 1 : -1;

      cx += side * mag;

    } else {

      cx = x1 + (dx * 0.5);
      cy = y1 + (dy * 0.35);

      const side =
        dy >= 0 ? 1 : -1;

      cy += side * mag;
    }

    if (
      !collides(
        x1,
        y1,
        cx,
        cy,
        x2,
        y2
      )
    ) {

      return `
        M ${x1} ${y1}
        Q ${cx} ${cy}
        ${x2} ${y2}
      `;
    }
  }

  if (mostlyVertical) {

    return `
      M ${x1} ${y1}
      Q ${
        x1 + dx * 0.35 + base
      } ${
        y1 + dy * 0.5
      }
      ${x2} ${y2}
    `;
  }

  return `
    M ${x1} ${y1}
    Q ${
      x1 + dx * 0.5
    } ${
      y1 + dy * 0.35 + base
    }
    ${x2} ${y2}
  `;
}

function resolveAnchor(
  refString,
  stepPos,
  step,
  role = 'to'
) {

  const ref =
    parseArrowRef(refString);

  const mol =
    resolveMol(
      ref.alias,
      step
    );

  const atom =
    getAtomPos(
      mol,
      ref,
      role
    );

  const origin =
    stepPos[
      ref.alias
    ];

  if (
    !origin
  ) {
    return null;
  }

  return {

    x:
      origin.x +
      atom.x,

    y:
      origin.y +
      atom.y
  };
}

function renderArrow(
  x1,
  y1,
  x2,
  y2,
  arrowIndex = 0
) {

  const adjusted =
    offsetEndpoint(
      x1,
      y1,
      x2,
      y2
    );

  const path =
    arrowPath(
      x1,
      y1,
      adjusted.x,
      adjusted.y,
      arrowIndex
    );

  return `
    <path
      d="${path}"
      fill="none"
      stroke="black"
      stroke-width="1.6"
      marker-end="url(#arrowhead)"
    />
  `;
}

function render(ast, horizontal) {

  LABEL_BOXES = [];

  const renderableSteps =
    ast.steps.map(buildRenderableStep);

  const laneMap =
    buildLaneMap({
      steps: renderableSteps
    });

  const positions =
    computePositions(
      renderableSteps,
      horizontal,
      laneMap
    );

  const { width, height } =
    computeCanvas(positions);

  let body = `
    <defs>
      <marker
        id="arrowhead"
        markerWidth="7"
        markerHeight="5"
        refX="6"
        refY="2.5"
        orient="auto"
        markerUnits="strokeWidth"
      >

        <polygon
          points="0 0, 7 2.5, 0 5"
          fill="black"
        />
      </marker>
    </defs>
  `;

  renderableSteps.forEach((step, si) => {

    validateTransforms(step);

    const entities =
      buildRenderEntities(step);

    const aliases =
      getOrderedAliases(
        entities,
        laneMap
      );

    for (const alias of aliases) {

      const p =
        positions[si][alias];

      body += renderMolecule(
        alias,
        step,
        p.x,
        p.y
      );
    }

    const semanticStep = {

      ...step,

      species:
        Object.fromEntries(

          Object.entries(
            step.species
          ).filter(

            ([alias]) =>
              !alias.startsWith(
                'inferred_'
              )

          )
        )
    };

    const effectiveArrows =
      step.arrows.length > 0
        ? step.arrows
        : inferArrowsFromTransforms(
            semanticStep
          );

    effectiveArrows.forEach(
      (arrow, ai) => {

        const fromRef =
          resolveAnchor(
            arrow.from,
            positions[si],
            semanticStep,
            'from'
          );

        const toRef =
          resolveAnchor(
            arrow.to,
            positions[si],
            semanticStep,
            'to'
          );

        if (!fromRef || !toRef) return;

        let targetX = toRef.x;
        let targetY = toRef.y;

        if (
          arrow.inferenceType === 'leaving'
        ) {
          const dx = 
            toRef.x - fromRef.x;
          const dy = 
            toRef.y - fromRef.y;
          const len = 
            Math.sqrt(
              dx * dx + 
              dy * dy
            ) || 1;
          targetX = fromRef.x + 
            (dx / len) * 70;
          targetY = fromRef.y +
            (dy / len) * 70;
        }

        body += renderArrow(
          fromRef.x,
          fromRef.y,
          targetX,
          targetY,
          ai
        );
      }
    );
  });

  return `
    <svg
      viewBox="0 0 ${width} ${height}"
      xmlns="http://www.w3.org/2000/svg"
    >
      ${body}
    </svg>
  `;
}

const svg =
  render(
    ast,
    layoutHorizontal
  );

const baseName = path.basename(
  mechFile,
  '.mech'
);

const suffix =
  layoutHorizontal
    ? '.horizontal.svg'
    : '.svg';

const out =
  `out/${baseName}${suffix}`;

mkdirSync(
  'out',
  { recursive: true }
);

writeFileSync(out, svg);

console.log(`Rendered → ${out}`);
