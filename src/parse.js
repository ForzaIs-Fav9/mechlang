export function parseMechlang(input) {
  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const ast = {
    steps: []
  };

  let currentStep = null;
  let mode = null;

  for (const line of lines) {
    if (line === "step {") {
      currentStep = {
        species: {},
        arrows: []
      };
      ast.steps.push(currentStep);
      continue;
    }

    if (line === "}") {
      currentStep = null;
      mode = null;
      continue;
    }

    if (!currentStep) continue;

    if (line.startsWith("species:")) {
      mode = "species";
      continue;
    }

    if (line.startsWith("arrow(")) {
      mode = "arrow";
      currentStep.arrows.push({});
      continue;
    }

    if (mode === "species") {
      const [key, value] = line.split("=").map(s => s.trim());
      currentStep.species[key] = value;
      continue;
    }

    if (mode === "arrow") {
      const arrow = currentStep.arrows[currentStep.arrows.length - 1];

      if (line === ")") continue;

      if (line === "curved," || line === "curved") {
        arrow.curved = true;
        continue;
      }

      if (line.startsWith("from")) {
        arrow.from = line
          .split("=")[1]
          .trim()
          .replace(/,$/, "");
        continue;
      }

      if (line.startsWith("to")) {
        arrow.to = line
          .split("=")[1]
          .trim()
          .replace(/,$/, "");
        continue;
      }
    }
  }

  return ast;
}
