import { moleculeRegistry } from './molecules.js';

const KNOWN_ELEMENTS = new Set([
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar',
  'K', 'Ca', 'Br', 'I', 'Fe', 'Cu', 'Zn'
]);

function extractElement(atomId, labels) {
  if (labels && labels[atomId]) {
    return labels[atomId];
  }

  if (KNOWN_ELEMENTS.has(atomId)) {
    return atomId;
  }

  const single = atomId[0];
  return single;
}

export class MoleculeGraph {

  constructor(name, atoms, bonds, charge) {
    this.name = name;
    this.atoms = atoms;
    this.bonds = bonds;
    this.charge = charge;
  }

  getAtom(id) {
    return this.atoms.find(a => a.id === id) || null;
  }

  neighbors(id) {
    const result = [];
    for (const bond of this.bonds) {
      if (bond.from === id) result.push(bond.to);
      else if (bond.to === id) result.push(bond.from);
    }
    return result;
  }

  hasBond(a, b) {
    return this.bonds.some(
      bond => (bond.from === a && bond.to === b) || (bond.from === b && bond.to === a)
    );
  }

  getBond(a, b) {
    return this.bonds.find(
      bond => (bond.from === a && bond.to === b) || (bond.from === b && bond.to === a)
    ) || null;
  }

  bondOrder(a, b) {
    const bond = this.getBond(a, b);
    return bond ? bond.order : null;
  }

  atomCount() {
    return this.atoms.length;
  }

  bondCount() {
    return this.bonds.length;
  }

  static fromRegistry(name) {
    const entry = moleculeRegistry[name];

    if (!entry) {
      throw new Error(`[MoleculeGraph] Unknown registry key: "${name}"`);
    }

    const labels = entry.labels || null;

    const atoms = Object.keys(entry.atoms).map(id => ({
      id,
      element: extractElement(id, labels)
    }));

    const bonds = (entry.bonds || []).map(bond => ({
      from: bond[0],
      to: bond[1],
      order: bond[2] ?? 1
    }));

    const charge = entry.charge ?? 0;

    return new MoleculeGraph(name, atoms, bonds, charge);
  }
}
