# MechLang Execution Roadmap

This document records the locked execution plan for mechlang.

It exists to prevent scope drift and architectural regression.

## North Star

A student should be able to write organic reaction mechanisms as easily as LaTeX and obtain correct, scalable diagrams without thinking about geometry.

## Phase 0 — Foundations (Completed)

- DSL parsing
- AST construction
- Molecule-level layout
- Honest curved arrows
- SVG output
- CLI execution

## Phase 1 — Structural Intelligence (Completed)

- Atom awareness
- Atom-based arrow anchors
- Semantic / visual separation
- Arrow normalization
- Stability and fallback behavior

## Phase 2 — Chemistry Drawing (Active)

### D.1 — Bond Rendering
- Single bonds only
- Straight lines
- Template-driven
- No angles, no inference

### D.2 — Atom Labels
- Atom symbols replace molecule text
- Molecule labels retained as fallback
- Charges added later

### D.3 — Arrow-to-Bond Intelligence
- Arrow endpoints snap to bonds where appropriate

### D.4 — Multiple Arrows
- Multi-step mechanisms
- Independent arrow objects

### D.5 — Charges
- Visual-only annotations
- Superscripted symbols

## Phase 3 — Usability

- Shorthand syntax
- Smarter defaults
- Teaching-oriented error messages
- Documentation polish

## Phase 4 — Advanced Features

- Rings
- Multiple bond types
- Resonance
- Stereochemistry
- Export formats
- Editor tooling

This roadmap is authoritative and intentionally conservative.
