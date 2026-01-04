# Renderer Contract

This document defines the guarantees, constraints, and responsibilities of the mechlang renderer.

It serves as a stability contract between the language semantics (AST) and the visual output (SVG).

## Core Guarantee

The renderer must translate chemical *intent* expressed in the AST into a visually meaningful diagram.

Visual accuracy may be approximate.
Semantic accuracy must never be compromised.

## Hard Guarantees

The renderer MUST:

- Never crash on valid mechlang syntax
- Produce an SVG for every parsed input
- Prefer semantic correctness over visual aesthetics
- Remain deterministic for identical inputs

The renderer MUST NOT:

- Require users to specify geometry or coordinates
- Encode reaction-specific logic (e.g. “SN2 rules”)
- Perform chemical validation or correctness checks
- Infer chemistry beyond what is explicitly encoded in the AST

## Fallback Behavior

When information is missing or ambiguous, the renderer must degrade gracefully:

- Missing atom templates → fall back to molecule-level anchors
- Unresolved arrow targets → warn and skip or approximate
- Unsupported features → ignore safely without failure

Under no circumstances should rendering throw an uncaught error due to user input.

## Geometry Policy

- Geometry is heuristic and approximate
- Atom positions are template-driven
- Bonds are visual edges, not chemical objects
- Curved arrows reflect electron flow direction, not physical trajectories

Exact molecular geometry is explicitly out of scope.

## Extensibility Rule

All renderer behavior must be derivable from the AST.

Adding new visual features must not require changes to the language syntax unless absolutely necessary.

## Summary

The renderer exists to visualize meaning, not to simulate chemistry.

If forced to choose:
- Correct meaning beats perfect geometry
- Stability beats sophistication
- Clarity beats completeness
