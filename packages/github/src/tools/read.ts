// Read-only GitHub tools (no approval required)

import { defineTool } from "@agentkit/core";
import type { GitHubClient } from "../client.js";

/**
 * search_issues — search issues and PRs in the configured repository.
 * Read-only; no approval required.
 */
export function makeSearchIssues(client: GitHubClient) {
  return defineTool<
    { query: string; per_page?: number; page?: number },
    { total_count: number; items: unknown[] }
  >({
    name: "search_issues",
    description:
      "Search issues and pull requests in the GitHub repository. Returns a list of matching items with title, number, state, and URL.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: 'Search query (e.g. "label:bug is:open" or "authentication"). Supports GitHub search syntax.',
          minLength: 1,
        },
        per_page: {
          type: "integer",
          description: "Number of results to return (default: 10, max: 30)",
          minimum: 1,
          maximum: 30,
        },
        page: {
          type: "integer",
          description: "Page number for pagination (default: 1)",
          minimum: 1,
        },
      },
      required: ["query"],
    },
    policyOverride: "allow",
    handler: async (_ctx, input) => {
      const result = await client.searchIssues(input.query, input.per_page ?? 10, input.page ?? 1);
      return {
        total_count: result.total_count,
        items: result.items.map((item) => ({
          number: item.number,
          title: item.title,
          state: item.state,
          html_url: item.html_url,
          user: item.user?.login ?? null,
          labels: item.labels.map((l) => l?.name ?? "unknown"),
          created_at: item.created_at,
          updated_at: item.updated_at,
          is_pull_request: !!item.pull_request,
        })),
      };
    },
  });
}

/**
 * get_issue — retrieve a single issue by number.
 * Read-only; no approval required.
 */
export function makeGetIssue(client: GitHubClient) {
  return defineTool<{ issue_number: number }, unknown>({
    name: "get_issue",
    description: "Get details of a specific GitHub issue by its number, including title, body, labels, and assignees.",
    inputSchema: {
      type: "object",
      properties: {
        issue_number: {
          type: "integer",
          description: "The issue number",
          minimum: 1,
        },
      },
      required: ["issue_number"],
    },
    policyOverride: "allow",
    handler: async (_ctx, input) => {
      const issue = await client.getIssue(input.issue_number);
      return {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        body: issue.body,
        html_url: issue.html_url,
        user: issue.user?.login ?? null,
        labels: issue.labels.map((l) => l?.name ?? "unknown"),
        assignees: issue.assignees.map((a) => a?.login ?? "unknown"),
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        closed_at: issue.closed_at,
      };
    },
  });
}

/**
 * list_pull_requests — list pull requests in the repository.
 * Read-only; no approval required.
 */
export function makeListPullRequests(client: GitHubClient) {
  return defineTool<
    { state?: "open" | "closed" | "all"; per_page?: number; page?: number },
    unknown[]
  >({
    name: "list_pull_requests",
    description:
      "List pull requests in the GitHub repository. Filter by state (open/closed/all). Returns title, number, state, author, and URL.",
    inputSchema: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: 'Filter by PR state: "open" (default), "closed", or "all"',
          enum: ["open", "closed", "all"],
        },
        per_page: {
          type: "integer",
          description: "Number of results to return (default: 10, max: 30)",
          minimum: 1,
          maximum: 30,
        },
        page: {
          type: "integer",
          description: "Page number for pagination (default: 1)",
          minimum: 1,
        },
      },
      required: [],
    },
    policyOverride: "allow",
    handler: async (_ctx, input) => {
      const prs = await client.listPullRequests(
        input.state ?? "open",
        input.per_page ?? 10,
        input.page ?? 1
      );
      return prs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        html_url: pr.html_url,
        user: pr.user?.login ?? null,
        head: pr.head.ref,
        base: pr.base.ref,
        labels: pr.labels.map((l) => l?.name ?? "unknown"),
        created_at: pr.created_at,
        updated_at: pr.updated_at,
      }));
    },
  });
}

/**
 * get_pull_request — retrieve a single pull request by number.
 * Read-only; no approval required.
 */
export function makeGetPullRequest(client: GitHubClient) {
  return defineTool<{ pull_number: number }, unknown>({
    name: "get_pull_request",
    description:
      "Get details of a specific GitHub pull request by its number, including title, body, diff refs, labels, and merge status.",
    inputSchema: {
      type: "object",
      properties: {
        pull_number: {
          type: "integer",
          description: "The pull request number",
          minimum: 1,
        },
      },
      required: ["pull_number"],
    },
    policyOverride: "allow",
    handler: async (_ctx, input) => {
      const pr = await client.getPullRequest(input.pull_number);
      return {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        merged: pr.merged,
        mergeable: pr.mergeable,
        body: pr.body,
        html_url: pr.html_url,
        user: pr.user?.login ?? null,
        head: { ref: pr.head.ref, sha: pr.head.sha },
        base: { ref: pr.base.ref, sha: pr.base.sha },
        labels: pr.labels.map((l) => l?.name ?? "unknown"),
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at,
        closed_at: pr.closed_at,
      };
    },
  });
}

/**
 * get_actions_status — list recent GitHub Actions workflow runs.
 * Read-only; no approval required.
 */
export function makeGetActionsStatus(client: GitHubClient) {
  return defineTool<
    { per_page?: number; page?: number; branch?: string },
    { total_count: number; workflow_runs: unknown[] }
  >({
    name: "get_actions_status",
    description:
      "Get the status of recent GitHub Actions workflow runs for the repository. Shows run name, status, conclusion, and branch.",
    inputSchema: {
      type: "object",
      properties: {
        per_page: {
          type: "integer",
          description: "Number of workflow runs to return (default: 5, max: 20)",
          minimum: 1,
          maximum: 20,
        },
        page: {
          type: "integer",
          description: "Page number for pagination (default: 1)",
          minimum: 1,
        },
        branch: {
          type: "string",
          description: "Filter runs by branch name (optional)",
        },
      },
      required: [],
    },
    policyOverride: "allow",
    handler: async (_ctx, input) => {
      const result = await client.listWorkflowRuns(
        input.per_page ?? 5,
        input.page ?? 1,
        input.branch
      );
      return {
        total_count: result.total_count,
        workflow_runs: result.workflow_runs.map((run) => ({
          id: run.id,
          name: run.name,
          run_number: run.run_number,
          status: run.status,
          conclusion: run.conclusion,
          event: run.event,
          head_branch: run.head_branch,
          head_sha: run.head_sha.slice(0, 7),
          html_url: run.html_url,
          created_at: run.created_at,
          updated_at: run.updated_at,
        })),
      };
    },
  });
}
