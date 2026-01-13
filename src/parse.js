export function parseMechlang(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const ast = {
    reaction: null,
    steps: []
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
       Step block (STRICT)
       =============================== */
    if (line.startsWith("step")) {
      const step = { arrows: [] };
      i++; // move into step block

      while (i < lines.length && !lines[i].startsWith("}")) {
        const l = lines[i];

        if (l.startsWith("arrow")) {
          const inside = l.slice(
            l.indexOf("(") + 1,
            l.lastIndexOf(")")
          );

          const parts = inside.split(",").map(p => p.trim());

          const style = parts[0];
          const from  = parts.find(p => p.startsWith("from="))?.split("=")[1];
          const to    = parts.find(p => p.startsWith("to="))?.split("=")[1];

          if (!from || !to) {
            console.warn("Malformed arrow:", l);
          } else {
            step.arrows.push({ style, from, to });
          }
        }

        i++;
      }

      ast.steps.push(step);
      i++; // skip closing }
      continue;
    }

    /* ===============================
       Illegal arrows (STRICT MODE)
       =============================== */
    if (line.startsWith("arrow")) {
      throw new Error(
        "Arrow must be inside step { } (v0.6 strict mode)"
      );
    }

    i++;
  }

  return ast;
}
