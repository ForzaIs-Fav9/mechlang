# MechLang Execution Roadmap

This document records the locked execution plan for MechLang.
It exists to prevent scope drift and architectural regression.

---

## North Star

A student should be able to write organic reaction mechanisms as easily
as LaTeX and obtain correct, scalable diagrams without thinking about geometry.

---

## Phase 0 — Foundations ✅ Completed
- DSL parsing
- AST construction
- Molecule-level layout
- Honest curved arrows
- SVG output
- CLI execution

---

## Phase 1 — Structural Intelligence ✅ Completed
- Atom awareness
- Atom-based arrow anchors
- Semantic / visual separation
- Arrow normalization
- Stability and fallback behavior

---

## Phase 2 — Chemistry Drawing ✅ Completed

### D.1 — Bond Rendering ✅
- Single bonds only
- Straight lines
- Template-driven
- No angles, no inference

### D.2 — Atom Labels ✅
- Atom symbols rendered directly
- White background rect punches through bond lines
- Label aliasing for duplicate-atom molecules (Ca/Cb → "C")

### D.3 — Arrow-to-Bond Intelligence ✅
- Arrow endpoints snap to named atoms via dot notation (`role.atom`)
- Bond midpoint targeting via `role.A-B`
- `from` resolves to bond midpoint, `to` resolves to primary atom

### D.4 — Multiple Arrows ✅
- Multi-step mechanisms via `step {}` blocks
- Step-local arrow resolution
- Role-scoped species definitions

### D.5 — Charges ✅
- Visual-only annotations
- Superscripted +/− symbols
- Offset from first atom

### D.6 — Double Bonds ✅
- C=C and C=O rendering via bond order field `[A, B, 2]`
- Perpendicular parallel line offset
- Backward compatible — single bonds unchanged

---

## Phase 3 — Layout & Multi-Step ✅ Completed

### L.1 — Vertical Step Layout ✅
- Deterministic step-per-row positioning
- Dynamic canvas height

### L.2 — Horizontal Step Layout ✅
- `--layout=horizontal` CLI flag
- Steps flow left-to-right
- Dynamic canvas width

### L.3 — Molecule Registry ✅
- 31 molecules across 6 categories
- Standalone `molecules.js`
- Alias resolution: role names → registry keys

---

## Phase 4 — Renderer Intelligence (v0.13-v0.15)

### R.1 — Species Persistence ✅ (v0.12)
- `persist: alias1, alias2` syntax in `.mech` files
- Post-pass in `parse.js` resolves aliases against prior step
- Renderer fully blind to persistence mechanics
- Per-step compact lane re-indexing eliminates gap accumulation

### R.2 — Lane Assignment ✅ (v0.12)
- Global lane map by first appearance
- Per-step local re-indexing: persistent first, novel packed after
- No molecule overlap in multi-step diagrams

### R.3 — Curved Arrow Rendering ✅ (v0.13)
- Quadratic Bézier mechanism arrows
- SVG arrowheads via `marker-end`
- Collision-aware curved-arrow routing
- Endpoint offsetting to avoid atom-label overlap
- Deterministic AST-driven arrow direction
- Stable rendering in vertical and horizontal layouts

### R.4 — Semantic Transform Layer (v0.14)
- `transform {}` block syntax
- Bond formation semantics (`form A-B`)
- Bond breaking semantics (`break A-B`)
- Semantic AST representation independent from rendering
- Foundation for automatic arrow generation

### R.5 — Resonance Arrow (v0.15)
- Dedicated double-headed arrow type (`⟷`)
- Distinct from mechanism arrows
- Parser + renderer support
---

## Phase 5 — Hardening (v0.14)

### H.1 — Formal Grammar
- BNF or PEG grammar document for `.mech` syntax
- AST versioning

### H.2 — Snapshot Tests
- Golden SVG outputs for all 6 canonical mechanisms
- CI regression on every merge

---

## Phase 6 — Public Launch (v1.0)

### Six canonical mechanisms must render correctly:
1. SN2 — single step, 2 arrows, charges
2. SN1 — 2-step, carbocation intermediate, species persistence
3. E2 — 3 concurrent arrows, C=C double bond product
4. Acid-Base — H+ rendering, charge transfer
5. Carbonyl Addition — C=O double bond, alkoxide product
6. Resonance — double-headed arrow, delocalization

### Deliverables:
- CLI packaging (`npm install -g mechlang`)
- Web playground (browser-based `.mech` → SVG)
- Full documentation
- Proper spatial layout engine
- Public announcement

---

## Out of Scope for v1.0
- Rings and aromaticity
- Stereochemistry (wedge/dash bonds)
- Triple bonds
- 3D conformation
- Editor tooling / LSP
- Rust/WASM rewrite (deferred to post-v1.0)
