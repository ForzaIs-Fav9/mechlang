export function parseMechlang(input) {
  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const ast = {
    steps: []
  };

  let i = 0;

  while (i < lines.length) {
    if (lines[i] === "step {") {
      i++;
      const block = [];

      while (lines[i] !== "}") {
        block.push(lines[i]);
        i++;
      }

      ast.steps.push(parseStep(block));
    }

    i++;
  }

  return ast;
}

function parseStep(lines) {
  const step = {
    species: {},
    arrows: []
  };

  let inSpecies = false;

  for (const line of lines) {
    if (line.startsWith("species:")) {
      inSpecies = true;
      continue;
    }

    if (inSpecies && line.includes("=")) {
      const [role, molecule] = line.split("=").map(s => s.trim());
      step.species[role] = molecule;
      continue;
    }

    if (line.startsWith("arrow")) {
      const args = {};

      line
        .replace("arrow(", "")
        .replace(")", "")
        .split(",")
        .map(p => p.trim())
        .forEach(p => {
          if (!p.includes("=")) return; // ← ignore flags like 'curved'
          const [k, v] = p.split("=").map(s => s.trim());
          args[k] = v;
        });


      step.arrows.push(args);
    }
  }

  return step;
}
