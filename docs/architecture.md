# mechlang Architecture

This document describes the internal architecture of mechlang and the design decisions behind its current implementation.

The goal of mechlang is not visual perfection, but semantic clarity: representing organic reaction mechanisms as structured data that can be interpreted programmatically.

---

## High-level architecture

mechlang follows a compiler-style architecture with three main stages:

1. Parsing
2. Intermediate representation (AST)
3. Rendering
.me ch → Parser → AST → Renderer → SVG


Each stage has a single responsibility and is intentionally decoupled from the others.

---

## Parser design

The parser reads a `.mech` file as plain text and converts it into a structured abstract syntax tree (AST).

Design principles:
- simple, line-oriented parsing
- no attempt to infer chemical correctness
- prioritize explicitness over convenience

The parser recognizes:
- a reaction block containing reactants and products
- arrow statements describing electron movement

The output of the parser is purely semantic data with no visual or geometric information.

---

## Abstract Syntax Tree (AST)

The AST is the core internal representation used by mechlang.

At a high level, it consists of:
- a reaction object (reactants and products)
- a list of arrow objects (electron flow)

Example structure:

```json
{
  "reaction": {
    "reactants": ["CH3-Br", "OH-"],
    "products": ["CH3-OH", "Br-"]
  },
  "arrows": [
    { "style": "curved", "from": "OH:", "to": "C" },
    { "style": "curved", "from": "C-Br", "to": "Br" }
  ]
}
```
This representation intentionally separates chemical meaning from visual layout.

## Renderer design

The renderer consumes the AST and generates an SVG diagram.

## Key design decisions:

rendering is entirely driven by the AST

molecule labels are not hardcoded

arrow placement is determined by semantic intent rather than exact geometry

At the current stage, arrow positioning uses simple heuristic mappings from semantic targets (e.g. "OH", "C", "Br") to approximate locations in the diagram.

This approach prioritizes correctness of meaning over visual accuracy.

## Design tradeoffs and limitations

Several limitations are intentional at this stage:

no automated atom positioning

no bond geometry calculations

no chemical validation

limited support for multi-step mechanisms

These tradeoffs keep the architecture simple and make the semantics of the language explicit.

Future improvements can build on this foundation without changing the core pipeline.

## Future directions

Planned architectural improvements include:

refining the AST to better represent molecular structure

supporting multiple arrows and reaction steps

improving renderer layout logic

adding alternative renderers or analysis tools
