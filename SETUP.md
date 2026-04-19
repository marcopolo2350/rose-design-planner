# Rose Design Planner - Setup

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ and npm

## Quick Start

```bash
npm install
npm run dev
```

The planner will be running at **http://localhost:3000**.

## Environment Variables (optional)

Copy `.env.example` to `.env` if you need:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | No | Enables address search in the editor |
| `PORT` | No | Dev server port (default: 3000) |

The planner works fully without any environment variables.

## Monorepo Structure

```
├── apps/
│   └── editor/          # Next.js editor application
├── packages/
│   ├── core/            # @pascal-app/core — Scene schema, state, systems
│   ├── viewer/          # @pascal-app/viewer — 3D rendering
│   └── ui/              # Shared UI components
└── tooling/             # Build & release tooling
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build all packages |
| `npm run check` | Lint and format check (Biome) |
| `npm run check:fix` | Auto-fix lint and format issues |
| `npm run check-types` | TypeScript type checking |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on submitting PRs and reporting issues.
