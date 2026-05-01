// Write GitHub tools — all default to require_approval

import { defineTool } from "@agentkit/core";
import type { GitHubClient } from "../client.js";

/**
 * create_issue — open a new issue in the repository.
 * Requires human approval before execution.
 */
export function makeCreateIssue(client: GitHubClient) {
  return defineTool<
    { title: string; body?: string; labels?: string[]; assignees?: string[] },
    unknown
  >({
    name: "create_issue",
    description:
      "Create a new GitHub issue in the repository. Requires approval before execution. " +
      "Specify the title, optional body, labels, and assignees.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Issue title",
          minLength: 1,
        },
        body: {
          type: "string",
          description: "Issue body (markdown supported)",
        },
        labels: {
          type: "array",
          description: "List of label names to apply",
          items: { type: "string" },
        },
        assignees: {
          type: "array",
          description: "List of GitHub usernames to assign",
          items: { type: "string" },
        },
      },
      required: ["title"],
    },
    // Write tools always require approval
    policyOverride: "require_approval",
    handler: async (_ctx, input) => {
      const issue = await client.createIssue(
        input.title,
        input.body,
        input.labels,
        input.assignees
      );
      return {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        html_url: issue.html_url,
        created_at: issue.created_at,
      };
    },
  });
}

/**
 * comment_issue — post a comment on an existing issue or pull request.
 * Requires human approval before execution.
 */
export function makeCommentIssue(client: GitHubClient) {
  return defineTool<{ issue_number: number; body: string }, unknown>({
    name: "comment_issue",
    description:
      "Post a comment on a GitHub issue or pull request. Requires approval before execution.",
    inputSchema: {
      type: "object",
      properties: {
        issue_number: {
          type: "integer",
          description: "The issue or pull request number to comment on",
          minimum: 1,
        },
        body: {
          type: "string",
          description: "Comment text (markdown supported)",
          minLength: 1,
        },
      },
      required: ["issue_number", "body"],
    },
    // Write tools always require approval
    policyOverride: "require_approval",
    handler: async (_ctx, input) => {
      const comment = await client.createIssueComment(input.issue_number, input.body);
      return {
        id: comment.id,
        html_url: comment.html_url,
        body: comment.body,
        user: comment.user?.login ?? null,
        created_at: comment.created_at,
      };
    },
  });
}

/**
 * create_pull_request — open a new pull request in the repository.
 * Requires human approval before execution.
 */
export function makeCreatePullRequest(client: GitHubClient) {
  return defineTool<
    { title: string; head: string; base: string; body?: string; draft?: boolean },
    unknown
  >({
    name: "create_pull_request",
    description:
      "Create a new GitHub pull request. Requires approval before execution. " +
      "Specify the title, head branch, base branch, optional body, and whether it's a draft.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Pull request title",
          minLength: 1,
        },
        head: {
          type: "string",
          description: "The name of the branch where your changes are implemented (head branch)",
          minLength: 1,
        },
        base: {
          type: "string",
          description: "The name of the branch you want the changes pulled into (base branch, e.g. main)",
          minLength: 1,
        },
        body: {
          type: "string",
          description: "Pull request description (markdown supported)",
        },
        draft: {
          type: "boolean",
          description: "Set to true to create a draft pull request (default: false)",
        },
      },
      required: ["title", "head", "base"],
    },
    // Write tools always require approval
    policyOverride: "require_approval",
    handler: async (_ctx, input) => {
      const pr = await client.createPullRequest(
        input.title,
        input.head,
        input.base,
        input.body,
        input.draft ?? false
      );
      return {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        draft: pr.draft,
        html_url: pr.html_url,
        head: pr.head.ref,
        base: pr.base.ref,
        created_at: pr.created_at,
      };
    },
  });
}
