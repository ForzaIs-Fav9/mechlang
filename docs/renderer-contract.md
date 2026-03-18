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
  species: { [role: string]: string }   // role → molecule registry key
  arrows:  Arrow[]
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

### Dot Notation Resolution

| Input | Resolves to |
|---|---|
| `role.atomLabel` | `{ alias: role, atomLabel: atomLabel }` |
| `role.A-B` | `{ alias: role, atomLabel: "A" }` |
| `role` (no dot) | `{ alias: role, atomLabel: null }` → first atom fallback |

---

### Fallback Behavior

| Condition | Behavior |
|---|---|
| Unknown molecule key | Red `[role?]` label at molecule position |
| Unknown atom label | Falls back to first atom in molecule |
| Missing `from` or `to` | Arrow skipped, `console.warn` emitted |
| Missing step position | Arrow skipped silently |
