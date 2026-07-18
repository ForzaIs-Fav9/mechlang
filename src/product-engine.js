const HALIDES = ['Br', 'Cl', 'I', 'F'];

const NUCLEOPHILE_ROLES = {
  'CN-': 'cyanide',
  'OH-': 'hydroxide'
};

// ─────────────────────────────────────────────────────────────────────────
// Species classification
// ─────────────────────────────────────────────────────────────────────────

function classifySpecies(mol, graphMap) {

  const info = {
    category: null,
    role: null,
    leavingGroup: null,
    molecule: mol
  };

  if (NUCLEOPHILE_ROLES[mol]) {
    info.category = 'nucleophile';
    info.role = NUCLEOPHILE_ROLES[mol];
    return info;
  }

  const graph = graphMap.get(mol);
  if (!graph) return info;

  // TODO(M4+): Replace element scan with MoleculeGraph.hasElement()/findElement() if the classification API is introduced.
  const carbonAtom = graph.atoms.find(a => a.element === 'C');
  if (!carbonAtom) return info;

  const carbonNeighbors = graph.neighbors(carbonAtom.id);

  for (const neighborId of carbonNeighbors) {
    const neighbor = graph.getAtom(neighborId);
    if (neighbor && HALIDES.includes(neighbor.element)) {
      info.category = 'substrate';
      info.role = 'methyl-halide';
      info.leavingGroup = neighbor.element;
      return info;
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

export function inferProducts(step, graphMap) {

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
      classifySpecies(mol, graphMap);

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
