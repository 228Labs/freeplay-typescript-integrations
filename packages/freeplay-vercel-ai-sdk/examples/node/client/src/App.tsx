import { useState } from 'react';
import { Message } from '../../../shared/types';
import ChatInput from '../../../shared/components/ChatInput';
import './components/ChatInput.css';
import './App.css';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/mcp/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: text,
            },
          ],
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantId = crypto.randomUUID();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  assistantMessage += parsed.text;
                  setMessages((prev) => {
                    const withoutLastAssistant = prev.filter(
                      (m) => m.id !== assistantId
                    );
                    return [
                      ...withoutLastAssistant,
                      {
                        id: assistantId,
                        role: 'assistant',
                        content: assistantMessage,
                      },
                    ];
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Freeplay Vercel AI SDK Example</h1>
        <p className="subtitle">Basic chat + MCP Example with Freeplay Telemetry</p>

        <div className="messages">
          {messages.length === 0 && (
            <div className="loading">
              Try asking: "What's 5 + 3 + 12?" or "Calculate the sum of 10, 20, and 30"
            </div>
          )}
          {messages.map((message) => (
            <div key={message.id} className="message">
              <strong>{message.role === 'user' ? 'User: ' : 'AI: '}</strong>
              {message.content}
            </div>
          ))}
          {isLoading && <div className="loading">Loading...</div>}
        </div>

        <ChatInput
          status={isLoading ? 'loading' : 'ready'}
          onSubmit={sendMessage}
        />
      </div>
    </div>
  );
}

export default App;

