# @agentkit/core

Core building blocks for AgentKit: tool definitions, JSON Schema validation, auth interfaces, and the policy engine.

## Installation

```bash
pnpm add @agentkit/core
```

## Usage

### Define a tool

```ts
import { defineTool } from "@agentkit/core";

const getCustomer = defineTool({
  name: "get_customer",
  description: "Look up a customer by ID",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "Customer ID" },
    },
    required: ["id"],
  },
  handler: async (ctx, input) => {
    // ctx.auth contains the authenticated agent info
    return { id: input.id, name: "Jane Doe", email: "jane@example.com" };
  },
});
```

### Validate input against a schema

```ts
import { validateSchema } from "@agentkit/core";

const result = validateSchema({ id: "cust_001" }, getCustomer.inputSchema);
if (!result.valid) {
  console.error(result.errors);
}
```

### Policy engine

```ts
import { PolicyEngine, DEFAULT_POLICY } from "@agentkit/core";

const engine = new PolicyEngine(DEFAULT_POLICY);
const { action } = engine.evaluate(getCustomer, authCtx);
// action === "allow" for get_* tools
```

## API

### `defineTool(definition)`

Create a typed tool definition. TypeScript will infer input/output types from the handler.

### `validateSchema(value, schema)`

Validate a value against a JSON Schema. Returns `{ valid, errors }`.

### `validateApiKey(apiKey, config)`

Check an API key against a config map. Returns an `AuthContext` or `null`.

### `PolicyEngine`

Evaluate tool + auth context against a policy to get `"allow" | "require_approval" | "deny"`.
