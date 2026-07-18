# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is mechlang

A text-based DSL for representing organic chemistry reaction mechanisms semantically. `.mech` source files describe electron flow and bond transformations; the toolchain parses, validates, infers products, and renders SVG diagrams.

## Commands

```bash
# Run all tests
npm test

# Run individual test suites
node tests/semantic-engine.test.js
node tests/product-engine.test.js

# Render a .mech file to SVG (output in out/)
node src/cli.js examples/sn2.mech
node src/cli.js examples/sn2_steps.mech --layout=horizontal
```

No build step. No dependencies to install (`npm install` is a no-op — zero runtime deps). Node.js >= 18, ES Modules.

## Architecture

Strictly layered compiler-style pipeline — no component reaches backward:

```
.mech source → cli.js → parse.js → compile.js → render.js → out/*.svg
```

| Layer | Responsibility | Must NOT |
|---|---|---|
| `cli.js` | File I/O, argument parsing, pipeline orchestration | Infer chemistry, render SVG |
| `parse.js` | Tokenize, build AST, resolve `persist:` cross-step references | Infer chemistry, render SVG |
| `compile.js` | Construct per-step graphMap, orchestrate semantic validation, arrow inference, product inference | Render SVG, perform I/O |
| `molecule-graph.js` | MoleculeGraph class — structural topology (atoms, bonds, charge, queries) | Store coordinates, render SVG |
| `semantic-engine.js` | Validate transforms, infer curved arrows from `form`/`break` ops (receives graphMap from compile) | Render SVG, synthesize products, construct MoleculeGraph instances |
| `product-engine.js` | Heuristic product inference (SN2 substitution, leaving groups) (receives graphMap from compile) | Render SVG, construct MoleculeGraph instances |
| `render.js` | SVG generation, layout, geometry (pure function, no I/O) | Infer chemistry, validate transforms, import semantic/product engines, import molecule-graph |
| `molecules.js` | Static registry of molecule templates (atoms, bonds, charges, coords) | — |

Key architectural rules:
- Chemistry reasoning never lives in the renderer.
- The parser never throws — it emits `console.warn` and degrades gracefully.
- Arrow direction is always AST-derived, never geometry-derived.
- Persistence is fully resolved in the parser post-pass; the renderer sees only step-local species maps.
- Atom coordinates in `molecules.js` are heuristic layout offsets, not chemically computed.
- Atoms with duplicate symbols use internal aliases (`Ca`, `Cb`) with a `labels` map for display.

## Testing

Tests use plain `node:assert` — no test framework. Each test file is a standalone script that exits 0 on success. Tests must be deterministic. Changes affecting rendering must ensure deterministic SVG output and not break canonical examples.

## Conventions

- **Commits**: Conventional Commits — `feat(scope)`, `fix(scope)`, `refactor(scope)`, `docs(scope)`, `test(scope)`, `chore(scope)`
- **Branches**: `feature/<desc>`, `fix/<desc>`, `refactor/<desc>`, `docs/<desc>` — never commit directly to main
- **Versioning**: semver (MAJOR = breaking DSL/AST, MINOR = features, PATCH = fixes)
- **Code style**: No global mutable state, small single-purpose functions, Prettier formatting
