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

  for (const [, mol] of species) {

    // ── Supported nucleophiles ───────────────────────────────────────────
    if (
      [
        'CN-',
        'OH-',
        'Cl-',
        'Br-',
        'I-'
      ].includes(mol)
    ) {
      nucleophile = mol;
    }

    // ── Supported substrates ─────────────────────────────────────────────
    if (
      mol.startsWith('CH3-')
    ) {
      substrate = mol;
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
    nucleophile === 'CN-' &&
    substrate === 'CH3-Br' &&
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
    nucleophile === 'OH-' &&
    substrate === 'CH3-Br' &&
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
