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
node src/render.js examples/sn2.mech
node src/render.js examples/sn2_steps.mech --layout=horizontal
```

No build step. No dependencies to install (`npm install` is a no-op — zero runtime deps). Node.js >= 18, ES Modules.

## Architecture

Strictly layered compiler-style pipeline — no component reaches backward:

```
.mech source → parse.js → semantic-engine.js → product-engine.js → render.js → out/*.svg
```

| Layer | Responsibility | Must NOT |
|---|---|---|
| `parse.js` | Tokenize, build AST, resolve `persist:` cross-step references | Infer chemistry, render SVG |
| `semantic-engine.js` | Validate transforms, infer curved arrows from `form`/`break` ops | Render SVG, synthesize products |
| `product-engine.js` | Heuristic product inference (SN2 substitution, leaving groups) | Render SVG, mutate molecular graphs |
| `render.js` | SVG generation, layout, geometry | Infer chemistry, validate transforms |
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
