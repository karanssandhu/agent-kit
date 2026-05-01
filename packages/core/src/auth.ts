// Auth interfaces

export interface AuthContext {
  /** The unique identifier of the calling agent */
  agentId: string;
  /** Human-readable name of the agent */
  agentName?: string;
  /** Optional user/service account the agent is acting on behalf of */
  userId?: string;
  /** Roles associated with this agent */
  roles?: string[];
  /** Raw API key (do not log) */
  apiKey: string;
}

export interface ApiKeyConfig {
  /** Map of API key → agent metadata */
  keys: Record<string, { agentId: string; agentName?: string; userId?: string; roles?: string[] }>;
}

/**
 * Validate an API key against a config and return an AuthContext.
 * Returns null if the key is not found.
 */
export function validateApiKey(apiKey: string, config: ApiKeyConfig): AuthContext | null {
  const meta = config.keys[apiKey];
  if (!meta) return null;
  return { ...meta, apiKey };
}
