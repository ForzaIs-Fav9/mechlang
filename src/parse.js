export function parseMechlang(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const ast = {
    reaction: null,
    steps: []
  };

  let i = 0;
  let currentStep = null;

  while (i < lines.length) {
    const line = lines[i];

    // --- reaction block ---
    if (line.startsWith("reaction")) {
      const reactantsLine = lines[i + 1];
      const productsLine  = lines[i + 2];

      ast.reaction = {
        reactants: reactantsLine.split(":")[1].split("+").map(s => s.trim()),
        products:  productsLine.split(":")[1].split("+").map(s => s.trim())
      };

      i += 4;
      continue;
    }

    // --- step block ---
    if (line.startsWith("step")) {
      currentStep = { arrows: [] };
      ast.steps.push(currentStep);
      i++;
      continue;
    }

    // --- arrow ---
    if (line.startsWith("arrow")) {
      const inside = line.slice(
        line.indexOf("(") + 1,
        line.lastIndexOf(")")
      );

      const parts = inside.split(",").map(p => p.trim());
      const style = parts[0];
      const from  = parts[1].split("=")[1];
      const to    = parts[2].split("=")[1];

      if (!currentStep) {
        // fallback: implicit single-step mechanism
        currentStep = { arrows: [] };
        ast.steps.push(currentStep);
      }

      currentStep.arrows.push({ style, from, to });
    }

    i++;
  }

  return ast;
}
