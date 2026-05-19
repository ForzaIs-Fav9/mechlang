export function inferProducts(step) {

  const inferred = [];

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

  // ── SN2: Cyanide substitution ──────────────────────────────────────────
  if (
    nucleophile === 'CN-' &&
    substrate === 'CH3-Br'
  ) {

    inferred.push('CH3-CN');
    inferred.push('Br-');
  }

  // ── SN2: Hydroxide substitution ───────────────────────────────────────
  if (
    nucleophile === 'OH-' &&
    substrate === 'CH3-Br'
  ) {

    inferred.push('CH3-OH');
    inferred.push('Br-');
  }

  return inferred;
}
