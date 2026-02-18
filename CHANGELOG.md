# Changelog

All notable changes to MechLang are documented in this file.

This project follows a release-based changelog.  
Internal commits may not be individually listed.

---

[v0.8] — Step-Aware Rendering & Strict Semantics  
Released: 2026-01-XX

Added
- Explicit `step {}`-based mechanism structure.
- Step-scoped species definitions.
- Role-based arrow targeting (`role.atom`, `role.bond`).
- Deterministic vertical step layout.
- Strict arrow resolution confined to step scope.
- Formalized contribution workflow (CONTRIBUTING.md).

Changed
- Arrow resolution is no longer global.
- Renderer enforces step-local semantic universe.
- Parser recognizes step blocks as first-class constructs.

Fixed
- Prevented undefined arrow target crashes.
- Removed implicit anchor guessing.

Notes
This release establishes MechLang as a multi-step semantic mechanism language.
Geometry remains heuristic by design.

---

[v0.7] — Step Blocks & Scoped Arrows  
Released: 2026-01-14

Added
- `step {}` DSL syntax.
- Role-based species assignment inside steps.
- Multi-step mechanism rendering.
- Multiple arrows per step.

Changed
- Arrow targets must reference `role.selector` format.
- Removed molecule-level anchor fallback behavior.

Notes
This release marked the transition from single-step diagrams
to structured, step-aware mechanism semantics.

---

[v0.6] — Multi-Arrow Layout  
Released: 2026-01-13

Added
- Support for rendering multiple curved arrows in a single mechanism.
- Deterministic vertical stacking of arrows to prevent overlap.
- Stable arrow geometry independent of molecule count.

Notes
- No changes to the MechLang language syntax.
- No chemistry validation was added.
- Arrow layout is handled entirely at the rendering layer.

---

[v0.5] — Atom-Level Diagrams  
Released: 2026-01-13

Added
- Atom-level rendering (C, O, N, Br, H).
- Explicit single-bond drawing between atoms.
- Curved arrows snap to atom positions or bond midpoints.
- Molecule labels disabled by default.

Notes
- Geometry remains heuristic by design.
- This release established the foundation for multi-step mechanisms.

---

[v0.4] — Bond Rendering Groundwork  
Released: 2026-01-12

Added
- Template-based bond rendering.
- Internal atom templates for simple molecules.
- Improved arrow anchoring stability.

Notes
- Molecules were still rendered primarily as text labels.
- This release prepared the renderer for atom-level diagrams.

---

[v0.3] — Honest Curved Arrows  
Released: 2026-01-11

Added
- Semantic curved-arrow rendering.
- Arrow anchors resolve to chemically meaningful targets.
- Deterministic arrow curvature with left-to-right bias.

---

[v0.2] — Initial Renderer Prototype  

Added
- Molecule-level layout.
- SVG output pipeline.
- Single-arrow support.

---

[v0.1] — Initial Prototype  

Added
- MechLang DSL parser.
- Abstract syntax tree (AST).
- Proof-of-concept rendering.
