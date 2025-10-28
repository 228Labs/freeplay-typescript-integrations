import { useState, useEffect } from 'react';
import { Message, Implementation, ValidationResult } from './types';
import ChatInput from './components/ChatInput';
import './components/ChatInput.css';
import './App.css';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [selectedImplementation, setSelectedImplementation] = useState<Implementation | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !selectedImplementation) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(selectedImplementation.endpoint, {
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

  const implementations: Implementation[] = [
    {
      id: 'freeplay',
      title: 'With Freeplay Prompt Management',
      description: '⚠️ NOTE: You must have a prompt template created in Freeplay and update the example code for this option to work. Uses Freeplay to manage prompts and variables. Automatically selects the correct model provider based on the prompt configuration.',
      endpoint: '/api/mcp/chat/freeplay'
    },
    {
      id: 'static',
      title: 'Without Freeplay (Static)',
      description: 'Uses static values and hardcoded model configuration. Pure OpenTelemetry telemetry without Freeplay prompt management.',
      endpoint: '/api/mcp/chat/static'
    }
  ];

  // Validate Freeplay configuration when selected
  useEffect(() => {
    if (selectedImplementation?.id === 'freeplay') {
      setIsValidating(true);
      fetch('/api/validate/freeplay')
        .then(res => res.json())
        .then((result: ValidationResult) => {
          setValidationResult(result);
        })
        .catch(error => {
          console.error('Validation error:', error);
          setValidationResult({
            valid: false,
            errors: ['Failed to validate configuration. Is the server running?'],
            warnings: []
          });
        })
        .finally(() => {
          setIsValidating(false);
        });
    } else {
      setValidationResult(null);
    }
  }, [selectedImplementation]);

  if (!selectedImplementation) {
    return (
      <div className="app">
        <div className="container">
          <h1>Freeplay Vercel AI SDK Example</h1>
          <p className="subtitle">Choose an implementation to get started</p>

          <div className="implementation-selector">
            {implementations.map((impl) => (
              <div
                key={impl.id}
                className="implementation-card"
                onClick={() => setSelectedImplementation(impl)}
              >
                <h2>{impl.title}</h2>
                <p>{impl.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const canChat = !validationResult || validationResult.valid;

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div>
            <h1>Freeplay Vercel AI SDK Example</h1>
            <p className="subtitle">
              {selectedImplementation.title}
            </p>
          </div>
          <button
            className="back-button"
            onClick={() => {
              setSelectedImplementation(null);
              setMessages([]);
              setValidationResult(null);
            }}
          >
            ← Change Implementation
          </button>
        </div>

        {isValidating && (
          <div className="validation-status validating">
            <strong>⏳ Validating configuration...</strong>
          </div>
        )}

        {!isValidating && validationResult && !validationResult.valid && (
          <div className="validation-status error">
            <strong>⚠️ Configuration Issues</strong>
            <p>Please fix the following issues before you can start chatting:</p>
            <ul>
              {validationResult.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
            <p className="help-text">
              Add these to your <code>examples/.env</code> file. See the{' '}
              <a
                href="https://github.com/freeplay-ai/freeplay-typescript-integrations/blob/main/packages/vercel/README.md#environment"
                target="_blank"
                rel="noopener noreferrer"
              >
                README
              </a>{' '}
              for setup instructions.
            </p>
          </div>
        )}

        {!isValidating && validationResult && validationResult.valid && validationResult.warnings.length > 0 && (
          <div className="validation-status warning">
            <strong>ℹ️ Configuration Warnings</strong>
            <ul>
              {validationResult.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="messages">
          {messages.length === 0 && canChat && (
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
          status={isLoading ? 'loading' : canChat ? 'ready' : 'submitted'}
          onSubmit={canChat ? sendMessage : () => {}}
        />
      </div>
    </div>
  );
}

export default App;

