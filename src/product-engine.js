import { MoleculeGraph } from './molecule-graph.js';

// ─────────────────────────────────────────────────────────────────────────
// Species classification
// ─────────────────────────────────────────────────────────────────────────

function classifySpecies(mol) {

  const info = {
    category: null,
    role: null,
    leavingGroup: null,
    molecule: mol
  };

  // ───────────────────────────────────────────────────────────────────────
  // Structural classification via MoleculeGraph
  // ───────────────────────────────────────────────────────────────────────

  let graph;
  try { graph = MoleculeGraph.fromRegistry(mol); }
  catch { return info; }

  // ───────────────────────────────────────────────────────────────────────
  // Nucleophile detection by charge and topology
  // ───────────────────────────────────────────────────────────────────────

  if (graph.charge === -1) {

    if (graph.hasBond('N', 'C')) {
      info.category = 'nucleophile';
      info.role = 'cyanide';
    }

    if (
      graph.getAtom('O') &&
      graph.atomCount() === 1
    ) {
      info.category = 'nucleophile';
      info.role = 'hydroxide';
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Substrate detection by C-X bond topology
  // ───────────────────────────────────────────────────────────────────────

  if (graph.hasBond('C', 'Br')) {
    info.category = 'substrate';
    info.role = 'methyl-halide';
    info.leavingGroup = 'Br';
  }

  if (graph.hasBond('C', 'Cl')) {
    info.category = 'substrate';
    info.role = 'methyl-halide';
    info.leavingGroup = 'Cl';
  }

  if (graph.hasBond('C', 'I')) {
    info.category = 'substrate';
    info.role = 'methyl-halide';
    info.leavingGroup = 'I';
  }

  return info;
}

// ─────────────────────────────────────────────────────────────────────────
// Transform normalization
// ─────────────────────────────────────────────────────────────────────────

function normalizeTransforms(step) {

  const transformSet =
    new Set();

  for (const transform of step.transforms || []) {

    const [a, b] =
      transform.bond;

    transformSet.add(
      `${transform.type}:${a}-${b}`
    );
  }

  return transformSet;
}

// ─────────────────────────────────────────────────────────────────────────
// Reaction synthesis helpers
// ─────────────────────────────────────────────────────────────────────────

function synthesizeSN2Products(
  rule,
  substrate
) {

  return [
    rule.product,
    `${substrate.leavingGroup}-`
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// Data-driven SN2 inference rules
// ─────────────────────────────────────────────────────────────────────────

const SN2_RULES = [

  {
    nucleophile: 'cyanide',
    formTransform: 'form:C-CN',
    product: 'CH3-CN'
  },

  {
    nucleophile: 'hydroxide',
    formTransform: 'form:C-OH',
    product: 'CH3-OH'
  }
];

export function inferProducts(step) {

  const result = {
    inferred: false,
    mechanism: null,
    products: [],
    diagnostics: []
  };

  const species =
    Object.entries(step.species);

  let nucleophile = null;
  let substrate = null;

  // ───────────────────────────────────────────────────────────────────────
  // Semantic species classification
  // ───────────────────────────────────────────────────────────────────────

  for (const [, mol] of species) {

    const info =
      classifySpecies(mol);

    if (
      info.category === 'nucleophile'
    ) {
      nucleophile = info;
    }

    if (
      info.category === 'substrate'
    ) {
      substrate = info;
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Normalized semantic transforms
  // ───────────────────────────────────────────────────────────────────────

  const transformSet =
    normalizeTransforms(step);

  // ───────────────────────────────────────────────────────────────────────
  // Data-driven SN2 inference
  // ───────────────────────────────────────────────────────────────────────

  for (const rule of SN2_RULES) {

    const leavingTransform =
      `break:C-${substrate?.leavingGroup}`;

    const validSN2 =
      nucleophile?.role === rule.nucleophile &&
      substrate?.role === 'methyl-halide' &&
      transformSet.has(rule.formTransform) &&
      transformSet.has(leavingTransform);

    if (validSN2) {

      result.inferred = true;
      result.mechanism = 'SN2';

      result.products =
        synthesizeSN2Products(
          rule,
          substrate
        );
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Semantic diagnostics
  // ───────────────────────────────────────────────────────────────────────

  const hasTransforms =
    (step.transforms || []).length > 0;

  if (
    hasTransforms &&
    !result.inferred
  ) {

    result.diagnostics.push({
      type: 'unsupported-transform',
      message:
        'Unable to infer products for transform sequence.'
    });
  }

  return result;
}
