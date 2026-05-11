# Changelog

All notable changes to MechLang are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---
# Changelog

All notable changes to MechLang will be documented in this file.

---

# v0.13.0 — Curved Arrow Rendering

Released: 2026-05-11  
Codename: Electron Flow

---

## Added

### Curved Mechanism Arrows
- Quadratic Bézier curved-arrow rendering
- Dynamic curvature selection based on dominant reaction axis
- Stable curved-arrow routing across vertical and horizontal layouts

### SVG Arrowheads
- SVG marker-based arrowheads via `marker-end`
- Endpoint offsetting to reduce overlap with atom labels
- Improved visual readability for electron flow direction

### Collision-Aware Arrow Routing
- Curved-arrow collision detection against atom-label bounding boxes
- Multiple routing attempts before fallback geometry
- Reduced label overlap in dense mechanisms

### Horizontal Output Separation
- `--layout=horizontal` now outputs:
  ```text
  out/<filename>.horizontal.svg
  ```
- Vertical and horizontal renders can coexist without overwrite

### Renderer Stabilization
- Deterministic curved-arrow geometry system
- Stable arrow routing independent of rendering order
- Consistent AST-driven arrow direction contract

---

## Improved

### Double Bond Rendering
- Stable rendering for:
  - `C=C`
  - `C=O`
- Preserved during curved-arrow integration
- Alias-label compatibility maintained (`Ca`, `Cb` → `C`)

### Multi-Step Mechanisms
- Cleaner persistent-species layout behavior
- Improved horizontal step rendering
- Compact lane packing

### Atom Labels
- Reduced overlap with curved arrows
- Cleaner SVG readability

---

## Fixed

### Arrow Direction Instability
Curvature changes no longer flip arrow meaning or direction.

### S-Curve Arrow Regressions
Shared-endpoint artifacts removed from consecutive arrows.

### Double Bond Regression
Restored stable bond-order rendering after renderer rewrite.

### Label Rendering Regressions
Aliased atom labels now render consistently across examples.

### Horizontal Render Overwrite
Horizontal layout output no longer overwrites vertical SVG renders.

---

## Design Decisions

- Arrow direction remains fully semantic and AST-driven
- Geometry may affect curvature, but never chemical meaning
- Species persistence remains parser-scoped
- Renderer receives fully resolved step-local species maps only

---

## Verified Examples

- `sn2.mech`
- `sn2_steps.mech`
- `sn1_steps.mech`
- `sn2_alt.mech`
- `double_bond_test.mech`
- `persistence_test.mech`

Verified in:
- vertical layout
- horizontal layout

---

## Compatibility

All v0.12 `.mech` files remain compatible.

No DSL syntax changes required.

---

## What's Next — v0.14

### Resonance Arrows
Dedicated resonance-arrow rendering (`⟷`) independent from mechanism arrows.

### Renderer Hardening
- snapshot testing
- SVG regression testing
- denser collision handling
- layout refinement

### Mechanism Expansion
- E2 elimination
- carbonyl addition
- resonance delocalization
- stereochemistry foundations

## [0.12.0] — 2026-03-21

### Added
- `persist:` keyword in `.mech` syntax — comma-separated aliases carried forward from previous step
- Species persistence post-pass in `parse.js` — resolves persisted aliases against prior step's species map before render
- Per-step compact lane re-indexing in `render.js` — persistent species sorted first by global lane order, new species packed consecutively
- `buildLaneMap()` in `render.js` — assigns each unique molecule key a global lane index by first appearance
- `persistence_test.mech` — canonical example demonstrating persist: syntax across two steps
- Bond midpoint resolution in `getAtomPos()` — `from` role resolves to bond midpoint, `to` role resolves to primary atom

### Fixed
- S-curve on multi-arrow single-step mechanisms — root cause was consecutive arrows sharing exact pixel endpoints; bond midpoint resolution separates them
- Lane gap accumulation — new molecules in later steps no longer inherit accumulated global lane offsets
- `parseArrowRef()` now returns `atomB` for bond refs like `C-Br`, enabling correct midpoint vs atom resolution
- `sn2.mech` and `sn2_alt.mech` rewritten in current step block syntax — legacy `reaction {}` syntax removed

### Changed
- `computePositions()` now accepts `laneMap` parameter and uses per-step local re-indexing
- `getAtomPos()` now accepts `role` parameter (`'from'` | `'to'`) for semantic position resolution
- `parseArrowRef()` no longer accepts `step` parameter — pure string parsing only

### Notes
- `render.js` is fully blind to persistence mechanics — it sees only a resolved species map
- Step-local semantics fully preserved — persistence is a parser concern, not a renderer concern
- `persist:` aliases not found in previous step emit `console.warn` and are skipped gracefully
- `persist:` aliases already declared in `species:` emit `console.warn` and are skipped gracefully

