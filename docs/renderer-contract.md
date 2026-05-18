# MechLang Renderer Contract

This document defines the formal contract between `parse.js`, `molecules.js`,
and `render.js`. Any change to these interfaces must be reflected here.

---

## AST Contract (parse.js → render.js)

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

## Renderer Contract (render.js)

`render.js` is a CLI entry point, not an importable module.

### Invocation
```bash
node src/render.js <file.mech> [--layout=horizontal]
```

### Output
- Writes SVG to `out/<filename>.svg`
- With `--layout=horizontal`: `out/<filename>.horizontal.svg`
- Creates `out/` directory if absent
- Logs `✅  Rendered → out/<filename>.svg` on success

---

### Rendering Guarantees

**Arrow direction:**
- `from` ref → SVG path origin (`M x1 y1`)
- `to` ref → SVG path terminus (arrowhead via `marker-end`)
- Direction is never altered by geometry

**Arrow position resolution:**
- `from` role on bond ref (`role.A-B`) → bond midpoint between A and B
- `to` role on bond ref (`role.A-B`) → primary atom A
- This separation ensures consecutive arrows never share exact pixel endpoints

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

---

### Lane Map and Position Computation

`buildLaneMap(ast)` assigns each unique molecule key a global lane index
by order of first appearance across all steps. Used only for ordering.

`computePositions(ast, horizontal, laneMap)` computes per-step positions
using local re-indexing:
- Persistent aliases sorted first by global lane order
- New aliases packed consecutively after persistent ones
- Local index `0,1,2,...` assigned to sorted order within each step
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
