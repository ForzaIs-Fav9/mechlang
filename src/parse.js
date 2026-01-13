// src/parse.js

export function parseMechlang(input) {
  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const ast = {
    reaction: {
      reactants: [],
      products: []
    },
    arrows: [],
    steps: []
  };

  let i = 0;
  let currentStep = null;

  function expect(condition, msg) {
    if (!condition) throw new Error(msg);
  }

  while (i < lines.length) {
    const line = lines[i];

    /* ===============================
       reaction { ... }
       =============================== */
    if (line === "reaction {") {
      i++;
      while (lines[i] !== "}") {
        if (lines[i].startsWith("reactants:")) {
          ast.reaction.reactants =
            lines[i].replace("reactants:", "")
              .split("+")
              .map(s => s.trim());
        }

        if (lines[i].startsWith("products:")) {
          ast.reaction.products =
            lines[i].replace("products:", "")
              .split("+")
              .map(s => s.trim());
        }

        i++;
      }
      i++;
      continue;
    }

    /* ===============================
       step <name> { ... }
       =============================== */
    if (line.startsWith("step ")) {
      const name = line.replace("step", "").replace("{", "").trim();

      currentStep = {
        name,
        arrows: []
      };

      ast.steps.push(currentStep);
      i++;
      continue;
    }

    /* ===============================
       end of step
       =============================== */
    if (line === "}" && currentStep) {
      currentStep = null;
      i++;
      continue;
    }

    /* ===============================
       arrow(...)
       =============================== */
    if (line.startsWith("arrow(")) {
      const inner = line.slice(6, -1);
      const parts = inner.split(",").map(p => p.trim());

      const arrow = {};
      for (const part of parts) {
        const [k, v] = part.split("=").map(s => s.trim());
        arrow[k] = v;
      }

      if (currentStep) {
        currentStep.arrows.push(arrow);
      } else {
        ast.arrows.push(arrow);
      }

      i++;
      continue;
    }

    i++;
  }

  /* ===============================
     SAFETY NORMALIZATION
     =============================== */

  if (!Array.isArray(ast.arrows)) {
    ast.arrows = [];
  }

  if (!Array.isArray(ast.steps)) {
    ast.steps = [];
  }

  for (const step of ast.steps) {
    if (!Array.isArray(step.arrows)) {
      step.arrows = [];
    }
  }

  return ast;
}
