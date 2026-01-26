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
      const step = {
        species: {},
        arrows: []
      };

      while (lines[i] !== "}") {
        const line = lines[i];

        // species block
        if (line === "species:") {
          i++;
          while (!lines[i].startsWith("arrow") && !lines[i].startsWith("}")) {
            const [key, value] = lines[i].split("=").map(s => s.trim());
            step.species[key] = value;
            i++;
          }
          continue;
        }

        // arrow(...)
        if (line.startsWith("arrow(")) {
          const arrow = {
            kind: "curved",
            from: null,
            to: null
          };

          i++;
          while (lines[i] !== ")") {
            const l = lines[i].replace(",", "");

            if (l === "curved") {
              arrow.kind = "curved";
            }

            if (l.startsWith("from")) {
              arrow.from = l.split("=").pop().trim();
            }

            if (l.startsWith("to")) {
              arrow.to = l.split("=").pop().trim();
            }

            i++;
          }

          if (arrow.from && arrow.to) {
            step.arrows.push(arrow);
          }

          i++; // skip ')'
          continue;
        }

        i++;
      }

      ast.steps.push(step);
    }

    i++;
  }

  return ast;
}
