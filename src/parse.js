import fs from "fs";

export function parseMechlang(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const ast = {
    reaction: null,
    arrows: []
  };

  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("reaction")) {
      const reactantsLine = lines[i + 1];
      const productsLine = lines[i + 2];

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

    if (line.startsWith("arrow")) {
      const inside = line.slice(
        line.indexOf("(") + 1,
        line.lastIndexOf(")")
      );

      const parts = inside.split(",").map(p => p.trim());

      const style = parts[0];
      const from = parts[1].split("=")[1];
      const to = parts[2].split("=")[1];

      ast.arrows.push({ style, from, to });
    }

    i++;
  }

  return ast;
}

//const input = fs.readFileSync("examples/sn2.mech", "utf-8");
//const ast = parseMechlang(input);

//console.log(JSON.stringify(ast, null, 2));
