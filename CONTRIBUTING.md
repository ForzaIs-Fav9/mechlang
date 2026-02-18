# Contributing to MechLang

Thank you for your interest in contributing to MechLang.

MechLang is a domain-specific language for representing organic chemistry mechanisms semantically and rendering them programmatically. This project prioritizes **semantic clarity, architectural simplicity, and determinism** over visual perfection.

Please read this document before contributing.

---

## Project Philosophy

MechLang is built around the following principles:

- Chemical meaning is separate from visual geometry.
- The AST is the single source of truth.
- Rendering must be deterministic.
- No implicit global state.
- No hidden geometry logic inside parsing.
- No chemistry validation inside rendering (for now).

Before proposing major changes, ensure they align with this philosophy.

---

## Development Environment

Requirements:

- Node.js >= 18
- ES Modules `"type": "module"` in package.json)

Install dependencies:

```bash
npm install
```

Run renderer:

```bash
npm run render examples/sn2_steps.mech
```

Run tests:

```bash
npm test
```

---

## Branching Strategy

main is protected.
All work must be done in feature branches.
One feature per branch.

Branch naming convention:

```
feature/<short-description>
fix/<short-description>
refactor/<short-description>
docs/<short-description>
```

Example:

```
feature/horizontal-layout
```

Never commit directly to main.

---

## Commit Message Convention

We use Conventional Commits.

Format:

```
<type>(scope): short description
```

Allowed types:

- feat
- fix
- refactor
- docs
- test
- chore

Examples:

```
feat(parser): enforce step-scoped semantics
feat(renderer): implement horizontal timeline layout
docs(readme): document step-based arrow rules
fix(renderer): prevent undefined arrow target crash
```

Do not use vague messages like:

- update
- fix stuff
- changes

---

## Pull Requests

Every PR must:

- Target main
- Have a clear title
- Explain what changed and why
- Include tests if behavior changed
- Update documentation if DSL behavior changed

PRs that change DSL syntax must update:

- README.md
- Examples
- Snapshot tests

---

## Coding Standards

- Keep parser and renderer responsibilities separate.
- Avoid mixing semantic logic with SVG generation.
- Keep functions small and single-purpose.
- No global mutable state.
- Prefer explicit logic over clever shortcuts.
- Formatting is enforced via Prettier.

---

## Testing Requirements

All changes affecting rendering must:

- Add or update snapshot tests.
- Ensure deterministic SVG output.
- Avoid breaking canonical examples.

Tests must pass before merging.

---

## Versioning

We use semantic versioning.

```
MAJOR.MINOR.PATCH
```

- MAJOR: Breaking DSL or AST changes
- MINOR: New features
- PATCH: Bug fixes

Example:

```
0.8.0 → Horizontal timeline feature
0.8.1 → Arrow resolution bug fix
```

Do not bump versions manually without a clear change.

---

## Issues

When reporting bugs, include:

- MechLang version
- Input .mech file
- Expected behavior
- Actual behavior
- Console output (if any)

---

## Future Directions

Planned improvements include:

- Horizontal timeline rendering
- Species persistence across steps
- Charges and bond order rendering
- Improved layout engine
- CLI improvements
- Snapshot testing and CI automation

Please discuss major features in Issues before implementation.

---

## Code of Conduct

Be respectful and constructive.
This project aims to be educational and collaborative.

Thank you for contributing to MechLang.
