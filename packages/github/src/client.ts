// Minimal GitHub REST API client using native fetch + PAT auth

export interface GitHubClientConfig {
  /** GitHub Personal Access Token */
  token: string;
  /** Repository in "owner/repo" format */
  repo: string;
  /** GitHub API base URL (defaults to https://api.github.com for GitHub.com) */
  baseUrl?: string;
}

export class GitHubClient {
  private token: string;
  private owner: string;
  private repoName: string;
  private baseUrl: string;

  constructor(config: GitHubClientConfig) {
    this.token = config.token;
    const parts = config.repo.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid repo format "${config.repo}". Expected "owner/repo".`);
    }
    this.owner = parts[0];
    this.repoName = parts[1];
    this.baseUrl = (config.baseUrl ?? "https://api.github.com").replace(/\/$/, "");
  }

  private get repoPath(): string {
    return `/repos/${this.owner}/${this.repoName}`;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      let message = `GitHub API error ${response.status}: ${response.statusText}`;
      try {
        const body = await response.json() as { message?: string };
        if (body.message) message = `GitHub API error ${response.status}: ${body.message}`;
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // ── Issues ───────────────────────────────────────────────────────────────────

  searchIssues(query: string, perPage = 10, page = 1) {
    const q = `${query} repo:${this.owner}/${this.repoName}`;
    const params = new URLSearchParams({ q, per_page: String(perPage), page: String(page) });
    return this.request<GitHubSearchResult>(`/search/issues?${params}`);
  }

  getIssue(issueNumber: number) {
    return this.request<GitHubIssue>(`${this.repoPath}/issues/${issueNumber}`);
  }

  createIssue(title: string, body?: string, labels?: string[], assignees?: string[]) {
    return this.request<GitHubIssue>(`${this.repoPath}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body, labels, assignees }),
    });
  }

  createIssueComment(issueNumber: number, body: string) {
    return this.request<GitHubComment>(`${this.repoPath}/issues/${issueNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  // ── Pull Requests ─────────────────────────────────────────────────────────────

  listPullRequests(state: "open" | "closed" | "all" = "open", perPage = 10, page = 1) {
    const params = new URLSearchParams({ state, per_page: String(perPage), page: String(page) });
    return this.request<GitHubPullRequest[]>(`${this.repoPath}/pulls?${params}`);
  }

  getPullRequest(pullNumber: number) {
    return this.request<GitHubPullRequest>(`${this.repoPath}/pulls/${pullNumber}`);
  }

  createPullRequest(title: string, head: string, base: string, body?: string, draft = false) {
    return this.request<GitHubPullRequest>(`${this.repoPath}/pulls`, {
      method: "POST",
      body: JSON.stringify({ title, head, base, body, draft }),
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  listWorkflowRuns(perPage = 5, page = 1, branch?: string) {
    const params = new URLSearchParams({ per_page: String(perPage), page: String(page) });
    if (branch) params.set("branch", branch);
    return this.request<GitHubWorkflowRunsResponse>(`${this.repoPath}/actions/runs?${params}`);
  }
}

// ── GitHub API response types ─────────────────────────────────────────────────

export interface GitHubUser {
  login: string;
  id: number;
  html_url: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  user: GitHubUser | null;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  pull_request?: { url: string };
}

export interface GitHubComment {
  id: number;
  html_url: string;
  body: string;
  user: GitHubUser | null;
  created_at: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  user: GitHubUser | null;
  head: { ref: string; sha: string; label: string };
  base: { ref: string; sha: string; label: string };
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  labels: GitHubLabel[];
}

export interface GitHubWorkflowRun {
  id: number;
  name: string | null;
  status: string | null;
  conclusion: string | null;
  workflow_id: number;
  head_branch: string | null;
  head_sha: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  event: string;
}

export interface GitHubWorkflowRunsResponse {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
}

export interface GitHubSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubIssue[];
}
