// JSON Schema validation helpers

export type JsonSchemaType = "string" | "number" | "integer" | "boolean" | "object" | "array" | "null";

export interface JsonSchema {
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JsonSchema;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Minimal JSON Schema validator (covers the subset used by AgentKit).
 * For production use, replace with ajv or zod.
 */
export function validateSchema(value: unknown, schema: JsonSchema, path = ""): ValidationResult {
  const errors: string[] = [];

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = getJsonType(value);
    if (!types.includes(actualType as JsonSchemaType)) {
      errors.push(`${path || "value"} must be of type ${types.join("|")}, got ${actualType}`);
      return { valid: false, errors };
    }
  }

  if (schema.type === "object" || (typeof value === "object" && value !== null && !Array.isArray(value))) {
    const obj = value as Record<string, unknown>;

    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in obj)) {
          errors.push(`${path ? path + "." : ""}${key} is required`);
        }
      }
    }

    if (schema.properties) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          const sub = validateSchema(obj[key], subSchema, `${path ? path + "." : ""}${key}`);
          errors.push(...sub.errors);
        }
      }
    }
  }

  if (schema.type === "string" && typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path || "value"} must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path || "value"} must be at most ${schema.maxLength} characters`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path || "value"} must match pattern ${schema.pattern}`);
    }
  }

  if ((schema.type === "number" || schema.type === "integer") && typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path || "value"} must be >= ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path || "value"} must be <= ${schema.maximum}`);
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path || "value"} must be one of: ${schema.enum.map(String).join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}

function getJsonType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Helper to build a simple object schema */
export function objectSchema(
  properties: Record<string, JsonSchema>,
  required?: string[]
): JsonSchema {
  return { type: "object", properties, required };
}

/** Helper to build a string schema */
export function stringSchema(opts?: { description?: string; minLength?: number; maxLength?: number }): JsonSchema {
  return { type: "string", ...opts };
}

/** Helper to build a number schema */
export function numberSchema(opts?: { description?: string; minimum?: number; maximum?: number }): JsonSchema {
  return { type: "number", ...opts };
}
