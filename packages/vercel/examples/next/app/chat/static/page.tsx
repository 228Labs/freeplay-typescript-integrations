'use client';

import ChatInput from '../../../components/ChatInput';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport} from 'ai';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export default function StaticChat() {
  const router = useRouter();
  const [chatId] = useState(() => crypto.randomUUID());

  const { error, status, sendMessage, messages, regenerate, stop } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: '/mcp/chat/static' }),
  });

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto px-4">
      <div className="flex justify-between items-start gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Freeplay Vercel AI SDK Example</h1>
          <p className="text-gray-600">Without Freeplay (Static)</p>
        </div>
        <button
          className="px-4 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 text-sm whitespace-nowrap transition-colors"
          onClick={() => router.push('/')}
        >
          ← Change Implementation
        </button>
      </div>

      <div className="mb-4">
        {messages.length === 0 && (
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
        status={status}
        onSubmit={(text: string) => sendMessage({ text })}
        stop={stop}
        className="w-full"
        inputClassName="fixed bottom-0 w-full max-w-2xl p-2 mb-8 border border-gray-300 rounded shadow-xl"
        buttonClassName="fixed bottom-0 w-full max-w-2xl p-2 mb-8 border border-gray-300 rounded shadow-xl"
        placeholder="Say something..."
      />
    </div>
  );
}

