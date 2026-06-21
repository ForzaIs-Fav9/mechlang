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
