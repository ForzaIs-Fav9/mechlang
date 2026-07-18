# MechLang Architecture

This document describes the structural design of MechLang and the
responsibilities of each component in the pipeline.

---

## Pipeline Overview
```text
.mech source file
      ↓
  cli.js          → file I/O, argument parsing
      ↓
  parse.js        → AST (with persistence post-pass)
      ↓
  compile.js      → constructs per-step graphMap (MoleculeGraph instances)
      ↓               orchestrates semantic validation + arrow inference + product inference
      ↓               (passes graphMap to semantic-engine.js and product-engine.js)
  render.js       → SVG string (pure function, no I/O)
      ↓
  out/*.svg       → browser / export
```

The pipeline is strictly layered.

- `cli.js` handles I/O and wires the pipeline
- `parse.js` handles syntax only
- `compile.js` constructs MoleculeGraph instances per step, orchestrates chemistry reasoning (passes graphMap to semantic-engine and product-engine)
- `molecule-graph.js` provides structural topology queries (atoms, bonds, charge) — read-only, no coordinates
- `semantic-engine.js` validates transforms and infers arrows (receives graphMap from compile)
- `product-engine.js` performs heuristic product synthesis (receives graphMap from compile)
- `render.js` handles visualization only — uses molecules.js coordinates, never imports molecule-graph

No component reaches backward across layers.

---

## Components

### `src/parse.js`

Reads a `.mech` source string and produces an AST of the form:
```js
{
  steps: [
    {
      species: { role: "MoleculeKey", ... },
      arrows:  [ { curved: true, from: "role.atom", to: "role.atom" }, ... ],
      transforms: [ { type: "form" | "break", bond: ["A", "B"] }, ... ],
      persist: [ "role", ... ]
    }
  ]
}
```

Responsibilities:
- Tokenize and structure `.mech` source
- Parse `persist:` blocks and store raw aliases on each step
- Run a post-pass after all steps are parsed — resolve persisted aliases
  against the previous step's species map and merge into current step
- Emit `console.warn` on malformed input — never throw
- Produce no visual or geometric information
- Perform no chemistry validation

### `src/molecules.js`

A static registry of molecule definitions keyed by canonical name.
```js
export const moleculeRegistry = {
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } },
    bonds: [["C", "Br"]],
    charge: 0
  },
  ...
}
```

Each molecule entry contains:
- `atoms` — keyed by atom symbol (or alias like `Ca`, `Cb`), each with relative `{x, y}`
- `bonds` — array of `[atomA, atomB]` for single or `[atomA, atomB, 2]` for double bonds
- `charge` — integer (-1, 0, 1)
- `labels` (optional) — display name overrides for aliased atoms (`Ca → "C"`)

Coordinates are heuristic and template-driven. No chemistry inference.

### `src/molecule-graph.js`

Provides a read-only structural graph abstraction over molecules in the registry.

A `MoleculeGraph` encapsulates:
- atoms (id, element)
- bonds (from, to, order)
- net molecular charge

Query methods: `getAtom`, `neighbors`, `hasBond`, `getBond`, `bondOrder`, `atomCount`, `bondCount`.

Factory: `MoleculeGraph.fromRegistry(name)` constructs a graph from a `molecules.js` entry.

MoleculeGraph stores topology only — no coordinates. The renderer never imports this module.

### `src/semantic-engine.js`

Receives a step and a `graphMap` (Map of molecule key → MoleculeGraph) from compile.js.
Performs chemistry-semantic reasoning using graph topology.

Responsibilities:
- Infer curved-arrow electron flow from transform semantics
- Validate semantic transform consistency
- Emit compiler-style warnings for invalid semantic operations
- Remain independent from SVG rendering
- Never construct MoleculeGraph instances (receives them via graphMap)

Current supported inference patterns:
- SN2 nucleophilic attack
- Leaving-group departure

The semantic engine is deterministic and heuristic-driven.
It is intentionally not yet a full graph-rewrite chemistry system.

### `src/product-engine.js`

Receives a step and a `graphMap` (Map of molecule key → MoleculeGraph) from compile.js.
Uses graph topology (neighbors, getAtom) for species classification.

Responsibilities:
- Infer heuristic substitution products from transform operations
- Classify species roles (nucleophile, electrophile, leaving group) via structural queries
- Synthesize product molecule keys
- Remain independent from rendering
- Never construct MoleculeGraph instances (receives them via graphMap)

Current supported inference patterns:
- SN2 product synthesis
- leaving-group emission

The product engine is deterministic and heuristic-driven.
It is intentionally not yet a full graph-rewrite chemistry system.

### `src/compile.js`

Owns MoleculeGraph construction and lifetime. Constructs a per-step `graphMap`
(`Map<string, MoleculeGraph>`) from the step's species, then passes it to both engines.

Consumes the raw AST from `parse.js` and produces a compiled mechanism
with fully resolved species, arrows, and products ready for rendering.

Responsibilities:
- Construct `graphMap` for each step (unknown molecules are silently skipped — graceful degradation)
- Run `validateTransforms(step, graphMap)` on each step
- Infer arrows from transforms when no explicit arrows exist
- Infer products and merge them into the species map
- Produce a compiled representation consumed by `render.js`

The compile step never renders SVG or performs I/O.

### `src/render.js`

Consumes compiled mechanism data. Produces a complete SVG string.
Exported as `render(mechanism, horizontal)` — a pure function with no I/O.
The renderer is fully blind to persistence mechanics — it sees only a
fully resolved species map per step.

Responsibilities:
- Resolve role aliases to molecule registry keys
- Build a global lane map for species ordering
- Compute per-step compact positions using local re-indexing
- Render molecule bonds and atom labels
- Render inferred products
- Render mechanism arrows with bond midpoint resolution
- Compute dynamic canvas dimensions

---

## `.mech` Syntax
```
step {
  persist: role1, role2
  species:
    role = MoleculeKey
  arrow(
    curved,
    from = role.atomLabel,
    to   = role.atomLabel
  )
}
```

- One `step {}` block per mechanism step
- `persist:` carries named roles forward from the previous step (comma-separated)
- `species:` maps role names to molecule registry keys
- `arrow()` targets use dot notation: `role.atomLabel`
- Bond midpoints: `role.A-B` — `from` resolves to bond midpoint, `to` resolves to atom A
- Multiple arrows per step supported

---

## Layout Modes

### Vertical (default)
- Steps arranged top-to-bottom
- Molecules spread left-to-right within each step row
- Canvas height scales with step count

### Horizontal (`--layout=horizontal`)
- Steps arranged left-to-right
- Molecules stack top-to-bottom within each step column
- Canvas width scales with step count

---

## Species Persistence (v0.12)

Molecules may be carried across steps using `persist:`:
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

The post-pass in `parse.js` resolves `nuc` from step 1's species map
and injects it into step 2's species map before render. The renderer
sees a complete, self-contained species map per step — no hidden state.

---

## Arrow Direction Contract

Arrow direction is **always derived from the AST**, never from geometry.

- `from` atom coords → SVG path start (`M x1 y1`)
- `to` atom coords → SVG path end (where `marker-end` lands)
- Bowing direction (upward vs leftward) is geometry-based
- Start and end points are **never swapped** for any reason

---

## Key Constants (`render.js`)

| Constant | Value | Purpose |
|---|---|---|
| `STEP_Y_GAP` | 240 | Vertical distance between steps |
| `STEP_X_GAP` | 260 | Horizontal distance between steps |
| `MOLECULE_X_GAP` | 180 | Horizontal distance between molecules |
| `MOLECULE_Y_GAP` | 100 | Vertical distance between molecules |
| `STEP_Y_ORIGIN` | 140 | Y start position of first step |
| `STEP_X_ORIGIN` | 120 | X start position of first step |
| `PADDING` | 80 | Canvas edge padding |

---

## Output

- Default: `out/<filename>.svg`
- Horizontal: `out/<filename>.horizontal.svg`
- Directory created automatically if absent
