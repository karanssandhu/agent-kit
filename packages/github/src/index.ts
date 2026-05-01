// @agentkit/github — public API

export { GitHubClient } from "./client.js";
export type { GitHubClientConfig, GitHubIssue, GitHubPullRequest, GitHubWorkflowRun } from "./client.js";

import type { Tool } from "@agentkit/core";
import { GitHubClient, type GitHubClientConfig } from "./client.js";
import { makeSearchIssues, makeGetIssue, makeListPullRequests, makeGetPullRequest, makeGetActionsStatus } from "./tools/read.js";
import { makeCreateIssue, makeCommentIssue, makeCreatePullRequest } from "./tools/write.js";

export interface CreateGitHubToolsOptions {
  /** GitHub Personal Access Token */
  token: string;
  /** Repository in "owner/repo" format */
  repo: string;
  /** GitHub API base URL — override for GitHub Enterprise (default: https://api.github.com) */
  baseUrl?: string;
}

export interface GitHubTools {
  // Read tools (no approval required)
  searchIssues: Tool;
  getIssue: Tool;
  listPullRequests: Tool;
  getPullRequest: Tool;
  getActionsStatus: Tool;
  // Write tools (require approval)
  createIssue: Tool;
  commentIssue: Tool;
  createPullRequest: Tool;
  /** All tools as an array — pass directly to createAgentRouter */
  all: Tool[];
}

/**
 * Create all GitHub tools configured for a single repository.
 *
 * @example
 * ```ts
 * import { createGitHubTools } from "@agentkit/github";
 *
 * const github = createGitHubTools({
 *   token: process.env.GITHUB_TOKEN!,
 *   repo: process.env.GITHUB_REPO!, // "owner/repo"
 * });
 *
 * // Use in createAgentRouter:
 * createAgentRouter({ tools: github.all, ... });
 * ```
 */
export function createGitHubTools(options: CreateGitHubToolsOptions): GitHubTools {
  const clientConfig: GitHubClientConfig = {
    token: options.token,
    repo: options.repo,
    baseUrl: options.baseUrl,
  };
  const client = new GitHubClient(clientConfig);

  const searchIssues = makeSearchIssues(client);
  const getIssue = makeGetIssue(client);
  const listPullRequests = makeListPullRequests(client);
  const getPullRequest = makeGetPullRequest(client);
  const getActionsStatus = makeGetActionsStatus(client);
  const createIssue = makeCreateIssue(client);
  const commentIssue = makeCommentIssue(client);
  const createPullRequest = makeCreatePullRequest(client);

  return {
    searchIssues,
    getIssue,
    listPullRequests,
    getPullRequest,
    getActionsStatus,
    createIssue,
    commentIssue,
    createPullRequest,
    all: [
      searchIssues,
      getIssue,
      listPullRequests,
      getPullRequest,
      getActionsStatus,
      createIssue,
      commentIssue,
      createPullRequest,
    ],
  };
}
