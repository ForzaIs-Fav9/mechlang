# Examples

This directory contains example mechlang files demonstrating the current capabilities of the language and renderer.

## Canonical Examples

### sn2.mech

The primary reference example.

Demonstrates:
- Single-step reaction
- Reactants and products
- Curved-arrow electron flow
- Atom-based anchor resolution

This example represents the intended “happy path” for users.

### transform_test.mech

The canonical semantic-transform example for v0.15.

Demonstrates:
- `transform {}` blocks
- Automatic curved-arrow inference
- Heuristic product inference
- Product rendering
- Leaving-group departure rendering

## Semantic Diagnostics Examples

### transform_warning_test.mech

A small semantic warning example.

Used to test:
- Invalid transform detection
- Graceful warning output
- Non-fatal rendering behavior

## Robustness Examples

### sn2_alt.mech

An alternative formulation of the same reaction.

Used to test:
- Different arrow targets
- Anchor resolution flexibility
- Renderer stability under variation

### persistence_test.mech

A multi-step example demonstrating `persist:` behavior.

Used to test:
- Species carry-forward
- Step-local rendering
- Multi-step consistency

### sn1_steps.mech

A step-wise SN1-style example.

Used to test:
- Multi-step sequencing
- Persistent intermediates
- Step-separated arrow flow

### sn2_steps.mech

A step-wise SN2 example.

Used to test:
- Step-aware arrow resolution
- Multi-step layout stability

### double_bond_test.mech

A double-bond layout example.

Used to test:
- `C=C` and `C=O` rendering
- Bond order handling
- Label aliasing for duplicated atoms

## Notes

Examples are illustrative, not exhaustive.

They may evolve as the renderer gains new capabilities.
