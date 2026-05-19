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

  // ───────────────────────────────────────────────────────────────────────
  // Semantic transform analysis
  // ───────────────────────────────────────────────────────────────────────

  let formsCCN = false;
  let formsCOH = false;
  let breaksCBr = false;

  for (const transform of step.transforms || []) {

    if (
      transform.type === 'form'
    ) {

      const [a, b] =
        transform.bond;

      // form C-CN
      if (
        a === 'C' &&
        b === 'CN'
      ) {
        formsCCN = true;
      }

      // form C-OH
      if (
        a === 'C' &&
        b === 'OH'
      ) {
        formsCOH = true;
      }
    }

    if (
      transform.type === 'break'
    ) {

      const [a, b] =
        transform.bond;

      // break C-Br
      if (
        a === 'C' &&
        b === 'Br'
      ) {
        breaksCBr = true;
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // SN2: Cyanide substitution
  // ───────────────────────────────────────────────────────────────────────

  if (
    nucleophile === 'CN-' &&
    substrate === 'CH3-Br' &&
    formsCCN &&
    breaksCBr
  ) {

    inferred.push('CH3-CN');
    inferred.push('Br-');
  }

  // ───────────────────────────────────────────────────────────────────────
  // SN2: Hydroxide substitution
  // ───────────────────────────────────────────────────────────────────────

  if (
    nucleophile === 'OH-' &&
    substrate === 'CH3-Br' &&
    formsCOH &&
    breaksCBr
  ) {

    inferred.push('CH3-OH');
    inferred.push('Br-');
  }

  return inferred;
}
