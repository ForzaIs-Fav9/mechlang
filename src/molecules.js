export const moleculeRegistry = {
  // ── Anions / Nucleophiles ─────────────────────────────────────────────────
  "CN-": {
    atoms: { N: { x: 0, y: 0 }, C: { x: 25, y: 0 } },
    bonds: [["N", "C"]],
    charge: -1
  },
  "OH-": {
    atoms: { O: { x: 0, y: 0 } },
    bonds: [],
    charge: -1
  },
  "Cl-": {
    atoms: { Cl: { x: 0, y: 0 } },
    bonds: [],
    charge: -1
  },
  "Br-": {
    atoms: { Br: { x: 0, y: 0 } },
    bonds: [],
    charge: -1
  },
  "I-": {
    atoms: { I: { x: 0, y: 0 } },
    bonds: [],
    charge: -1
  },
  "F-": {
    atoms: { F: { x: 0, y: 0 } },
    bonds: [],
    charge: -1
  },
  "HS-": {
    atoms: { S: { x: 0, y: 0 } },
    bonds: [],
    charge: -1
  },
  // ── Alkyl Halides (Electrophiles) ─────────────────────────────────────────
  "CH3-Br": {
    atoms: { C: { x: 0, y: 0 }, Br: { x: 40, y: 0 } },
    bonds: [["C", "Br"]],
    charge: 0
  },
  "CH3-Cl": {
    atoms: { C: { x: 0, y: 0 }, Cl: { x: 40, y: 0 } },
    bonds: [["C", "Cl"]],
    charge: 0
  },
  "CH3-I": {
    atoms: { C: { x: 0, y: 0 }, I: { x: 40, y: 0 } },
    bonds: [["C", "I"]],
    charge: 0
  },
  "CH3-F": {
    atoms: { C: { x: 0, y: 0 }, F: { x: 35, y: 0 } },
    bonds: [["C", "F"]],
    charge: 0
  },
  // ── Substitution Products ─────────────────────────────────────────────────
  "CH3-OH": {
    atoms: { C: { x: 0, y: 0 }, O: { x: 35, y: 0 } },
    bonds: [["C", "O"]],
    charge: 0
  },
  "CH3-CN": {
    atoms: { C: { x: 0, y: 0 }, N: { x: 50, y: 0 } },
    bonds: [["C", "N"]],
    charge: 0
  },
  "CH3-SH": {
    atoms: { C: { x: 0, y: 0 }, S: { x: 40, y: 0 } },
    bonds: [["C", "S"]],
    charge: 0
  },
  "CH3-NH2": {
    atoms: { C: { x: 0, y: 0 }, N: { x: 35, y: 0 } },
    bonds: [["C", "N"]],
    charge: 0
  },
  // ── Acids ─────────────────────────────────────────────────────────────────
  "HBr": {
    atoms: { H: { x: 0, y: 0 }, Br: { x: 30, y: 0 } },
    bonds: [["H", "Br"]],
    charge: 0
  },
  "HCl": {
    atoms: { H: { x: 0, y: 0 }, Cl: { x: 30, y: 0 } },
    bonds: [["H", "Cl"]],
    charge: 0
  },
  "HI": {
    atoms: { H: { x: 0, y: 0 }, I: { x: 30, y: 0 } },
    bonds: [["H", "I"]],
    charge: 0
  },
  // ── Small Neutral Molecules ───────────────────────────────────────────────
  "H2O": {
    atoms: { O: { x: 0, y: 0 } },
    bonds: [],
    charge: 0
  },
  "NH3": {
    atoms: { N: { x: 0, y: 0 } },
    bonds: [],
    charge: 0
  },
  "CH4": {
    atoms: { C: { x: 0, y: 0 } },
    bonds: [],
    charge: 0
  },
  // ── Cations ───────────────────────────────────────────────────────────────
  "CH3+": {
    atoms: { C: { x: 0, y: 0 } },
    bonds: [],
    charge: 1
  },
  "H+": {
    atoms: { H: { x: 0, y: 0 } },
    bonds: [],
    charge: 1
  },
  "NH4+": {
    atoms: { N: { x: 0, y: 0 } },
    bonds: [],
    charge: 1
  },
  // ── C=C Double Bond Species (v0.11) ───────────────────────────────────────
  "CH2=CH2": {
    atoms: { Ca: { x: 0, y: 0 }, Cb: { x: 40, y: 0 } },
    bonds: [["Ca", "Cb", 2]],
    labels: { Ca: "C", Cb: "C" },
    charge: 0
  },
  "CH3-CH=CH2": {
    atoms: { Ca: { x: 0, y: 0 }, Cb: { x: 40, y: 0 }, Cc: { x: 80, y: 0 } },
    bonds: [["Ca", "Cb"], ["Cb", "Cc", 2]],
    labels: { Ca: "C", Cb: "C", Cc: "C" },
    charge: 0
  },
  // ── C=O Double Bond Species (v0.11) ───────────────────────────────────────
  "CH2=O": {
    atoms: { C: { x: 0, y: 0 }, O: { x: 40, y: 0 } },
    bonds: [["C", "O", 2]],
    charge: 0
  },
  "CH3CHO": {
    atoms: { Ca: { x: 0, y: 0 }, Cb: { x: 40, y: 0 }, O: { x: 80, y: 0 } },
    bonds: [["Ca", "Cb"], ["Cb", "O", 2]],
    labels: { Ca: "C", Cb: "C", O: "O" },
    charge: 0
  },
  "CH3COCH3": {
    atoms: { Ca: { x: 0, y: 0 }, Cb: { x: 40, y: 0 }, O: { x: 40, y: -35 }, Cc: { x: 80, y: 0 } },
    bonds: [["Ca", "Cb"], ["Cb", "O", 2], ["Cb", "Cc"]],
    labels: { Ca: "C", Cb: "C", O: "O", Cc: "C" },
    charge: 0
  },
  "CH3CO-": {
    atoms: { C: { x: 0, y: 0 }, O: { x: 40, y: 0 } },
    bonds: [["C", "O", 2]],
    charge: -1
  }
};
