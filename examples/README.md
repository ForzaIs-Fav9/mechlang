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

## Robustness Examples

### sn2_alt.mech

An alternative formulation of the same reaction.

Used to test:
- Different arrow targets
- Anchor resolution flexibility
- Renderer stability under variation

These files are not separate specifications, but stress tests of the same semantics.

## Notes

Examples are illustrative, not exhaustive.

They may evolve as the renderer gains new capabilities.
