import { useState } from "react";

/**
 * Universal ChatInput component that works with both Next.js and React apps.
 * Styling should be provided by the consuming application.
 */

export interface ChatInputProps {
  status: string;
  onSubmit: (text: string) => void;
  stop?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export default function ChatInput({
  status,
  onSubmit,
  stop,
  placeholder = "Type your message...",
  className = "chat-input-form",
  inputClassName = "chat-input",
  buttonClassName = "chat-button",
}: ChatInputProps) {
  const [text, setText] = useState("");

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() === "") return;
        onSubmit(text);
        setText("");
      }}
    >
      <input
        className={inputClassName}
        placeholder={placeholder}
        disabled={status !== "ready"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {stop && (status === "streaming" || status === "submitted" || status === "loading") && (
        <button className={buttonClassName} type="button" onClick={stop}>
          Stop
        </button>
      )}
    </form>
  );
}

