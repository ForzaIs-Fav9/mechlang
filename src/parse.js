import fs from "fs";

export function parseMechlang(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const ast = {
    reaction: null,
    arrows: null,
    steps: null
  };

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    /* ===============================
       Reaction block
       =============================== */
    if (line.startsWith("reaction")) {
      const reactantsLine = lines[i + 1];
      const productsLine  = lines[i + 2];

      const reactants = reactantsLine
        .split(":")[1]
        .split("+")
        .map(r => r.trim());

      const products = productsLine
        .split(":")[1]
        .split("+")
        .map(p => p.trim());

      ast.reaction = { reactants, products };
      i += 4;
      continue;
    }

    /* ===============================
       Legacy arrows (v0.6 and below)
       =============================== */
    if (line.startsWith("arrows:")) {
      ast.arrows = [];
      i++;

      while (i < lines.length && lines[i].includes("->")) {
        const [from, to] = lines[i].split("->").map(s => s.trim());
        ast.arrows.push({
          style: "curved",
          from,
          to
        });
        i++;
      }
      continue;
    }

    /* ===============================
       Steps block (v0.7)
       =============================== */
    if (line.startsWith("steps:")) {
      ast.steps = [];
      i++;

      while (i < lines.length && lines[i].startsWith("-")) {
        // Expect: - arrows:
        if (!lines[i].includes("arrows")) {
          throw new Error("Expected '- arrows:' inside steps");
        }

        const step = { arrows: [] };
        i++;

        while (i < lines.length && lines[i].includes("->")) {
          const [from, to] = lines[i].split("->").map(s => s.trim());
          step.arrows.push({
            style: "curved",
            from,
            to
          });
          i++;
        }

        ast.steps.push(step);
      }
      continue;
    }

    i++;
  }

  return ast;
}
