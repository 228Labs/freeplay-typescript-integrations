/**
 * Shared types used across the client
 */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatStatus = "ready" | "loading" | "streaming" | "submitted";

export interface Implementation {
  id: string;
  title: string;
  description: string;
  endpoint: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
