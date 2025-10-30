'use client';

import ChatInput from '../../../components/ChatInput';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport} from 'ai';
import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function FreeplayChat() {
  const router = useRouter();
  const [chatId] = useState(() => crypto.randomUUID());
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { error, status, sendMessage, messages, regenerate, stop } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: '/mcp/chat/freeplay' }),
  });

  // Validate Freeplay configuration
  useEffect(() => {
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
  }, []);

  const canChat = !validationResult || validationResult.valid;

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto px-4">
      <div className="flex justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Freeplay Vercel AI SDK Example</h1>
          <p className="text-gray-600">With Freeplay Prompt Management</p>
        </div>
        <button
          className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-sm whitespace-nowrap transition-colors"
          onClick={() => router.push('/')}
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

