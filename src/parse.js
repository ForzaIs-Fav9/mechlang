/**
 * parse.js — MechLang Parser
 *
 * Reads a .mech source string and produces an AST of the form:
 *   { steps: [ { species: {}, arrows: [] }, ... ] }
 *
 * Design contract:
 *   - No visual or geometric information is produced here.
 *   - No chemistry validation is performed.
 *   - Unknown or malformed input emits console.warn and is skipped safely.
 *   - Parsing never throws; it degrades gracefully.
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
      currentStep = { species: {}, arrows: [] };
      ast.steps.push(currentStep);
      mode = null;
      continue;
    }

    // ── Block close ────────────────────────────────────────────────────────
    if (line === "}") {
      currentStep = null;
      mode = null;
      continue;
    }

    // ── Guard: must be inside a step ───────────────────────────────────────
    if (!currentStep) {
      console.warn(`[mechlang] Line outside step block ignored: "${line}"`);
      continue;
    }

    // ── Species block open ─────────────────────────────────────────────────
    if (line.startsWith("species:")) {
      mode = "species";
      continue;
    }

    // ── Arrow block open ───────────────────────────────────────────────────
    if (line.startsWith("arrow(")) {
      mode = "arrow";
      currentStep.arrows.push({ curved: false, from: null, to: null });
      continue;
    }

    // ── Arrow block close ──────────────────────────────────────────────────
    if (line === ")") {
      const arrow = currentStep.arrows[currentStep.arrows.length - 1];
      if (arrow && (!arrow.from || !arrow.to)) {
        console.warn(
          `[mechlang] Arrow is missing 'from' or 'to' — will be skipped during rendering.`
        );
      }
      mode = null;
      continue;
    }

    // ── Species parsing ────────────────────────────────────────────────────
    if (mode === "species") {
      if (!line.includes("=")) {
        console.warn(`[mechlang] Malformed species line (no '='): "${line}"`);
        continue;
      }
      const eqIndex = line.indexOf("=");
      const key = line.slice(0, eqIndex).trim();
      const value = line.slice(eqIndex + 1).trim();
      if (!key || !value) {
        console.warn(`[mechlang] Empty species key or value: "${line}"`);
        continue;
      }
      currentStep.species[key] = value;
      continue;
    }

    // ── Arrow property parsing ─────────────────────────────────────────────
    if (mode === "arrow") {
      const arrow = currentStep.arrows[currentStep.arrows.length - 1];

      if (line === "curved," || line === "curved") {
        arrow.curved = true;
        continue;
      }

      if (line.startsWith("from")) {
        if (!line.includes("=")) {
          console.warn(`[mechlang] Malformed 'from' line: "${line}"`);
          continue;
        }
        const eqIndex = line.indexOf("=");
        arrow.from = line.slice(eqIndex + 1).trim().replace(/,$/, "");
        continue;
      }

      if (line.startsWith("to")) {
        if (!line.includes("=")) {
          console.warn(`[mechlang] Malformed 'to' line: "${line}"`);
          continue;
        }
        const eqIndex = line.indexOf("=");
        arrow.to = line.slice(eqIndex + 1).trim().replace(/,$/, "");
        continue;
      }

      console.warn(`[mechlang] Unrecognized line in arrow block: "${line}"`);
      continue;
    }

    // ── Fallthrough ────────────────────────────────────────────────────────
    console.warn(`[mechlang] Unrecognized line (no active mode): "${line}"`);
  }

  if (ast.steps.length === 0) {
    console.warn(`[mechlang] No step blocks found. Is this a valid .mech file?`);
  }

  return ast;
}
