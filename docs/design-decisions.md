# MechLang Design Decisions

This document records the *why* behind non-obvious architectural choices.
Each decision is permanent until explicitly revisited and documented here.

---

## 1. Semantic roles over molecule names in `.mech` files

**Decision:** `.mech` files use role names (`nucleophile`, `substrate`)
mapped to registry keys (`CN-`, `CH3-Br`), not molecule names directly.

**Why:** Mechanism diagrams communicate *function*, not identity.
A researcher writing SN2 thinks in terms of nucleophile and electrophile,
not CN- and CH3-Br. Role names make `.mech` files readable as chemistry,
not as data. The registry handles the molecule details.

---

## 2. Coordinates are heuristic, not chemically computed

**Decision:** Atom positions in `molecules.js` are manually specified
relative offsets, not computed from bond lengths or angles.

**Why:** Precise geometry (VSEPR, actual bond lengths) would require a
full cheminformatics engine and would still look bad as SVG at mechanism
scale. Heuristic positions are readable, predictable, and fast.
MechLang is a communication tool, not a molecular visualizer.

---

## 3. Arrow direction is always AST-derived, never geometry-derived

**Decision:** The `from` and `to` coordinates for curved arrows are always
taken directly from the AST. Geometry (dx, dy) only controls bowing
direction — never which end the arrowhead lands on.

**Why:** Geometry-based sorting (e.g. "left atom = start") produces
mechanistically incorrect arrows for vertical paths where the nucleophile
is below the electrophile. Electron flow direction is chemistry, not layout.
The `.mech` file is the source of truth.

---

## 4. Bond order as optional third array element

**Decision:** Bonds are encoded as `[atomA, atomB]` for single bonds
and `[atomA, atomB, 2]` for double bonds.

**Why:** This extends the existing format with zero breaking changes.
Missing third element defaults to 1. No new syntax, no migration needed.
Triple bonds follow naturally as `[atomA, atomB, 3]` when required.

---

## 5. Atom label aliasing via `labels` map

**Decision:** Molecules with duplicate atom symbols (e.g. two carbons)
use internal keys `Ca`, `Cb` for unique addressing, with a separate
`labels` map for display names (`{ Ca: "C", Cb: "C" }`).

**Why:** JavaScript object keys must be unique. `{ C: ..., C: ... }`
silently overwrites. Aliasing preserves unique addressability while
rendering the correct chemical symbol. The renderer checks `mol.labels`
before falling back to the key name.

---

## 6. White rect behind atom labels

**Decision:** Each atom label is preceded by a white rectangle in the SVG.

**Why:** Bond lines draw through atom positions. Without a background,
labels are unreadable where bonds cross them. White rects punch a clean
hole through bond geometry. This is standard practice in chemistry
drawing software (ChemDraw, Marvin, Ketcher all do this).

---

## 7. Parser never throws

**Decision:** `parse.js` emits `console.warn` for all malformed input
and continues. It never throws.

**Why:** A renderer that crashes on bad input is hostile to users learning
the DSL. Graceful degradation (warn + skip) lets partially valid `.mech`
files produce partial output, making errors visible and recoverable.

---

## 8. No npm dependencies

**Decision:** MechLang has zero runtime dependencies. Everything is
vanilla Node.js ESM.

**Why:** The dependency graph being empty is a feature. Researchers and
professors installing a CLI tool should not pull in hundreds of packages.
Trust, security, and install speed all improve at zero dependencies.

---

## 9. One branch per feature, one commit per file

**Decision:** All branches are created on GitHub. Each file change is a
separate commit with a conventional commit message.

**Why:** Clean history makes regression bisection trivial. Conventional
commits enable automated changelog generation at v1.0.
Single-file commits make PR review surgical rather than archaeological.

---

## 10. Rust/WASM rewrite deferred to post-v1.0

**Decision:** The JS/Node.js implementation ships to v1.0. Rust rewrite
is explicitly out of scope until after public launch.

**Why:** Correctness before performance. The render pipeline is not a
bottleneck at mechanism scale. Shipping a working, documented, tested
v1.0 in JS is worth more than an unfinished Rust rewrite.

---

## 11. Persistence is a parser concern, not a renderer concern

**Decision:** Species persistence is resolved entirely in `parse.js`
via a post-pass. `render.js` receives only a fully resolved species map
per step and has no knowledge that persistence exists.

**Why:** The renderer's contract is step-local semantics — it draws
what it's given. Injecting persistence logic into the renderer would
couple layout decisions to carry-forward state, making both harder to
reason about. The parser resolves all cross-step references before
geometry begins. Clean pipeline, clean separation.

---

## 12. Explicit `persist:` over implicit carry-forward

**Decision:** Species that survive across steps must be explicitly
declared with `persist: alias1, alias2` in the receiving step.
Implicit carry-forward (all species live until dropped) was rejected.

**Why:** MechLang's design contract is deterministic and step-local.
Implicit carry creates hidden state — a reader cannot know what's on
canvas without tracing backwards through all prior steps. Explicit
`persist:` keeps every step self-documenting. The overhead is minimal:
one line per step, comma-separated for multiple aliases.

---

## 13. Heuristic product inference is its own semantic layer

**Decision:** Product inference lives in `product-engine.js` and is
consumed by `render.js`, but it does not belong inside rendering itself
or inside the arrow-inference layer.

**Why:** Rendering must stay visual-only. Arrow inference tells the
viewer where electrons move; product inference tells the viewer what
species appear after the transform. Keeping those responsibilities
separate lets reaction-state synthesis evolve independently without
turning the renderer into a chemistry engine. It also keeps the
pipeline testable and deterministic.

---

## 14. MoleculeGraph is read-only and owned by compile.js

**Decision:** `MoleculeGraph` is a read-only graph abstraction.
`compile.js` is the sole production code that constructs instances.
Engines receive a pre-built `graphMap` and use query methods only.

**Why:** Centralizing construction in compile.js provides a single
point of caching (one graph per unique molecule per step) and prevents
engines from coupling to the registry's internal format. Read-only
semantics mean engines cannot accidentally mutate shared state, which
is critical when both semantic-engine and product-engine receive the
same graphMap reference. This also keeps the door open for future
graph mutation — when needed, it will happen in a dedicated layer,
not scattered across consumers.

---

## 15. Renderer accesses moleculeRegistry directly, not MoleculeGraph

**Decision:** `render.js` imports `moleculeRegistry` directly for atom
coordinates. It does not use `MoleculeGraph` at all.

**Why:** The renderer needs layout coordinates (`{x, y}` per atom)
which are heuristic display offsets, not topology. MoleculeGraph
deliberately strips coordinates to maintain a clean topology-only
abstraction. Giving the renderer graph access would blur the boundary
between "what bonds exist" (chemistry) and "where atoms appear on
screen" (geometry). The renderer's job is geometry; the graph's job
is topology. They stay separate.

---