---

## [0.11.0] — 2026-03-18

### Added
- Double bond rendering for `C=C` and `C=O` via optional bond order field `[atomA, atomB, 2]`
- Perpendicular parallel line offset for double bond pairs
- `labels` map on molecule entries for display name overrides on aliased atoms (e.g. `Ca`/`Cb` → `"C"`)
- New molecules: `CH2=CH2`, `CH3-CH=CH2`, `CH2=O`, `CH3CHO`, `CH3COCH3`, `CH3CO-`
- White `<rect>` background behind every atom label — clears bond lines for readable symbols

### Fixed
- Atom labels previously obscured by bond lines on multi-atom molecules

### Notes
- Bond order defaults to `1` when third array element is absent — fully backward compatible
- Single bond molecules in registry require no changes

---

## [0.10.0] — 2026-03-15

### Added
- `--layout=horizontal` CLI flag for horizontal step layout
- Dynamic canvas sizing for both layout modes

### Fixed
- Arrow direction now strictly preserved from AST — vertical arrows no longer reversed
- Species alias resolution now correctly maps role names to registry keys before lookup
- Atom position lookup corrected for object-keyed atom structure in `molecules.js`
- Dot notation in arrow refs (`nucleophile.C`, `electrophile.C-Br`) correctly parsed

---

## [0.9.0] — 2026-03-08

### Added
- `molecules.js`: standalone registry of 25 organic species across 6 categories
- Charge rendering (superscript −/+) on charged species
- Dynamic SVG canvas height based on step count
- Perpendicular arrow curves with per-index stagger

### Fixed
- Parser silent failures replaced with `console.warn` diagnostics
- Arrow mode no longer bleeds across back-to-back arrow blocks
- `=` split no longer breaks on values containing `=`
- Molecule spacing and charge annotation positioning

### Notes
- `molecules.js` lives in `src/` alongside `parse.js` and `render.js`
- `sn2_steps.mech` is the canonical reference example going forward

---

## [0.8.0] — 2026-03-07

### Added
- `step {}` block support as primary mechanism structure
- Role-scoped species definitions (`role = MoleculeName`)
- Step-local arrow resolution
- Atom-level arrow targeting via `role.atom` and `role.A-B`
- Expanded atom templates for common undergraduate species: CN⁻, CH3–Br, CH3–Cl, CH3–CN, CH3–OH, Br⁻, Cl⁻

### Fixed
- Trailing comma bug in arrow parsing
- Arrow resolution failures due to malformed selectors
- Example files migrated to role-scoped syntax
- Removed debug instrumentation from renderer

### Breaking Changes
- `reaction {}` syntax is no longer supported
- All arrows must be defined inside `step {}` blocks
- Arrow targets must use role-scoped selectors (`role.atom` or `role.bond`)

### Known Limitations at Release
- Vertical layout only (horizontal timeline pending)
- No species persistence across steps
- No charge superscript rendering
- No bond order rendering
- No collision detection for >3 arrows per step

---

## [0.7.0] — 2026-01-26

### Added
- Step-aware, role-scoped arrow resolution
- Scoped arrow targets (`nucleophile.C`, `electrophile.C–Br`)
- Chemically meaningful curved-arrow mechanisms across reaction steps

---

## [0.6.0] — 2026-01-13

### Added
- Multiple curved arrows per mechanism with deterministic layout
- Arrow stacking to avoid visual overlap
- Stable, collision-free arrow curvature and placement

### Notes
- No DSL syntax changes
- Arrow stacking is purely a rendering concern

---

## [0.5.0] — 2026-01-13

### Added
- Atom-level rendering: molecules drawn with explicit atoms and single bonds
- Curved arrows snapping to atom or bond midpoints
- Correct visualization of SN2-style mechanisms

### Changed
- Molecule labels optional and disabled by default

---

## [0.4.0] — 2026-01-13

### Added
- Atom symbols (C, O, N, Br, etc.) rendered directly on diagram
- Bonds connecting between atom labels
- Diagram layering matching chemical conventions

### Changed
- Molecule text labels no longer shown by default

---

## [0.3.0] — 2026-01-04

### Added
- Template-based single bond rendering
- Internal molecule model (atoms + bonds)
- Support for multiple arrows per mechanism
- Graceful handling of unresolved arrow anchors

---

## [0.2.0] — 2025-12-28

### Added
- AST-driven semantic rendering
- Curved-arrow electron flow based on AST semantics
- Molecule labels derived from parsed source
- Multi-file CLI support
- README and architecture documentation
