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

## Phase 4 — Semantic Engine (v0.14) ✅ Completed

### S.1 — Semantic Transform Blocks ✅
- `transform {}` syntax
- `form A-B`
- `break A-B`
- AST-level transform representation

### S.2 — Automatic Arrow Inference ✅
- Semantic transforms infer curved-arrow electron flow
- Explicit `arrow()` blocks remain supported
- Deterministic heuristic inference layer

### S.3 — Semantic Diagnostics ✅
- Compiler-style semantic warnings
- Missing nucleophile detection
- Missing bond detection
- Graceful degradation without render failure

### S.4 — Semantic Engine Extraction ✅
- `semantic-engine.js`
- Chemistry reasoning separated from renderer
- Compiler-style layered pipeline

---

## Phase 5 — Product Inference (v0.15) ✅ Completed

### P.1 — Heuristic Product Synthesis ✅
- Infer reaction products from transform operations
- Initial deterministic substitution patterns
- No graph rewriting yet

### P.2 — Product Rendering ✅
- Render inferred products automatically
- Optional explicit override support

### P.3 — Reaction-State Engine Groundwork ✅
- Foundation for future graph-based chemistry mutation
- Intermediate-state synthesis groundwork
- Semantic reaction-state transitions groundwork

---

## Phase 5.5 — MoleculeGraph (v0.17) ✅ Completed

### G.1 — MoleculeGraph Core ✅
- `MoleculeGraph` class with read-only topology abstraction
- `fromRegistry()` factory constructs from molecule registry
- Properties: `name`, `atoms`, `bonds`, `charge`

### G.2 — Read-Only Query API ✅
- `getAtom()`, `neighbors()`, `hasBond()`, `getBond()`
- `bondOrder()`, `atomCount()`, `bondCount()`
- Comprehensive test suite (19 assertions)

### G.3 — Semantic Engine Migration ✅
- `validateTransforms()` and `inferArrowsFromTransforms()` consume `graphMap`
- Bond validation via `hasBond()` instead of direct registry traversal
- Nucleophile detection via `charge` + `name` queries

### G.4 — Product Engine Migration ✅
- Species classification via graph topology (`hasBond()`, `getAtom()`, `atomCount()`, `charge`)
- Eliminated direct registry key-matching patterns
- Data-driven SN2 rules operate on graph queries

### G.5 — Compile Ownership ✅
- `compile.js` is sole owner of MoleculeGraph construction
- Builds `graphMap` per step (one graph per unique molecule, Map-deduplicated)
- Engines receive graphMap as read-only dependency

### G.6 — Renderer Cleanup ✅
- Removed dead code: `sampleQuadratic`, `collides`, `offsetEndpoint`, `renderArrow`
- Renderer confirmed topology-blind — no graph knowledge

---

## Phase 6 — Reaction-State Construction (next)

### R.1 — Reaction-State Representation
- Structured before/transition/after states
- Partial bond and intermediate support

### R.2 — Multi-Step State Propagation
- Persisting state through several steps
- Intermediate products carried forward explicitly

### R.3 — Resonance and State Propagation
- Multiple valid states
- Transition-aware rendering

---

## Phase 7 — Public Launch (v1.0)

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
