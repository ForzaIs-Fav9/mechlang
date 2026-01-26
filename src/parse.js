// src/parse.js

export function parseMechlang(input) {
  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const ast = {
    reaction: null,
    steps: []
  };

  let currentStep = null;

  for (const line of lines) {

    // ---------- STEP START ----------
    if (line === "step {") {
      currentStep = {
        species: [],
        arrows: []
      };
      continue;
    }

    // ---------- STEP END ----------
    if (line === "}") {
      if (currentStep) {
        ast.steps.push(currentStep);
        currentStep = null;
      }
      continue;
    }

    // ---------- SPECIES ----------
    if (currentStep && line.startsWith("species:")) {
      const species = line
        .replace("species:", "")
        .split("+")
        .map(s => s.trim());

      currentStep.species = species;
      continue;
    }

    // ---------- ARROW ----------
    if (currentStep && line.startsWith("arrow(")) {
      const args = {};

      line
        .replace("arrow(", "")
        .replace(")", "")
        .split(",")
        .map(p => p.trim())
        .forEach(p => {
          if (!p.includes("=")) return; // ignore flags like "curved"
          const [k, v] = p.split("=").map(s => s.trim());
          args[k] = v;
        });

      currentStep.arrows.push({
        from: args.from,
        to: args.to
      });

      continue;
    }
  }

  return ast;
}
