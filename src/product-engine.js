function classifySpecies(mol) {

  const info = {
    role: null,
    leavingGroup: null
  };

  // ───────────────────────────────────────────────────────────────────────
  // Nucleophiles
  // ───────────────────────────────────────────────────────────────────────

  if (mol === 'CN-') {
    info.role = 'cyanide';
  }

  if (mol === 'OH-') {
    info.role = 'hydroxide';
  }

  // ───────────────────────────────────────────────────────────────────────
  // Methyl halides
  // ───────────────────────────────────────────────────────────────────────

  if (
    mol.startsWith('CH3-')
  ) {

    if (mol.endsWith('Br')) {
      info.role = 'methyl-halide';
      info.leavingGroup = 'Br';
    }

    if (mol.endsWith('Cl')) {
      info.role = 'methyl-halide';
      info.leavingGroup = 'Cl';
    }

    if (mol.endsWith('I')) {
      info.role = 'methyl-halide';
      info.leavingGroup = 'I';
    }
  }

  return info;
}

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
      info.role === 'cyanide' ||
      info.role === 'hydroxide'
    ) {
      nucleophile = info;
    }

    if (
      info.role === 'methyl-halide'
    ) {
      substrate = info;
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Normalized semantic transforms
  // ───────────────────────────────────────────────────────────────────────

  const transformSet =
    new Set();

  for (const transform of step.transforms || []) {

    const [a, b] =
      transform.bond;

    transformSet.add(
      `${transform.type}:${a}-${b}`
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // SN2: Cyanide substitution
  // ───────────────────────────────────────────────────────────────────────

  if (
    nucleophile?.role === 'cyanide' &&
    substrate?.role === 'methyl-halide' &&
    substrate?.leavingGroup === 'Br' &&
    transformSet.has('form:C-CN') &&
    transformSet.has('break:C-Br')
  ) {

    result.inferred = true;
    result.mechanism = 'SN2';

    result.products.push(
      'CH3-CN',
      'Br-'
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // SN2: Hydroxide substitution
  // ───────────────────────────────────────────────────────────────────────

  if (
    nucleophile?.role === 'hydroxide' &&
    substrate?.role === 'methyl-halide' &&
    substrate?.leavingGroup === 'Br' &&
    transformSet.has('form:C-OH') &&
    transformSet.has('break:C-Br')
  ) {

    result.inferred = true;
    result.mechanism = 'SN2';

    result.products.push(
      'CH3-OH',
      'Br-'
    );
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
