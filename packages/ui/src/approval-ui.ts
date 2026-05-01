// @agentkit/ui — Approval UI HTML generator
// Produces a self-contained HTML page for the approval workflow.
// This is intentionally framework-free (vanilla JS) so it can be
// embedded in any Express app without additional dependencies.

export interface ApprovalUiOptions {
  /** Base URL of the agent router, e.g. "http://localhost:3000" */
  baseUrl: string;
  /**
   * API key used by the browser to call approve/deny endpoints.
   * In production, replace with a session token or short-lived credential.
   * Defaults to "agent_key_123" for local development only.
   */
  apiKey?: string;
  /** Page title */
  title?: string;
}

/**
 * Generate a self-contained HTML page for reviewing and approving agent actions.
 * The page loads the approval via the REST API and renders the details.
 */
export function buildApprovalUiHtml(opts: ApprovalUiOptions): string {
  const { baseUrl, apiKey = "agent_key_123", title = "AgentKit — Approve Action" } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f4f6f9;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 2rem;
      max-width: 560px;
      width: 100%;
    }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #111; }
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 99px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .badge-pending  { background: #fef3c7; color: #92400e; }
    .badge-approved { background: #d1fae5; color: #065f46; }
    .badge-denied   { background: #fee2e2; color: #991b1b; }
    label { display: block; font-size: 0.8rem; font-weight: 600; color: #555; margin-bottom: 0.25rem; }
    .value-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      font-family: "SF Mono", Menlo, monospace;
      font-size: 0.82rem;
      white-space: pre-wrap;
      word-break: break-all;
      margin-bottom: 1rem;
      color: #1e293b;
    }
    textarea {
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      font-size: 0.9rem;
      resize: vertical;
      min-height: 72px;
      margin-bottom: 1rem;
    }
    .actions { display: flex; gap: 0.75rem; }
    button {
      flex: 1;
      padding: 0.65rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-approve { background: #10b981; color: #fff; }
    .btn-deny    { background: #ef4444; color: #fff; }
    .result-msg { margin-top: 1rem; font-weight: 600; font-size: 0.95rem; }
    .result-msg.ok  { color: #065f46; }
    .result-msg.err { color: #991b1b; }
  </style>
</head>
<body>
<div class="card">
  <div id="loading">Loading approval...</div>
  <div id="error-state" style="display:none;color:#991b1b"></div>
  <div id="approval-content" style="display:none">
    <h1>Review Agent Action</h1>
    <div id="status-badge" class="badge badge-pending">Pending</div>
    <label>Tool</label>
    <div class="value-box" id="tool-name"></div>
    <label>Agent</label>
    <div class="value-box" id="agent-id"></div>
    <label>Input</label>
    <div class="value-box" id="tool-input"></div>
    <div id="action-section">
      <label>Reason (optional)</label>
      <textarea id="reason" placeholder="Add a note..."></textarea>
      <div class="actions">
        <button class="btn-approve" id="btn-approve" onclick="decide('approve')">✓ Approve</button>
        <button class="btn-deny"    id="btn-deny"    onclick="decide('deny')">✗ Deny</button>
      </div>
    </div>
    <div id="result-msg" class="result-msg" style="display:none"></div>
  </div>
</div>
<script>
  var BASE = ${JSON.stringify(baseUrl)};
  var API_KEY = ${JSON.stringify(apiKey)};
  var params = new URLSearchParams(location.search);
  var approvalId = params.get('id');

  function authHeaders(extra) {
    return Object.assign({ Authorization: 'Bearer ' + API_KEY }, extra);
  }

  async function load() {
    if (!approvalId) { showError('No approval ID in URL (?id=...)'); return; }
    try {
      var r = await fetch(BASE + '/agent/approvals/' + approvalId, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      var data = await r.json();
      render(data.approval);
    } catch(e) { showError('Failed to load: ' + e.message); }
  }

  function render(a) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('approval-content').style.display = 'block';
    document.getElementById('tool-name').textContent = a.toolName;
    document.getElementById('agent-id').textContent = a.agentId;
    document.getElementById('tool-input').textContent = JSON.stringify(JSON.parse(a.input), null, 2);
    var badge = document.getElementById('status-badge');
    badge.textContent = a.status.charAt(0).toUpperCase() + a.status.slice(1);
    badge.className = 'badge badge-' + a.status;
    if (a.status !== 'pending') {
      document.getElementById('action-section').style.display = 'none';
      showResult(a.status === 'approved' ? 'This action was approved.' : 'This action was denied.', a.status === 'approved');
    }
  }

  async function decide(action) {
    var reason = document.getElementById('reason').value.trim();
    document.getElementById('btn-approve').disabled = true;
    document.getElementById('btn-deny').disabled = true;
    try {
      var r = await fetch(BASE + '/agent/approvals/' + approvalId + '/' + action, {
        method: 'POST',
        headers: authHeaders({'Content-Type': 'application/json'}),
        body: JSON.stringify({ reason: reason }),
      });
      if (!r.ok) throw new Error(await r.text());
      var badge = document.getElementById('status-badge');
      badge.textContent = action === 'approve' ? 'Approved' : 'Denied';
      badge.className = 'badge badge-' + (action === 'approve' ? 'approved' : 'denied');
      document.getElementById('action-section').style.display = 'none';
      if (action === 'approve') {
        var exr = await fetch(BASE + '/agent/approvals/' + approvalId + '/execute', {
          method: 'POST', headers: authHeaders()
        });
        var exd = await exr.json();
        showResult(exd.status === 'completed'
          ? '✓ Approved and executed. Output: ' + JSON.stringify(exd.output)
          : 'Approved but execution failed: ' + (exd.error || 'Unknown'), exd.status === 'completed');
      } else {
        showResult('✗ Action denied.', false);
      }
    } catch(e) {
      document.getElementById('btn-approve').disabled = false;
      document.getElementById('btn-deny').disabled = false;
      showResult('Error: ' + e.message, false);
    }
  }

  function showResult(msg, ok) {
    var el = document.getElementById('result-msg');
    el.textContent = msg;
    el.className = 'result-msg ' + (ok ? 'ok' : 'err');
    el.style.display = 'block';
  }

  function showError(msg) {
    document.getElementById('loading').style.display = 'none';
    var el = document.getElementById('error-state');
    el.textContent = msg;
    el.style.display = 'block';
  }

  load();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
