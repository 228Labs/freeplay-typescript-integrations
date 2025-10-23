/**
 * Shared types used across Next.js and Node.js examples
 */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type ChatStatus = "ready" | "loading" | "streaming" | "submitted";
