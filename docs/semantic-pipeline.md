# MechLang Semantic Pipeline

This document defines the semantic execution pipeline of MechLang.

Its purpose is to preserve architectural boundaries as the language evolves from:
- mechanism rendering
into:
- semantic chemistry computation.

---

# Core Philosophy

MechLang separates:
- semantic meaning
from:
- visual rendering.

The renderer must never own chemistry reasoning.

Semantic layers must remain deterministic, testable, and independent from SVG generation.

---

# Execution Pipeline

```text
.mech source
    ↓
cli.js              → I/O orchestration
    ↓
parse.js            → AST (no chemistry, no graph knowledge)
    ↓
compile.js          → constructs MoleculeGraph, orchestrates semantic layers:
    │                  builds graphMap (one graph per unique molecule per step)
    ├── semantic-engine.js  → validation + arrow inference (consumes graphMap)
    └── product-engine.js   → product synthesis (consumes graphMap)
    ↓
render.js           → SVG (pure function, no I/O, no graph knowledge)
    ↓
out/*.svg
```

---

# Layer Responsibilities

## parse.js

Responsible for:
- tokenization
- syntax parsing
- AST generation

Must NOT:
- infer chemistry
- render SVG
- mutate reaction state

Output:
- structured AST

---

## semantic-engine.js

Consumes `graphMap` from `compile.js`.

Responsible for:
- semantic transform validation via graph topology queries (`hasBond()`, `charge`)
- arrow inference from transform semantics
- semantic diagnostics

Examples:
- missing nucleophile warnings (detected via graph charge query)
- invalid bond break warnings (detected via `hasBond()`)
- inferred curved arrows (resolved via graph topology)

Must NOT:
- render SVG
- synthesize products
- construct MoleculeGraph instances

Output:
- semantic annotations
- inferred arrows
- diagnostics

---

## product-engine.js

Consumes `graphMap` from `compile.js`.

Responsible for:
- species classification via graph topology (`hasBond()`, `charge`, `atomCount()`, `getAtom()`)
- inferred product synthesis
- reaction-state output generation
- deterministic heuristic chemistry inference

Examples:
- SN2 substitution products (substrate detected via C-halide bond topology)
- leaving-group generation (halide identified via graph structure)

Must remain:
- deterministic
- architecture-first
- independent from rendering

Must NOT:
- generate SVG
- mutate renderer state
- construct MoleculeGraph instances

Output:
- inferred product molecule keys

---

## render.js

Responsible for:
- SVG generation
- layout
- geometry
- visualization

Renderer consumes:
- AST
- semantic annotations
- inferred products

Renderer must remain visualization-only.

Renderer must NOT:
- infer chemistry
- validate transforms
- synthesize products

---

# Architectural Rules

## Semantic reasoning must remain outside rendering

Never place chemistry inference inside:

```text
render.js
```

---

## Product inference must remain independent

Do not merge:
- semantic validation
and:
- product synthesis

into the same module.

---

## Determinism over complexity

MechLang currently prioritizes:
- deterministic outputs
- architectural clarity
- semantic stability

over:
- full chemistry simulation.

MoleculeGraph provides read-only topology queries. Full graph rewriting and molecular mutation are intentionally deferred until semantic boundaries stabilize further.

---

# Long-Term Direction

Planned future evolution:

```text
semantic transforms
    ↓
reaction-state synthesis
    ↓
graph mutation
    ↓
intermediate-state transitions
    ↓
semantic chemistry computation
```

This progression is intentional and incremental.

Architecture stability currently matters more than chemistry complexity.
