/**
 * parse.js — MechLang Parser
 *
 * Reads a .mech source string and produces an AST of the form:
 *   {
 *     steps: [
 *       {
 *         species: {},
 *         arrows: [],
 *         transforms: [],
 *         persist: []
 *       },
 *       ...
 *     ]
 *   }
 *
 * Design contract:
 *   - No visual or geometric information is produced here.
 *   - No chemistry validation is performed.
 *   - Unknown or malformed input emits console.warn and is skipped safely.
 *   - Parsing never throws; it degrades gracefully.
 *
 * Species persistence (v0.12):
 *   - Each step may declare `persist: alias1, alias2, ...`
 *   - After all steps are parsed, a post-pass resolves each persisted alias
 *     against the previous step's species map and merges it into the current
 *     step's species map.
 *   - render.js sees only a fully resolved species map — it is completely
 *     blind to persistence mechanics. Step-local semantics are preserved.
 *
 * Transform semantics (v0.14):
 *   - Each step may declare:
 *
 *       transform {
 *         form  A-B
 *         break C-D
 *       }
 *
 *   - Transforms are semantic bond operations only.
 *   - They are NOT rendering instructions.
 *   - Rendering support may be added in future versions.
 */

export function parseMechlang(input) {
  const lines = input
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const ast = { steps: [] };

  let currentStep = null;
  let mode = null;

  for (const line of lines) {

    // ── Step open ──────────────────────────────────────────────────────────
    if (line === "step {") {
      currentStep = {
        species: {},
        arrows: [],
        transforms: [],
        persist: []
      };

      ast.steps.push(currentStep);
      mode = null;
      continue;
    }

    // ── Block close ────────────────────────────────────────────────────────
    if (line === "}") {
      mode = null;
      continue;
    }

    // ── Guard: must be inside a step ──────────────────────────────────────
    if (!currentStep) {
      console.warn(
        `[mechlang] Line outside step block ignored: "${line}"`
      );
      continue;
    }

    // ── Persist block ─────────────────────────────────────────────────────
    if (line.startsWith("persist:")) {
      const raw = line
        .slice("persist:".length)
        .trim();

      const aliases = raw
        .split(",")
        .map(a => a.trim())
        .filter(Boolean);

      currentStep.persist.push(...aliases);

      mode = null;
      continue;
    }

    // ── Species block open ────────────────────────────────────────────────
    if (line.startsWith("species:")) {
      mode = "species";
      continue;
    }

    // ── Arrow block open ──────────────────────────────────────────────────
    if (line.startsWith("arrow(")) {
      mode = "arrow";

      currentStep.arrows.push({
        curved: false,
        from: null,
        to: null
      });

      continue;
    }

    // ── Arrow block close ─────────────────────────────────────────────────
    if (line === ")") {
      const arrow =
        currentStep.arrows[
          currentStep.arrows.length - 1
        ];

      if (arrow && (!arrow.from || !arrow.to)) {
        console.warn(
          `[mechlang] Arrow is missing 'from' or 'to' — will be skipped during rendering.`
        );
      }

      mode = null;
      continue;
    }

    // ── Transform block open ──────────────────────────────────────────────
    if (line === "transform {") {
      mode = "transform";
      continue;
    }

    // ── Species parsing ───────────────────────────────────────────────────
    if (mode === "species") {

      if (!line.includes("=")) {
        console.warn(
          `[mechlang] Malformed species line (no '='): "${line}"`
        );
        continue;
      }

      const eqIndex = line.indexOf("=");

      const key =
        line.slice(0, eqIndex).trim();

      const value =
        line.slice(eqIndex + 1).trim();

      if (!key || !value) {
        console.warn(
          `[mechlang] Empty species key or value: "${line}"`
        );
        continue;
      }

      currentStep.species[key] = value;
      continue;
    }

    // ── Arrow property parsing ────────────────────────────────────────────
    if (mode === "arrow") {

      const arrow =
        currentStep.arrows[
          currentStep.arrows.length - 1
        ];

      if (line === "curved," || line === "curved") {
        arrow.curved = true;
        continue;
      }

      if (line.startsWith("from")) {

        if (!line.includes("=")) {
          console.warn(
            `[mechlang] Malformed 'from' line: "${line}"`
          );
          continue;
        }

        const eqIndex = line.indexOf("=");

        arrow.from =
          line
            .slice(eqIndex + 1)
            .trim()
            .replace(/,$/, "");

        continue;
      }

      if (line.startsWith("to")) {

        if (!line.includes("=")) {
          console.warn(
            `[mechlang] Malformed 'to' line: "${line}"`
          );
          continue;
        }

        const eqIndex = line.indexOf("=");

        arrow.to =
          line
            .slice(eqIndex + 1)
            .trim()
            .replace(/,$/, "");

        continue;
      }

      console.warn(
        `[mechlang] Unrecognized line in arrow block: "${line}"`
      );

      continue;
    }

    // ── Transform parsing ─────────────────────────────────────────────────
    if (mode === "transform") {

      const parts =
        line.split(/\s+/);

      if (parts.length !== 2) {
        console.warn(
          `[mechlang] Malformed transform line: "${line}"`
        );
        continue;
      }

      const [type, bondText] = parts;

      if (type !== "form" && type !== "break") {
        console.warn(
          `[mechlang] Unknown transform type "${type}" in line: "${line}"`
        );
        continue;
      }

      if (!bondText.includes("-")) {
        console.warn(
          `[mechlang] Transform bond missing '-' in line: "${line}"`
        );
        continue;
      }

      const [a, b] =
        bondText.split("-");

      if (!a || !b) {
        console.warn(
          `[mechlang] Invalid transform bond in line: "${line}"`
        );
        continue;
      }

      currentStep.transforms.push({
        type,
        bond: [a, b]
      });

      continue;
    }

    // ── Fallthrough ───────────────────────────────────────────────────────
    console.warn(
      `[mechlang] Unrecognized line (no active mode): "${line}"`
    );
  }

  // ── Species persistence post-pass (v0.12) ──────────────────────────────
  // Resolves each persisted alias against the previous step's species map.
  // Merges resolved molKeys into the current step's species map.
  // render.js sees only the final resolved species map — persistence is
  // invisible to the renderer. Step-local semantics are fully preserved.
  for (let i = 1; i < ast.steps.length; i++) {

    const prev = ast.steps[i - 1];
    const curr = ast.steps[i];

    for (const alias of curr.persist) {

      if (curr.species[alias]) {
        console.warn(
          `[mechlang] persist alias "${alias}" already declared in species block — skipping.`
        );
        continue;
      }

      if (!prev.species[alias]) {
        console.warn(
          `[mechlang] persist alias "${alias}" not found in previous step — skipping.`
        );
        continue;
      }

      curr.species[alias] =
        prev.species[alias];
    }
  }

  if (ast.steps.length === 0) {
    console.warn(
      `[mechlang] No step blocks found. Is this a valid .mech file?`
    );
  }

  return ast;
}
