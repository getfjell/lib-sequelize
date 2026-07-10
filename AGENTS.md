# @fjell/lib-sequelize

See the root [AGENTS.md](../AGENTS.md) for polyrepo build/link/review/release instructions.

## Quirks

- Aligned to **Vitest 4** with sibling packages (Phase 3). Coverage floors are lines/statements 90, functions 85, branches 80.
- `sqlite3` remains a direct runtime dependency (see open issue on peer/optional dialect).
