const SPECIES_RULES = {

  // ───────────────────────────────────────────────────────────────────────
  // Nucleophiles
  // ───────────────────────────────────────────────────────────────────────

  'CN-': {
    category: 'nucleophile',
    role: 'cyanide'
  },

  'OH-': {
    category: 'nucleophile',
    role: 'hydroxide'
  }
};

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
  // Rule-based species semantics
  // ───────────────────────────────────────────────────────────────────────

  if (
    SPECIES_RULES[mol]
  ) {

    Object.assign(
      info,
      SPECIES_RULES[mol]
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Methyl halides
  // ───────────────────────────────────────────────────────────────────────

  if (
    mol.startsWith('CH3-')
  ) {

    if (mol.endsWith('Br')) {
      info.category = 'substrate';
      info.role = 'methyl-halide';
      info.leavingGroup = 'Br';
    }

    if (mol.endsWith('Cl')) {
      info.category = 'substrate';
      info.role = 'methyl-halide';
      info.leavingGroup = 'Cl';
    }

    if (mol.endsWith('I')) {
      info.category = 'substrate';
      info.role = 'methyl-halide';
      info.leavingGroup = 'I';
    }
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
