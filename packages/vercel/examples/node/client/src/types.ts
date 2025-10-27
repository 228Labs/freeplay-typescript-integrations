/**
 * Shared types used across the client
 */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatStatus = "ready" | "loading" | "streaming" | "submitted";
