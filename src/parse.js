export function parseMechlang(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const ast = {
    reaction: null,
    steps: [],
    arrows: []
  };

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    /* ===============================
       reaction block (unchanged)
       =============================== */
    if (line.startsWith("reaction")) {
      const reactants = lines[i + 1]
        .split(":")[1]
        .split("+")
        .map(s => s.trim());

      const products = lines[i + 2]
        .split(":")[1]
        .split("+")
        .map(s => s.trim());

      ast.reaction = { reactants, products };
      i += 4;
      continue;
    }

    /* ===============================
       step block (NEW)
       =============================== */
    if (line === "step {") {
      const step = {
        species: [],
        arrows: []
      };

      i++;

      while (lines[i] !== "}") {
        const l = lines[i];

        if (l.startsWith("species:")) {
          step.species = l
            .split(":")[1]
            .split("+")
            .map(s => s.trim());
        }

        if (l.startsWith("arrow")) {
          const inside = l.slice(
            l.indexOf("(") + 1,
            l.lastIndexOf(")")
          );

          const parts = inside.split(",").map(p => p.trim());
          const style = parts[0];
          const from = parts.find(p => p.startsWith("from="))?.split("=")[1];
          const to   = parts.find(p => p.startsWith("to="))?.split("=")[1];

          step.arrows.push({ style, from, to });
        }

        i++;
      }

      ast.steps.push(step);
      i++;
      continue;
    }

    i++;
  }

  return ast;
}
