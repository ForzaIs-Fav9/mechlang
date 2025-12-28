# Design Decisions

This document outlines the key design decisions behind mechlang and the reasoning for its current scope and architecture.

The goal of mechlang is not to be a complete chemistry drawing tool, but to explore how organic reaction mechanisms can be represented semantically as structured data.

---

## Why a text-based language?

mechlang represents reaction mechanisms using text rather than direct graphical manipulation.

This choice was made to:
- preserve chemical meaning independent of visual layout
- enable version control and reproducibility
- allow mechanisms to be parsed, analyzed, and transformed programmatically

Textual representations make the underlying semantics explicit, whereas drawings encode meaning implicitly in geometry.

---

## Why a compiler-style pipeline?

mechlang is structured as a pipeline:

.me ch → parser → AST → renderer → SVG

This separation allows:
- parsing to focus purely on meaning
- rendering to focus purely on presentation
- future extensions (e.g. different renderers or analyses) without changing the language

This mirrors the architecture of compilers and interpreters in other domains.

---

## Why an explicit AST?

The abstract syntax tree (AST) serves as the single source of truth inside mechlang.

All rendering decisions are derived from the AST, not from hardcoded values.

This ensures:
- changes in the source language propagate automatically
- semantics are preserved independently of output format
- the system remains extensible

---

## Why approximate geometry?

The current renderer uses simple heuristic mappings from semantic intent (e.g. electron movement from a nucleophile to a carbon) to approximate visual positions.

Precise molecular geometry is intentionally deferred.

This decision prioritizes:
- correctness of meaning over visual accuracy
- clarity of architecture
- reduced complexity at early stages

Improving geometry can be done later without altering the core language.

---

## Why limited chemical validation?

mechlang does not currently attempt to validate chemical correctness.

This is intentional:
- validation requires detailed molecular models
- early validation risks coupling semantics to implementation details
- the focus of the project is representation, not verification

Validation can be layered on top of the existing architecture in the future.

---

## Why stop at single-step mechanisms?

Initial support is limited to single-step reactions to keep the language and renderer simple.

This allows:
- faster iteration
- clearer semantics
- a stable foundation for extension

Multi-step mechanisms are a natural future extension once the core model is solid.

---

## Summary

mechlang prioritizes:
- semantic clarity
- architectural simplicity
- extensibility over completeness

Each limitation is a deliberate design choice rather than an omission.
