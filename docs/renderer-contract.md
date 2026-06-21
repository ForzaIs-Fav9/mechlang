# MechLang Renderer Contract

This document defines the formal contract between `parse.js`, `molecules.js`,
`semantic-engine.js`, `product-engine.js`, and `render.js`. Any change to these
interfaces must be reflected here.

---

## AST Contract (parse.js → semantic-engine.js → product-engine.js → render.js)

`parse.js` exports one function:
```js
export function parseMechlang(source: string): AST
```

### AST Shape
```js
{
  steps: Step[]
}

Step {
  species:     { [role: string]: string }   // role → molecule registry key (fully resolved, including persisted)
  arrows:      Arrow[]
  transforms:  Transform[]
  persist:     string[]                     // raw alias list — informational only, already resolved into species
}

Arrow {
  curved: boolean
  from:   string    // "role" or "role.atomLabel" or "role.A-B"
  to:     string    // same format
}

Transform {
  type: "form" | "break"
  bond: [string, string]
}
```

### Parser Guarantees
- Never throws — emits `console.warn` and skips malformed input
- Returns `{ steps: [] }` for empty or invalid input
- `species` values are raw strings — registry resolution is the renderer's job
- Arrow `from`/`to` are raw strings — dot notation parsing is the renderer's job
- After the persistence post-pass, `species` on each step is fully resolved —
  persisted aliases are already merged in, renderer sees no difference
- `persist` array on each step is informational — renderer does not need to read it

---

## Molecule Registry Contract (molecules.js → render.js)

`molecules.js` exports one object:
```js
export const moleculeRegistry: { [key: string]: Molecule }
```

### Molecule Shape
```js
Molecule {
  atoms:   { [atomKey: string]: { x: number, y: number } }
  bonds:   [string, string, number?][]   // [atomA, atomB, order=1]
  charge:  number                        // integer, negative = anion
  labels?: { [atomKey: string]: string } // display override for aliased atoms
}
```

### Registry Guarantees
- All `x`, `y` values are relative offsets from molecule origin
- Bond order defaults to 1 when third element is absent
- `labels` is optional — renderer falls back to atom key if absent
- Charge 0 produces no charge annotation in the SVG

---

## Semantic Engine Contract (semantic-engine.js)

`semantic-engine.js` exports:
```js
export function validateTransforms(step): void
export function inferArrowsFromTransforms(step): Arrow[]
```

### Semantic Guarantees
- `validateTransforms()` emits warnings only; it never throws
- `inferArrowsFromTransforms()` returns deterministic inferred arrow descriptors
- Inferred arrows may be combined with explicit arrows in the renderer
- Semantic inference never mutates SVG or layout state

---

## Product Engine Contract (product-engine.js)

`product-engine.js` exports:
```js
export function inferProducts(step): {
  inferred: boolean,
  mechanism: string | null,
  products: string[],
  diagnostics: Array<{ type: string, message: string }>
}
```

### Product Guarantees
- `inferProducts()` is deterministic
- It performs heuristic product synthesis only
- It never mutates renderer state
- It never emits SVG
- It never rewrites molecular graphs
- It returns product molecule keys ready to be merged into a renderable step

---

## Compile Contract (compile.js)

`compile.js` exports one function:
```js
export function compile(ast): CompiledMechanism
```

### Compiled Mechanism Shape
```js
{
  steps: CompiledStep[]
}

CompiledStep {
  species:          { [alias: string]: string }   // includes inferred products as inferred_0, inferred_1, ...
  originalSpecies:  { [alias: string]: string }   // original species without inferred products
  arrows:           Arrow[]                       // explicit or inferred
  transforms:       Transform[]
  mechanism:        string | null                 // e.g. "SN2" if inferred
  diagnostics:      Array<{ type: string, message: string }>
}
```

### Compile Guarantees
- Deterministic output for identical AST input
- Calls `validateTransforms()` — emits warnings only, never throws
- Infers arrows from transforms when `step.arrows` is empty
- Infers products and merges into species as `inferred_0`, `inferred_1`, ...
- Never performs I/O or generates SVG
- Never mutates the input AST

---

## Renderer Contract (render.js)

`render.js` exports a pure function — it performs no I/O and has no side effects.
CLI orchestration (file reading, writing, directory creation) lives in `src/cli.js`.

```js
export function render(mechanism, horizontal): string
```

### Invocation (via CLI)
```bash
node src/cli.js <file.mech> [--layout=horizontal]
```

### Output (managed by cli.js)
- Writes SVG to `out/<filename>.svg`
- With `--layout=horizontal`: `out/<filename>.horizontal.svg`
- Creates `out/` directory if absent
- Logs `Rendered → out/<filename>.svg` on success

---

### Rendering Guarantees

**Arrow direction:**
- `from` ref → SVG path origin (`M x1 y1`)
- `to` ref → SVG path terminus (arrowhead via `marker-end`)
- Direction is never altered by geometry

**Arrow position resolution:**
- `from` role on bond ref (`role.A-B`) → bond midpoint between A and B
- `to` role on bond ref (`role.A-B`) → primary atom A
- The renderer may apply a local routing adjustment for inferred leaving-group arrows to keep the SVG readable, but it must not invert arrow direction

**Atom label rendering:**
- White `<rect>` background precedes every `<text>` label
- Label text uses `mol.labels[key]` if present, else `key`
- Font: `sans-serif`, size `14px`, `text-anchor="middle"`, `dominant-baseline="middle"`

**Charge rendering:**
- Offset `+10px` x, `-12px` y from first atom position
- Font size `11px`
- Symbols: `+`, `−`, `2+`, `2−`, etc.

**Bond rendering:**
- Single bond: one `<line>` from atom A to atom B
- Double bond: two `<line>` elements offset ±3px perpendicular to bond axis

**Canvas sizing:**
- Width and height computed from max atom position + `PADDING * 2`
- Dynamic in both layout modes

### Semantic Boundary

`render.js` performs no chemistry reasoning.

The renderer consumes:
- explicit arrows from the AST
- inferred arrows generated by `semantic-engine.js`
- inferred products generated by `product-engine.js`

All transform interpretation, arrow inference, and product synthesis occur before rendering.

---

### Lane Map and Position Computation

`buildLaneMap(ast)` assigns each unique molecule key a global lane index
by order of first appearance across all steps. Used only for ordering.

`computePositions(ast, horizontal, laneMap)` computes per-step positions
using local re-indexing:
- Persistent aliases sorted first by global lane order
- New aliases packed consecutively after persistent ones
- Local index `0,1,2,...` assigned to sorted order within each step
- Inferred products are assigned positions as renderable species
- Eliminates gap accumulation from global lane indices

---

### Dot Notation Resolution

| Input | `from` role resolves to | `to` role resolves to |
|---|---|---|
| `role.A-B` | Bond midpoint between A and B | Atom A |
| `role.atomLabel` | Atom at `atomLabel` | Atom at `atomLabel` |
| `role` (no dot) | First atom in molecule | First atom in molecule |

---

### Fallback Behavior

| Condition | Behavior |
|---|---|
| Unknown molecule key | Red `[role?]` label at molecule position |
| Unknown atom label | Falls back to first atom in molecule |
| Missing `from` or `to` | Arrow skipped, `console.warn` emitted |
| Missing step position | Arrow skipped silently |
| `persist` alias not in previous step | Skipped, `console.warn` emitted |
| `persist` alias already in `species` | Skipped, `console.warn` emitted |
