import { moleculeRegistry } from './molecules.js';

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

      const [a,b] =
        transform.bond;

      let found =
        false;

      for (
        const molKey
        of Object.values(
          step.species
        )
      ) {

        const mol =
          moleculeRegistry[
            molKey
          ];

        if (!mol) continue;

        for (
          const bond
          of (mol.bonds || [])
        ) {

          const [x,y] =
            bond;

          const direct =
            x===a &&
            y===b;

          const reverse =
            x===b &&
            y===a;

          if (
            direct ||
            reverse
          ) {
            found=true;
          }
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

export function inferArrowsFromTransforms(step) {

  const inferred=[];

  for (
    const transform
    of (step.transforms||[])
  ) {

    // ── FORM inference ───────────────────────────────────────────────

    if (
      transform.type==='form'
    ) {

      const [a,b]=
        transform.bond;

      if (
        a==='C' &&
        ['CN','OH'].includes(
          b
        )
      ) {

        let nucRole =
          null;

        let subRole =
          null;

        for (
          const [role,molKey]
          of Object.entries(
            step.species
          )
        ) {

          const isMatchingNucleophile =

            (
              b==='CN' &&
              molKey==='CN-'
            )

            ||

            (
              b==='OH' &&
              molKey==='OH-'
            );

          if (
            isMatchingNucleophile
          ) {

            nucRole=
              role;
          }

          if (

            molKey.includes(
              'Br'
            ) ||

            molKey.includes(
              'Cl'
            ) ||

            molKey.includes(
              'I'
            )

          ) {

            subRole=
              role;
          }
        }

        if (
          nucRole &&
          subRole
        ) {

          const leavingAtom =

            step.species[
              subRole
            ].includes(
              'Br'
            )

            ? 'Br'

            :

            step.species[
              subRole
            ].includes(
              'Cl'
            )

            ? 'Cl'

            : 'I';

          const attackAtom =

            b==='CN'
              ? 'C'
              : 'O';

          inferred.push({

            curved:true,
            inferred:true,

            inferenceType:
              'attack',

            from:
              `${nucRole}.${attackAtom}`,

            to:
              `${subRole}.C-${leavingAtom}`

          });
        }
      }
    }

    // ── BREAK inference ───────────────────────────────────────────────

    if (
      transform.type==='break'
    ) {

      const [a,b]=
        transform.bond;

      if (

        a==='C' &&

        ['Br','Cl','I']
        .includes(
          b
        )

      ) {

        let subRole =
          null;

        for (
          const [role,molKey]
          of Object.entries(
            step.species
          )
        ) {

          if (

            molKey.includes(
              b
            )

            &&

            molKey.includes(
              'CH3'
            )

          ) {

            subRole=
              role;
          }
        }

        if (
          subRole
        ) {

          inferred.push({

            curved:true,
            inferred:true,

            inferenceType:
              'leaving',

            from:
              `${subRole}.C-${b}`,

            to:
              `${subRole}.${b}`

          });
        }
      }
    }
  }

  return inferred;
}
