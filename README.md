# mechlang

mechlang is an experimental, open-source, text-based language for representing organic chemistry reaction mechanisms and curved-arrow electron flow semantically.

Instead of manually drawing static mechanism diagrams, mechlang treats reactions as structured data that can be parsed, interpreted, and rendered programmatically.

---

## What is mechlang?

mechlang is a small domain-specific language (DSL) designed to describe organic chemistry reactions using text.

A mechlang file encodes:

* reactants and products
* electron movement via curved arrows
* multi-step reaction semantics
* semantic bond transformations
* chemical intent rather than visual geometry

This textual description is parsed into a structured internal representation (an abstract syntax tree, or AST), which can then be rendered into diagrams or used for further analysis.

---

## Motivation

Organic reaction mechanisms are traditionally represented as drawings. While visually intuitive, these diagrams are fundamentally static: they are difficult to version-control, hard to edit incrementally, and lose their underlying chemical meaning once reduced to geometry.

mechlang explores an alternative approach:

* describe *what happens chemically* instead of *how it is drawn*
* separate chemical semantics from visual layout
* enable reproducible, programmatic generation of mechanisms
* build chemistry tooling around semantic reaction state

The project sits at the intersection of chemistry, programming language design, and scientific visualization.

---

## Architecture

mechlang follows a layered compiler-style pipeline:

```text
.mech source
    ↓
  cli.js              → orchestrates I/O
    ↓
  parse.js            → AST
    ↓
  compile.js          → semantic validation + arrow inference + product inference
    ↓                      (uses semantic-engine.js and product-engine.js)
  render.js           → SVG string (pure function, no I/O)
    ↓
  out/*.svg
```

* `cli.js` handles file I/O and argument parsing
* `parse.js` handles syntax only — produces the AST
* `compile.js` orchestrates chemistry reasoning: semantic validation, arrow inference, product inference
* `semantic-engine.js` validates transforms and infers curved arrows
* `product-engine.js` performs heuristic product synthesis
* `render.js` handles visualization only — receives pre-compiled mechanism data

The renderer is driven entirely by compiled mechanism data — not by hardcoded geometry. Chemistry reasoning never lives in the renderer.

---

## Example

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

---

## Semantic Transform Blocks (v0.14)

MechLang supports semantic bond operations independent from rendering:

```mech
step {
  species:
    nuc = CN-
    sub = CH3-Br

  transform {
    form C-CN
    break C-Br
  }
}
```

Transforms describe chemical state changes semantically rather than manually specifying SVG arrow geometry.

Current supported operations:

* `form A-B`
* `break A-B`

Transforms are parsed into structured AST operations independent from rendering and can be validated and interpreted by the semantic engine.

---

## Automatic Arrow Inference

The semantic engine can infer curved-arrow electron flow automatically from transform operations.

Example:

```mech
transform {
  form C-CN
  break C-Br
}
```

can automatically generate:

* nucleophilic attack arrows
* leaving-group departure arrows

without explicit `arrow()` declarations.

Explicit arrows remain fully supported.

---

## Heuristic Product Inference (v0.15)

MechLang now infers products for supported reaction patterns, starting with SN2-style substitution.

Example:

```mech
step {
  species:
    nuc = CN-
    sub = CH3-Br

  transform {
    form C-CN
    break C-Br
  }
}
```

can automatically render as:

* `CH3-CN`
* `Br-`

without explicit product declarations.

This is heuristic rather than full graph rewriting. It is intended as the first step toward reaction-state synthesis.

---

## Semantic Diagnostics

MechLang includes compiler-style semantic validation warnings.

Examples:

* missing nucleophile detection
* invalid break transform detection
* missing bond validation

Warnings never crash rendering.

SVG output is still produced whenever possible.

---

## Current Scope

mechlang is still an early-stage prototype focused on semantic architecture.

### Currently supported

* multi-step mechanisms
* curved-arrow electron flow
* semantic transform blocks
* automatic arrow inference
* heuristic product inference
* inferred product rendering
* semantic diagnostics
* species persistence
* SVG output
* horizontal and vertical layouts
* double-bond rendering
* charges
* semantic engine tests
* product engine tests
* product separation and leaving-group rendering

### Not yet supported

* full molecular graph rewriting
* transition-state visualization
* stereochemistry
* aromaticity
* rings
* triple bonds
* automated geometry optimization
* chemistry correctness validation

These limitations are intentional to keep the semantic architecture stable before scaling complexity.

---

## Mechanism Steps

All arrows must appear inside a `step { }` block.

A step represents a single elementary reaction event where all arrows occur simultaneously.

Arrows outside steps are invalid.

---

## Step-Based Mechanism Semantics

Each `step {}` defines a self-contained semantic context:

* Species declared in a step exist only in that step
* Arrows may reference only species within the same step
* Arrow resolution is deterministic and local

### Syntax

```mech
step:
species:
sub = CH3-Br
nuc = CN-

transform:
form C-CN
break C-Br
```

Semantic Rules:

* `species:` defines named roles
* Arrow targets use `role.selector`
* Selectors may reference atoms or bonds
* Arrows cannot cross steps

---

## Species Persistence

Species may persist across steps using:

```mech
persist: nuc, base
```

Persistent species are resolved during parsing before rendering.

---

## Testing

Run semantic-engine tests:

```bash
node tests/semantic-engine.test.js
```

Run product-engine tests:

```bash
node tests/product-engine.test.js
```

Render example mechanisms:

```bash
node src/cli.js examples/sn2.mech
```

---

## Commit Conventions

MechLang uses Conventional Commits.

Allowed types:

* feat
* fix
* refactor
* docs
* test
* chore

Example:

```text
feat(engine): infer arrows from semantic transforms
```

---

## License

Licensed under the Apache License 2.0.
