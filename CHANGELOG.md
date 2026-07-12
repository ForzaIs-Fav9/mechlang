# Changelog

All notable changes to MechLang will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned

* transition-state construction
* intermediate-state representation
* multi-step reaction synthesis
* resonance and state propagation

---

## [0.17.0] - 2026-07-12

### Added

- `MoleculeGraph` class (`src/molecule-graph.js`) — read-only graph abstraction over molecule topology
- Query API: `getAtom()`, `neighbors()`, `hasBond()`, `getBond()`, `bondOrder()`, `atomCount()`, `bondCount()`
- `MoleculeGraph.fromRegistry(name)` factory constructs graphs from the molecule registry
- `compile.js` owns graph construction — builds a `graphMap` (one graph per unique molecule per step)
- `semantic-engine.js` consumes `graphMap` for bond validation and arrow inference
- `product-engine.js` consumes `graphMap` for species classification and SN2 pattern matching
- Comprehensive molecule-graph test suite (19 assertions across all query methods)

### Changed

- `semantic-engine.js` — migrated from direct registry traversal to `graphMap` topology queries
- `product-engine.js` — migrated species classification from registry key matching to graph-based structural analysis
- `compile.js` — centralized MoleculeGraph ownership; engines receive pre-built `graphMap`
- `validateTransforms(step, graphMap)` — signature now accepts graphMap parameter
- `inferArrowsFromTransforms(step, graphMap)` — signature now accepts graphMap parameter
- `inferProducts(step, graphMap)` — signature now accepts graphMap parameter

### Removed

- Dead renderer functions: `sampleQuadratic()`, `collides()`, `offsetEndpoint()`, `renderArrow()` (142 lines)

### Architecture

MoleculeGraph ownership model:

```text
compile.js          → constructs MoleculeGraph instances (sole owner)
    ↓ graphMap
semantic-engine.js  → consumes graphMap (read-only topology queries)
product-engine.js   → consumes graphMap (read-only topology queries)
render.js           → no graph knowledge (uses moleculeRegistry for layout coords)
parse.js            → no graph knowledge (produces pure AST)
```

Key invariants:
- Graphs are constructed once per unique molecule per step (Map deduplication)
- Engines never construct or mutate graphs
- Renderer remains topology-blind — accesses registry directly for coordinates
- Parser remains chemistry-blind — produces structural AST only

---

## [0.16.0] - 2026-06-21

### Changed

- Extracted CLI entrypoint into `src/cli.js` — render.js is now a pure importable module
- Introduced `compile.js` pipeline orchestrator — semantic validation, arrow inference, and product inference are orchestrated before rendering
- Eliminated `LABEL_BOXES` global mutable state from renderer (passed as parameter instead)
- `render.js` no longer imports semantic-engine or product-engine — receives pre-compiled mechanism data

### Architecture

Pipeline is now:

```text
.mech source
    ↓
  cli.js          → orchestrates I/O
    ↓
  parse.js        → AST
    ↓
  compile.js      → semantic validation + arrow inference + product inference
    ↓
  render.js       → SVG string (pure function, no I/O)
    ↓
  out/*.svg
```

---

## [0.15.0] - 2026-05-20

### Added

- Heuristic product inference engine
- Inferred product rendering
- SN2 reaction synthesis
- Curved-arrow inference
- Leaving-group arrow rendering
- Product placement system
- Semantic transform validation
- Reaction-state synthesis groundwork
- Graph-based semantic mutation groundwork

### Improved

- Arrow routing geometry
- Bond midpoint anchor handling
- SVG mechanism rendering
- Separation between semantic inference and rendering

### Fixed

- Leaving-group arrow overlap
- Curved arrow hook artifacts
- Arrow-anchor collisions
- Inferred product layout clashes

---

## [0.14.0] - 2026-05-18

Codename: From Intent to Flow

### Overview

v0.14 introduces semantic transform operations to MechLang.

Mechanisms can now describe chemical state changes directly through declarative bond operations such as:

```mech
transform {
  form C-CN
  break C-Br
}
```

Instead of manually specifying curved-arrow geometry, MechLang can now infer electron-flow arrows automatically from semantic transforms.

This marks the beginning of MechLang's transition from a rendering-oriented DSL into a chemistry semantics engine.

### Added

#### Semantic transform blocks

New DSL syntax:

```mech
transform {
  form A-B
  break C-D
}
```

Supported operations:

* `form`
* `break`

Transforms are parsed into structured AST operations independent from rendering.

#### Automatic curved-arrow inference

The semantic engine now infers curved-arrow electron flow directly from transform operations.

Current supported inference patterns:

* SN2 nucleophilic attack
* Leaving-group departure

Example:

```mech
transform {
  form C-CN
  break C-Br
}
```

automatically generates:

* nucleophilic attack arrow
* leaving-group electron departure arrow

without explicit `arrow()` declarations.

#### Semantic diagnostics

Compiler-style warnings added for invalid transform semantics.

Examples:

* missing required nucleophile
* breaking nonexistent bonds

Warnings never crash rendering. SVG output is still produced.

#### semantic-engine.js

Chemistry reasoning logic extracted from `render.js` into a dedicated semantic engine layer.

Architecture now cleanly separates:

* parsing
* semantic reasoning
* rendering

Pipeline:

```text
.mech
  ↓
parse.js
  ↓
semantic-engine.js
  ↓
render.js
  ↓
SVG
```

#### Regression tests

Added initial semantic-engine regression tests:

* transform inference
* unsupported transforms
* invalid semantic warnings

Introduced root-level `tests/` structure.

### Design Decisions

Transforms are currently heuristic and deterministic rather than graph-rewrite based.

This release intentionally avoids full molecular graph mutation in favor of:

* predictable behavior
* stable semantics
* architecture-first iteration

The semantic engine is designed to evolve independently from the renderer.

### Compatibility

All existing `.mech` files remain compatible.

Manual `arrow()` blocks continue to work unchanged.

Transform inference acts as a fallback when explicit arrows are absent.

### Verified

```bash
node src/cli.js examples/transform_test.mech
node src/cli.js examples/transform_warning_test.mech
node tests/semantic-engine.test.js
```
