// Auth middleware for Express

import type { Request, Response, NextFunction } from "express";
import { validateApiKey } from "@agentkit/core";
import type { ApiKeyConfig, AuthContext } from "@agentkit/core";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      agentAuth?: AuthContext;
    }
  }
}

/**
 * Creates Express middleware that validates the Authorization header
 * against the provided API key config.
 *
 * Expects: `Authorization: Bearer <api-key>`
 */
export function createAuthMiddleware(config: ApiKeyConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid Authorization header" });
      return;
    }

    const apiKey = authHeader.slice("Bearer ".length).trim();
    const auth = validateApiKey(apiKey, config);

    if (!auth) {
      res.status(403).json({ error: "Invalid API key" });
      return;
    }

    req.agentAuth = auth;
    next();
  };
}
