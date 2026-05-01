// Tool definitions for the basic-express example
// Demonstrates three patterns:
//   1. get_customer  — read-only, no approval needed
//   2. create_invoice — write, requires approval
//   3. send_email    — write, requires approval

import { defineTool } from "@agentkit/core";

// ─── Simulated data store ─────────────────────────────────────────────────────

const CUSTOMERS: Record<string, { id: string; name: string; email: string; plan: string }> = {
  cust_001: { id: "cust_001", name: "Acme Corp", email: "billing@acme.com", plan: "enterprise" },
  cust_002: { id: "cust_002", name: "Globex Inc", email: "admin@globex.com", plan: "pro" },
  cust_003: { id: "cust_003", name: "Jane Smith", email: "jane@example.com", plan: "starter" },
};

// ─── Tool: get_customer ───────────────────────────────────────────────────────

export const getCustomer = defineTool<{ id: string }, typeof CUSTOMERS[string] | { error: string }>({
  name: "get_customer",
  description: "Look up a customer by their ID. Returns customer details including name, email, and current plan.",
  inputSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The customer ID (e.g. cust_001)",
      },
    },
    required: ["id"],
  },
  // policyOverride: "allow" — optional; get_* tools are allowed by DEFAULT_POLICY automatically
  handler: async (_ctx, input) => {
    const customer = CUSTOMERS[input.id];
    if (!customer) {
      return { error: `Customer "${input.id}" not found` };
    }
    return customer;
  },
});

// ─── Tool: create_invoice ─────────────────────────────────────────────────────

interface CreateInvoiceInput {
  customerId: string;
  amount: number;
  description: string;
  dueDate?: string;
}

export const createInvoice = defineTool<CreateInvoiceInput, { invoiceId: string; status: string; amount: number }>({
  name: "create_invoice",
  description:
    "Create an invoice for a customer. This is a write operation and requires human approval before execution.",
  inputSchema: {
    type: "object",
    properties: {
      customerId: {
        type: "string",
        description: "The customer ID to invoice",
      },
      amount: {
        type: "number",
        description: "Invoice amount in USD (must be positive)",
        minimum: 0.01,
      },
      description: {
        type: "string",
        description: "Line item description for the invoice",
        minLength: 3,
      },
      dueDate: {
        type: "string",
        description: "Due date in ISO 8601 format (e.g. 2025-12-31). Defaults to 30 days from now.",
      },
    },
    required: ["customerId", "amount", "description"],
  },
  handler: async (_ctx, input) => {
    // Simulate invoice creation
    const invoiceId = `inv_${Math.random().toString(36).slice(2, 9)}`;
    const customer = CUSTOMERS[input.customerId];
    if (!customer) {
      throw new Error(`Customer "${input.customerId}" not found`);
    }

    console.log(`📄 Invoice created: ${invoiceId} for ${customer.name} — $${input.amount}`);

    return {
      invoiceId,
      status: "draft",
      amount: input.amount,
    };
  },
});

// ─── Tool: send_email ─────────────────────────────────────────────────────────

interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export const sendEmail = defineTool<SendEmailInput, { messageId: string; status: string }>({
  name: "send_email",
  description:
    "Send an email to a recipient. This is a write operation and requires human approval before execution.",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "Recipient email address",
      },
      subject: {
        type: "string",
        description: "Email subject line",
        minLength: 1,
      },
      body: {
        type: "string",
        description: "Email body (plain text)",
        minLength: 1,
      },
    },
    required: ["to", "subject", "body"],
  },
  handler: async (_ctx, input) => {
    // Simulate sending email
    const messageId = `msg_${Math.random().toString(36).slice(2, 9)}`;

    console.log(`📧 Email sent: "${input.subject}" → ${input.to}`);

    return {
      messageId,
      status: "sent",
    };
  },
});
