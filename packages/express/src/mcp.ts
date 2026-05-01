// MCP (Model Context Protocol) server implementation
// Exposes registered tools via the MCP JSON-RPC protocol over HTTP

import type { Request, Response } from "express";
import type { Tool } from "@agentkit/core";

interface McpRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

interface McpResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function mcpOk(id: string | number, result: unknown): McpResponse {
  return { jsonrpc: "2.0", id, result };
}

function mcpError(id: string | number, code: number, message: string): McpResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/**
 * Creates an Express request handler that implements the MCP protocol.
 * Mount this at a path like `/mcp` to allow Claude Desktop to connect.
 */
export function createMcpHandler(tools: Tool[]) {
  return (req: Request, res: Response): void => {
    const body = req.body as McpRequest;

    if (!body || body.jsonrpc !== "2.0" || !body.method) {
      res.json(mcpError(body?.id ?? 0, -32600, "Invalid Request"));
      return;
    }

    const { id, method, params } = body;

    switch (method) {
      case "initialize": {
        res.json(
          mcpOk(id, {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "agentkit", version: "0.1.0" },
          })
        );
        break;
      }

      case "tools/list": {
        const toolList = tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        }));
        res.json(mcpOk(id, { tools: toolList }));
        break;
      }

      case "tools/call": {
        const p = params as { name?: string; arguments?: unknown } | undefined;
        if (!p?.name) {
          res.json(mcpError(id, -32602, "Missing tool name"));
          return;
        }
        const tool = tools.find((t) => t.name === p.name);
        if (!tool) {
          res.json(mcpError(id, -32602, `Tool "${p.name}" not found`));
          return;
        }

        // For MCP, we execute with a system auth context (no approval gating at protocol layer)
        // The app-level policy is enforced via createAgentRouter; direct MCP calls get a service context.
        const callId = `mcp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const auth = {
          agentId: "mcp_client",
          agentName: "MCP Client",
          apiKey: "mcp_internal",
        };

        tool
          .handler({ auth, callId }, p.arguments ?? {})
          .then((output) => {
            res.json(
              mcpOk(id, {
                content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
              })
            );
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            res.json(mcpError(id, -32603, msg));
          });
        break;
      }

      case "notifications/initialized": {
        // Client sends this after initialize; no response needed
        res.status(204).end();
        break;
      }

      default: {
        res.json(mcpError(id, -32601, `Method not found: ${method}`));
      }
    }
  };
}
