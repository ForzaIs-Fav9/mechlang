# mechlang

mechlang is an experimental, open-source, text-based language for representing organic chemistry reaction mechanisms and curved-arrow electron flow semantically.

Instead of manually drawing static mechanism diagrams, mechlang treats reactions as structured data that can be parsed, interpreted, and rendered programmatically.

---

## What is mechlang?

mechlang is a small domain-specific language (DSL) designed to describe organic chemistry reactions using text.

A mechlang file encodes:
- reactants and products
- electron movement via curved arrows
- chemical intent rather than visual geometry

This textual description is parsed into a structured internal representation (an abstract syntax tree, or AST), which can then be rendered into diagrams or used for further analysis.

---

## Motivation

Organic reaction mechanisms are traditionally represented as drawings. While visually intuitive, these diagrams are fundamentally static: they are difficult to version-control, hard to edit incrementally, and lose their underlying chemical meaning once reduced to geometry.

mechlang explores an alternative approach:
- describe *what happens chemically* instead of *how it is drawn*
- separate chemical semantics from visual layout
- enable reproducible, programmatic generation of mechanisms

The project sits at the intersection of chemistry, programming language design, and scientific visualization.

---

## How it works

mechlang follows a simple compiler-style pipeline:

1. A `.mech` file describes a reaction and electron flow
2. The parser reads this file and constructs an AST
3. The renderer interprets the AST and generates an SVG diagram


The renderer is driven entirely by the AST, not by hardcoded molecule names or arrow geometry. Changing the `.mech` source changes the output diagram without modifying the renderer.

---

## Example

```text
reaction {
  reactants: CH3-Br + OH-
  products: CH3-OH + Br-
}

arrow(curved, from=OH:, to=C)
arrow(curved, from=C-Br, to=Br)
```
Rendering this file produces an SVG diagram showing reactants, products, and curved-arrow electron flow corresponding to the reaction mechanism.

## Current scope

mechlang is an early-stage prototype focused on core semantics.

## Currently supported:

single-step reactions

reactants and products

curved-arrow electron movement

SVG output

## Not yet supported:

precise molecular geometry

automated atom positioning

multi-step mechanisms

chemical validation or error checking

These limitations are intentional to keep the core language and architecture clear.
