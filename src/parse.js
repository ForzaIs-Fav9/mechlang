export function parseMechlang(input) {
  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const steps = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i] === "step {") {
      i++;
      const step = {
        species: {},
        arrows: []
      };

      while (lines[i] !== "}") {
        // --- species block ---
        if (lines[i] === "species:") {
          i++;
          while (!lines[i].startsWith("arrow") && lines[i] !== "}") {
            const [key, value] = lines[i].split("=").map(s => s.trim());
            step.species[key] = value;
            i++;
          }
          continue;
        }

        // --- arrow block ---
        if (lines[i].startsWith("arrow")) {
          i++; // skip "arrow("
          const arrow = {};

          while (!lines[i].startsWith(")")) {
            const line = lines[i].replace(",", "");
            if (line === "curved") arrow.type = "curved";

            if (line.startsWith("from")) {
              arrow.from = line.split("=").pop().trim();
            }

            if (line.startsWith("to")) {
              arrow.to = line.split("=").pop().trim();
            }

            i++;
          }

          step.arrows.push(arrow);
          i++; // skip ")"
          continue;
        }

        i++;
      }

      steps.push(step);
    }

    i++;
  }

  // =========================
  // STEP MATERIALIZATION
  // =========================

  const molecules = new Set();
  const arrows = [];

  for (const step of steps) {
    // register molecules
    for (const role in step.species) {
      molecules.add(step.species[role]);
    }

    // materialize arrows
    for (const arrow of step.arrows) {
      const [fromRole, fromAtom] = arrow.from.split(".");
      const [toRole, toBond] = arrow.to.split(".");

      arrows.push({
        type: arrow.type,
        from: `${step.species[fromRole]}.${fromAtom}`,
        to: `${step.species[toRole]}.${toBond}`
      });
    }
  }

  return {
    reaction: {
      molecules: Array.from(molecules),
      arrows
    }
  };
}
