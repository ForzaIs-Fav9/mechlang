# mechlang

mechlang is an experimental, open-source, text-based language for representing organic chemistry reaction mechanisms and curved-arrow electron flow semantically.

Instead of manually drawing static mechanism diagrams, mechlang treats reactions as structured data that can be parsed, interpreted, and rendered programmatically.

---

## What is mechlang?

mechlang is a small domain-specific language (DSL) designed to describe organic chemistry reactions using text.

A mechlang file encodes:
- reactants and products
- electron movement via curved arrows
- multi-step reaction semantics
- chemical intent rather than visual geometry

This textual description is parsed into a structured internal representation (an abstract syntax tree, or AST), which can then be rendered into diagrams or used for further analysis.

---

## Motivation

Organic reaction mechanisms are traditionally represented as drawings. While visually intuitive, these diagrams are fundamentally static: they are difficult to version-control, hard to edit incrementally, and lose their underlying chemical meaning once reduced to geometry.

mechlang explores an alternative approach:
- describe *what happens chemically* instead of *how it is drawn*
- separate chemical semantics from visual layout
- enable reproducible, programmatic generation of mechanisms

The project sits at the intersection of chemistry, programming language design, and scientific visualization.

---

## How it works

mechlang follows a compiler-style pipeline:

1. A `.mech` file describes a reaction and electron flow
2. `parse.js` reads the file and constructs an AST
3. `render.js` interprets the AST and generates an SVG mechanism diagram

The renderer is driven entirely by the AST, not by hardcoded molecule names or hand-placed geometry.

---

## Example

```mech
step {
  species:
    nucleophile = CN-
    electrophile = CH3-Br

  arrow(
    curved,
    from = nucleophile.C,
    to   = electrophile.C-Br
  )
}
```
## Semantic Transform Blocks (v0.14)

MechLang now supports semantic bond operations independent from rendering:

```mech
step {
  species:
    nuc = CN-
    sub = CH3-Br

  transform {
    form C-CN
    break C-Br
  }
}
```

Transforms describe chemical state changes semantically rather than manually specifying SVG arrow geometry.

Current supported operations:
- `form A-B`
- `break A-B`

Transforms are currently parser-level semantics and may later compile into automatic curved-arrow generation.

---

## Currently Supported

- Multi-step reaction mechanisms via `step {}` blocks
- Curved-arrow electron flow
- Atom-level arrow targeting (`role.atom`)
- Bond midpoint targeting (`role.A-B`)
- Species persistence across steps
- Single bond rendering
- Double bond rendering (`C=C`, `C=O`)
- Charge annotations (`+`, `−`)
- Vertical layout mode
- Horizontal layout mode (`--layout=horizontal`)
- Deterministic SVG generation
- Multiple arrows per mechanism step
- Collision-aware curved arrow routing
- Arrowheads via SVG markers

---

## Current Limitations

- No stereochemistry (wedge/dash bonds)
- No aromaticity or ring systems
- No triple bond rendering yet
- No automated molecular geometry inference
- No chemistry validation
- No resonance arrow rendering yet
- No orbital-aware attack vectors
- No collision optimization for very dense mechanisms

---

## Mechanism Steps

All arrows must appear inside a `step {}` block.

A step represents a single elementary reaction event where all arrows occur simultaneously.

```mech
step {
  species:
    nucleophile = CN-
    electrophile = CH3-Br

  arrow(
    curved,
    from = nucleophile.C,
    to   = electrophile.C-Br
  )
}
```

---

## Species Persistence

Species may persist across steps explicitly using `persist:`.

```mech
step {
  species:
    nuc = CN-
    sub = CH3-Br
}

step {
  persist: nuc

  species:
    product = CH3-CN
    leaving = Br-
}
```

Persistence is resolved entirely during parsing. The renderer receives a fully resolved species map for every step.

---

## Layout Modes

### Vertical (default)

Steps flow top-to-bottom.

```bash
node src/render.js examples/sn2_steps.mech
```

### Horizontal

Steps flow left-to-right.

```bash
node src/render.js examples/sn2_steps.mech --layout=horizontal
```

---

## Project Philosophy

mechlang is built around several core principles:

- Chemical meaning is separate from geometry
- The AST is the single source of truth
- Rendering must be deterministic
- Parser and renderer responsibilities remain strictly separated
- No hidden global state
- Explicit semantics over implicit behavior

---

## Development

Requirements:
- Node.js >= 18
- ES Modules enabled

Run renderer:

```bash
node src/render.js examples/sn2_steps.mech
```

Horizontal layout:

```bash
node src/render.js examples/sn2_steps.mech --layout=horizontal
```

---

## Versioning

mechlang uses semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Examples:
- `0.13.0` → new renderer features
- `0.13.1` → bug fix release

---

## Commit Conventions

MechLang uses Conventional Commits:

- feat
- fix
- refactor
- style
- docs
- test
- chore

Example:

```text
feat(renderer): implement curved-arrow collision routing
```

---

## Architecture

See:
- `docs/architecture.md`
- `docs/renderer-contract.md`
- `docs/design-decisions.md`
- `docs/roadmap.md`

---

## License

Apache License 2.0

---

## Status

Current release target:
```text
v0.13.0
```

MechLang is still experimental but now supports stable multi-step organic mechanism rendering with semantic curved-arrow flow.
