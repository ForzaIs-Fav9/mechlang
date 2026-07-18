export function validateTransforms(step, graphMap) {

  for (const transform of step.transforms || []) {

    // ── form C-X validation ───────────────────────────────────────────────

    if (
      transform.type === 'form'
    ) {

      const [a, b] =
        transform.bond;

      if (
        a === 'C' &&
        ['CN', 'OH'].includes(b)
      ) {

        const requiredNucleophile =

          b === 'CN'
            ? 'CN-'
            : 'OH-';

        const hasNucleophile =
          Object.values(
            step.species
          ).includes(
            requiredNucleophile
          );

        if (!hasNucleophile) {

          console.warn(
            `[mechlang] transform requires ${requiredNucleophile} nucleophile but none was found.`
          );
        }
      }
    }

    // ── break C-X validation ─────────────────────────────────────────────

    if (
      transform.type === 'break'
    ) {

      const [a, b] =
        transform.bond;

      let found = false;

      for (
        const molKey
        of Object.values(step.species)
      ) {

        const graph = graphMap.get(molKey);
        if (!graph) continue;

        if (graph.hasBond(a, b)) {
          found = true;
        }
      }

      if (!found) {

        console.warn(
          `[mechlang] break transform references missing bond ${a}-${b}.`
        );
      }
    }
  }
}

export function inferArrowsFromTransforms(
  step,
  graphMap
) {

  const inferred = [];

  for (
    const transform
    of (step.transforms || [])
  ) {

    // ── FORM inference ───────────────────────────────────────────────

    if (
      transform.type === 'form'
    ) {

      const [a, b] =
        transform.bond;

      if (
        a === 'C' &&
        ['CN', 'OH'].includes(b)
      ) {

        let nucRole = null;
        let subRole = null;

        for (
          const [role, molKey]
          of Object.entries(step.species)
        ) {

          const isMatchingNucleophile =
            (b === 'CN' && molKey === 'CN-') ||
            (b === 'OH' && molKey === 'OH-');

          if (isMatchingNucleophile) {
            nucRole = role;
          }

          const graph = graphMap.get(molKey);
          if (!graph) continue;

          // TODO(M4): Replace element scans with MoleculeGraph.hasElement() during the classification milestone.
          const hasHalide =
            graph.atoms.some(atom =>
              atom.element === 'Br' ||
              atom.element === 'Cl' ||
              atom.element === 'I' ||
              atom.element === 'F'
            );

          if (hasHalide) {
            subRole = role;
          }
        }

        if (nucRole && subRole) {

          const subGraph = graphMap.get(step.species[subRole]);
          if (!subGraph) continue;

          const leavingAtom =
            subGraph.atoms.find(atom => atom.element === 'Br')
              ? 'Br'
              : subGraph.atoms.find(atom => atom.element === 'Cl')
                ? 'Cl'
                : subGraph.atoms.find(atom => atom.element === 'I')
                  ? 'I'
                  : 'F';

          const attackAtom =
            b === 'CN'
              ? 'C'
              : 'O';

          inferred.push({
            curved: true,
            inferred: true,
            inferenceType: 'attack',
            from: `${nucRole}.${attackAtom}`,
            to: `${subRole}.C-${leavingAtom}`
          });
        }
      }
    }

    // ── BREAK inference ───────────────────────────────────────────────

    if (
      transform.type === 'break'
    ) {

      const [a, b] =
        transform.bond;

      if (
        a === 'C' &&
        ['Br', 'Cl', 'I', 'F'].includes(b)
      ) {

        let subRole = null;

        for (
          const [role, molKey]
          of Object.entries(step.species)
        ) {

          const graph = graphMap.get(molKey);
          if (!graph) continue;

          const hasLeavingElement =
            graph.atoms.some(atom => atom.element === b);

          const hasCarbon =
            graph.atoms.some(atom => atom.element === 'C');

          if (hasLeavingElement && hasCarbon) {
            subRole = role;
          }
        }

        if (subRole) {

          inferred.push({
            curved: true,
            inferred: true,
            inferenceType: 'leaving',
            from: `${subRole}.C-${b}`,
            to: `${subRole}.${b}`,
            local: true
          });
        }
      }
    }
  }

  return inferred;
}
