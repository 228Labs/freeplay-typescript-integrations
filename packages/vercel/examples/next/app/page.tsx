'use client';

import ChatInput from '../components/ChatInput';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport} from 'ai';
import {useState, useEffect} from 'react';

interface Implementation {
  id: string;
  title: string;
  description: string;
  endpoint: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function Home() {
  const [chatId] = useState(() => crypto.randomUUID());
  const [selectedImplementation, setSelectedImplementation] = useState<Implementation | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { error, status, sendMessage, messages, regenerate, stop } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: selectedImplementation?.endpoint || '/mcp/chat/freeplay' }),
  });

  const implementations: Implementation[] = [
    {
      id: 'freeplay',
      title: 'With Freeplay Prompt Management',
      description: '⚠️ NOTE: You must have a prompt template created in Freeplay and update the example code for this option to work. Uses Freeplay to manage prompts and variables. Automatically selects the correct model provider based on the prompt configuration.',
      endpoint: '/mcp/chat/freeplay'
    },
    {
      id: 'static',
      title: 'Without Freeplay (Static)',
      description: 'Uses static values and hardcoded model configuration. Pure OpenTelemetry telemetry without Freeplay prompt management.',
      endpoint: '/mcp/chat/static'
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
      <div className="flex flex-col w-full max-w-2xl py-24 mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">Freeplay Vercel AI SDK Example</h1>
        <p className="text-gray-600 mb-8">Choose an implementation to get started</p>

        <div className="flex flex-col gap-4">
          {implementations.map((impl) => (
            <div
              key={impl.id}
              className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5"
              onClick={() => setSelectedImplementation(impl)}
            >
              <h2 className="text-xl font-semibold mb-3">{impl.title}</h2>
              <p className="text-gray-600 mb-0">{impl.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const canChat = !validationResult || validationResult.valid;

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto px-4">
      <div className="flex justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Freeplay Vercel AI SDK Example</h1>
          <p className="text-gray-600">{selectedImplementation.title}</p>
        </div>
        <button
          className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-sm whitespace-nowrap transition-colors"
          onClick={() => {
            setSelectedImplementation(null);
            setValidationResult(null);
          }}
        >
          ← Change Implementation
        </button>
      </div>

      {isValidating && (
        <div className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
          <strong className="block mb-2">⏳ Validating configuration...</strong>
        </div>
      )}

      {!isValidating && validationResult && !validationResult.valid && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-900">
          <strong className="block mb-2">⚠️ Configuration Issues</strong>
          <p className="mb-2">Please fix the following issues before you can start chatting:</p>
          <ul className="list-disc pl-6 mb-4">
            {validationResult.errors.map((error, i) => (
              <li key={i} className="mb-1">{error}</li>
            ))}
          </ul>
          <p className="text-sm">
            Add these to your <code className="bg-red-100 px-2 py-1 rounded text-xs">examples/.env</code> file. See the{' '}
            <a
              href="https://github.com/freeplay-ai/freeplay-typescript-integrations/blob/main/packages/vercel/README.md#environment"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:opacity-80"
            >
              README
            </a>{' '}
            for setup instructions.
          </p>
        </div>
      )}

      {!isValidating && validationResult && validationResult.valid && validationResult.warnings.length > 0 && (
        <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-900">
          <strong className="block mb-2">ℹ️ Configuration Warnings</strong>
          <ul className="list-disc pl-6">
            {validationResult.warnings.map((warning, i) => (
              <li key={i} className="mb-1">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4">
        {messages.length === 0 && canChat && (
          <div className="text-gray-500 italic">
            Try asking: "What's 5 + 3 + 12?" or "Calculate the sum of 10, 20, and 30"
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className="whitespace-pre-wrap mb-4">
            <strong>{m.role === 'user' ? 'User: ' : 'AI: '}</strong>
            {m.parts
              .map(part => (part.type === 'text' ? part.text : ''))
              .join('')}
          </div>
        ))}
      </div>

      {(status === 'submitted' || status === 'streaming') && (
        <div className="mt-4 text-gray-500">
          {status === 'submitted' && <div>Loading...</div>}
          <button
            type="button"
            className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md hover:bg-blue-50 transition-colors"
            onClick={stop}
          >
            Stop
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <div className="text-red-500">An error occurred.</div>
          <button
            type="button"
            className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md hover:bg-blue-50 transition-colors"
            onClick={() => regenerate()}
          >
            Retry
          </button>
        </div>
      )}

      <ChatInput
        status={canChat ? status : 'submitted'}
        onSubmit={canChat ? (text: string) => sendMessage({ text }) : () => {}}
        stop={stop}
        className="w-full"
        inputClassName="fixed bottom-0 w-full max-w-2xl p-2 mb-8 border border-gray-300 rounded shadow-xl"
        buttonClassName="fixed bottom-0 w-full max-w-2xl p-2 mb-8 border border-gray-300 rounded shadow-xl"
        placeholder="Say something..."
      />
    </div>
  );
}

