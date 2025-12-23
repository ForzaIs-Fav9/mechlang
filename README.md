# mechlang

**mechlang** is an experimental, open-source, text-based language for representing
organic chemistry reactions and curved-arrow mechanisms in a semantic, structured way.

The project is inspired by LaTeX’s philosophy for mathematics, but is designed
specifically for the needs of organic chemistry.

---

## Motivation

Drawing organic reaction mechanisms using graphical tools is slow, fragile, and
difficult to version-control. Small edits often require redrawing entire diagrams,
and the underlying chemical meaning is lost once the diagram becomes a static image.

mechlang explores an alternative approach:

- Represent reactions and mechanisms as **text**
- Encode **chemical meaning**, not just geometry
- Enable reactions to be versioned, diffed, and generated programmatically

---

## Example

```mech
reaction {
  reactants: CH3-Br + OH-
  products: CH3-OH + Br-
}

arrow(curved, from=OH:, to=C)
arrow(curved, from=C-Br, to=Br)
