import { MoleculeGraph } from './molecule-graph.js';

export function validateTransforms(step) {

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

        let hasNucleophile = false;

        for (
          const molKey
          of Object.values(step.species)
        ) {
          let graph;
          try { graph = MoleculeGraph.fromRegistry(molKey); }
          catch { continue; }

          if (
            graph.charge === -1 &&
            graph.name === requiredNucleophile
          ) {
            hasNucleophile = true;
          }
        }

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
        let graph;
        try { graph = MoleculeGraph.fromRegistry(molKey); }
        catch { continue; }

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
  step
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

        const requiredNucleophile =
          b === 'CN' ? 'CN-' : 'OH-';

        for (
          const [role, molKey]
          of Object.entries(step.species)
        ) {
          let graph;
          try { graph = MoleculeGraph.fromRegistry(molKey); }
          catch { continue; }

          if (
            graph.charge === -1 &&
            graph.name === requiredNucleophile
          ) {
            nucRole = role;
          }

          if (
            graph.hasBond('C', 'Br') ||
            graph.hasBond('C', 'Cl') ||
            graph.hasBond('C', 'I')
          ) {
            subRole = role;
          }
        }

        if (nucRole && subRole) {

          let subGraph;
          try { subGraph = MoleculeGraph.fromRegistry(step.species[subRole]); }
          catch { continue; }

          const leavingAtom =
            subGraph.hasBond('C', 'Br') ? 'Br' :
            subGraph.hasBond('C', 'Cl') ? 'Cl' : 'I';

          const attackAtom =
            b === 'CN' ? 'C' : 'O';

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
        ['Br', 'Cl', 'I'].includes(b)
      ) {

        let subRole = null;

        for (
          const [role, molKey]
          of Object.entries(step.species)
        ) {
          let graph;
          try { graph = MoleculeGraph.fromRegistry(molKey); }
          catch { continue; }

          if (graph.hasBond('C', b)) {
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