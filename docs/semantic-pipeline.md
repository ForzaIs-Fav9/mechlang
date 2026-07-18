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
parse.js            → AST
    ↓
compile.js          → constructs per-step graphMap (MoleculeGraph instances)
    │                  orchestrates semantic layers:
    ├── semantic-engine.js  → validation + arrow inference (receives graphMap)
    └── product-engine.js   → product synthesis (receives graphMap)
    ↓
render.js           → SVG (pure function, no I/O; uses molecules.js for coords only)
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

Receives `(step, graphMap)` from compile.js. Uses MoleculeGraph topology for validation.

Responsible for:
- semantic transform validation
- arrow inference
- semantic diagnostics

Examples:
- missing nucleophile warnings
- invalid bond break warnings
- inferred curved arrows

Must NOT:
- render SVG
- synthesize products
- mutate molecular graphs
- construct MoleculeGraph instances

Output:
- semantic annotations
- inferred arrows
- diagnostics

---

## product-engine.js

Receives `(step, graphMap)` from compile.js. Uses MoleculeGraph topology for species classification.

Responsible for:
- inferred product synthesis
- species role classification via structural queries
- reaction-state output generation
- deterministic heuristic chemistry inference

Examples:
- SN2 substitution products
- leaving-group generation

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

Graph rewriting and molecular mutation are intentionally deferred until semantic boundaries stabilize.

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
