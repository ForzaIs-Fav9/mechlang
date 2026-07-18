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

          const carbonAtom =
            graph.atoms.find(atom => atom.element === 'C');

          if (carbonAtom) {

            const hasHalideBond =
              graph.neighbors(carbonAtom.id).some(nId => {

                const n = graph.getAtom(nId);

                return (
                  n &&
                  (
                    n.element === 'Br' ||
                    n.element === 'Cl' ||
                    n.element === 'I' ||
                    n.element === 'F'
                  )
                );
              });

            if (hasHalideBond) {
              subRole = role;
            }
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