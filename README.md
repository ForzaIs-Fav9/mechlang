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
### Commit Conventions

MechLang uses conventional commit-style messages:
feat, fix, refactor, docs, chore.

Earlier commits may not fully follow this standard.

## Mechanism Steps

All arrows must appear inside a `step { }` block.

A step represents a single elementary reaction event where all arrows
occur simultaneously.

Arrows outside steps are invalid.
## Step-Based Mechanism Semantics (v0.8+)
MechLang uses **explicit step blocks** to represent reaction mechanisms.
Each `step {}` defines a **self-contained semantic context**:
- Species declared in a step exist only in that step
- Arrows may reference only species within the same step
- Arrow resolution is deterministic and local
### Syntax
```mech
step {
  species:
    nucleophile = CN-
    electrophile = CH3-Br
  arrow(
    curved,
    from = nucleophile.C,
    to   = electrophile.C-Br
  )
}
```
Semantic Rules
species: defines named roles
Arrow targets use role.selector
Selectors may be:
Atom symbols (C, N, Br)
Bonds (C-Br)
Arrows cannot cross steps
This design ensures:
Clear reaction timelines
Deterministic rendering
No global state ambiguity
Multi-step mechanisms are represented by multiple step {} blocks rendered vertically.
