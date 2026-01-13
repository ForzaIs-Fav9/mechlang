export function parseMechlang(input) {
  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const ast = {
    reaction: { reactants: [], products: [] },
    arrows: [],
    steps: []
  };

  let i = 0;
  let currentStep = null;

  while (i < lines.length) {
    const line = lines[i];

    /* ===============================
       Reaction block
       =============================== */
    if (line.startsWith("reaction")) {
      i++;
      while (i < lines.length && !lines[i].startsWith("}")) {
        const l = lines[i];

        if (l.startsWith("reactants:")) {
          ast.reaction.reactants =
            l.replace("reactants:", "")
             .split(",")
             .map(s => s.trim());
        }

        if (l.startsWith("products:")) {
          ast.reaction.products =
            l.replace("products:", "")
             .split(",")
             .map(s => s.trim());
        }

        i++;
      }
    }

    /* ===============================
       Step block
       =============================== */
    else if (line.startsWith("step")) {
      currentStep = {
        arrows: []
      };
      ast.steps.push(currentStep);
    }

    /* ===============================
       Arrow syntax
       =============================== */
    else if (line.startsWith("arrow")) {
      const match = line.match(/from\s*=\s*([^,]+),\s*to\s*=\s*([^)]+)/);
      if (match) {
        const arrow = {
          style: "curved",
          from: match[1].trim(),
          to: match[2].trim()
        };

        if (currentStep) {
          currentStep.arrows.push(arrow);
        } else {
          ast.arrows.push(arrow);
        }
      }
    }

    i++;
  }

  /* ===============================
     Flatten arrows
     =============================== */
  if (ast.steps.length > 0) {
    ast.arrows = ast.steps.flatMap(step => step.arrows);
  }

  return ast;
}
