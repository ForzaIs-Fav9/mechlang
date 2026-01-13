# Contributing to MechLang

Thank you for your interest in contributing to **MechLang**.

MechLang is an experimental, semantics-first language for representing
organic chemistry reaction mechanisms. Contributions are welcome,
but the project has strong architectural constraints by design.

Please read this document before opening an issue or pull request.

---

## Project Philosophy

MechLang prioritizes:

- **Semantic clarity over visual perfection**
- **Simple user-facing syntax**
- **Strict separation of parsing, semantics, and rendering**
- **Extensibility without premature complexity**

Contributions should respect these principles.

---

## What This Project Is (and Is Not)

### MechLang *is*:
- A domain-specific language (DSL)
- A compiler-style pipeline: `.mech → AST → Renderer`
- A semantic representation of reaction mechanisms

### MechLang *is not*:
- A full ChemDraw replacement
- A chemical validation engine
- A geometry-accurate molecular modeling tool

---

## Branching Model

- `main`  
  Stable, releasable code only. Protected branch.

- `feature/<short-name>`  
  New features or capabilities.

- `fix/<short-name>`  
  Bug fixes targeting `main`.

All changes must go through a pull request.

---

## Commit Message Convention

All commits must follow this format:

