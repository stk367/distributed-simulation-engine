# Project Guidelines

## Code Style
- Prefer clear, deterministic logic over clever shortcuts.
- Keep modules small and focused; split large functions into testable units.
- Add short comments only where distributed behavior or ordering is non-obvious.
- Match existing style and tooling once formatter/linter config is added.

## Architecture
- Treat this project as a distributed simulation engine with clear boundaries between:
  - simulation domain logic
  - node/runtime orchestration
  - transport/messaging
  - persistence/checkpointing (if used)
- Keep simulation rules deterministic and side-effect-light so runs are reproducible.
- Isolate transport code behind interfaces so protocols can change without rewriting domain logic.

## Build and Test
- No build/test toolchain is defined yet in this repository.
- Do not assume commands. Discover commands from project files when they exist (for example `README.md`, `package.json`, `pyproject.toml`, `Cargo.toml`, `Makefile`).
- Once toolchain files are added, prefer running the smallest relevant test scope first, then broader suites.

## Conventions
- Preserve deterministic event ordering and document any intentional non-determinism.
- Make message handlers idempotent where possible; retries should not corrupt state.
- Prefer explicit error handling for network/coordination boundaries.
- When adding operational or architecture docs, link them here rather than duplicating their content.
