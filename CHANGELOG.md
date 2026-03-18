# Changelog

All notable changes to MechLang are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
