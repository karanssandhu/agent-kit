# agentkit-cli

CLI for scaffolding AgentKit apps and running the dev server.

## Installation

```bash
npm install -g agentkit-cli
# or use via npx:
npx agentkit-cli scaffold my-app
```

## Commands

### `agentkit scaffold <name>`

Create a new AgentKit Express app:

```bash
agentkit scaffold my-agent-app
cd my-agent-app
npm install
cp .env.example .env
npm run dev
```

Options:
- `-o, --output <dir>` — Output directory (default: `./<name>`)

### `agentkit dev`

Start the dev server for an AgentKit app in the current directory:

```bash
cd my-agent-app
agentkit dev --port 3000
```

Options:
- `-p, --port <port>` — Port to listen on (default: `3000`)
