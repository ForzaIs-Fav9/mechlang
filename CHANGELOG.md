# Changelog

All notable changes to MechLang will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned

* heuristic product inference engine
* inferred product rendering
* reaction-state synthesis groundwork
* graph-based semantic mutation groundwork

---

## v0.14.0 — Semantic Transforms

Released: 2026-05-18
Codename: From Intent to Flow

---

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

---

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

---

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

---

#### Semantic diagnostics

Compiler-style warnings added for invalid transform semantics.

Examples:

* missing required nucleophile
* breaking nonexistent bonds

Warnings never crash rendering. SVG output is still produced.

---

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

---

#### Regression tests

Added initial semantic-engine regression tests:

* transform inference
* unsupported transforms
* invalid semantic warnings

Introduced root-level `tests/` structure.

---

### Design Decisions

Transforms are currently heuristic and deterministic rather than graph-rewrite based.

This release intentionally avoids full molecular graph mutation in favor of:

* predictable behavior
* stable semantics
* architecture-first iteration

The semantic engine is designed to evolve independently from the renderer.

---

### Compatibility

All existing `.mech` files remain compatible.

Manual `arrow()` blocks continue to work unchanged.

Transform inference acts as a fallback when explicit arrows are absent.

---

### Verified

```bash
node src/render.js examples/transform_test.mech
node src/render.js examples/transform_warning_test.mech
node tests/semantic-engine.test.js
```

---

### What's Next — v0.15

Automatic product inference.

Semantic transforms will begin synthesizing inferred chemical products directly from reaction-state operations.

Example goal:

```mech
transform {
  form C-CN
  break C-Br
}
```

→ infer:

```text
CH3-CN + Br-
```

without explicit product declaration.

---

## v0.13.0 — Curved Arrow Rendering

Released: 2026-05-11
Codename: Electron Flow

---

### Added

#### Curved Mechanism Arrows

* Quadratic Bézier curved-arrow rendering
* Dynamic curvature selection based on dominant reaction axis
* Stable curved-arrow routing across vertical and horizontal layouts

#### SVG Arrowheads

* SVG marker-based arrowheads via `marker-end`
* Endpoint offsetting to reduce overlap with atom labels
* Improved visual readability for electron flow direction

#### Collision-Aware Arrow Routing

* Curved-arrow collision detection against atom-label bounding boxes
* Multiple routing attempts before fallback geometry
* Reduced label overlap in dense mechanisms

#### Horizontal Output Separation

* `--layout=horizontal` now outputs:

```text
out/<filename>.horizontal.svg
```

instead of overwriting vertical renders.

---

### Fixed

* Arrow direction inversion bugs
* Multi-arrow overlap instability
* Endpoint collisions with atom labels
* S-curve artifacts in dense SN2 mechanisms

---

### Design Decisions

Curved arrows remain renderer-driven rather than chemically inferred.

This version focused entirely on visual correctness and rendering stability before semantic inference work.

---

## v0.12.0 — Species Persistence

Released: 2026-03-21
Codename: Carried Forward

---

### Added

* `persist:` syntax
* Species persistence post-pass
* Compact lane re-indexing
* Global lane assignment
* persistence_test.mech example

---

### Fixed

* Multi-step layout gaps
* Consecutive arrow endpoint overlap
* Legacy syntax inconsistencies

---

### What's Next

Semantic transform operations.
