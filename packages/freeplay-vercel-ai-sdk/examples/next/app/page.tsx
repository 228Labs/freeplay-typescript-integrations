'use client';

import ChatInput from '@shared/components/ChatInput';
import {useChat} from '@ai-sdk/react';
import {DefaultChatTransport} from 'ai';
import {useState} from 'react';

export default function Home() {
  const [chatId] = useState(() => crypto.randomUUID());
  const { error, status, sendMessage, messages, regenerate, stop } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: '/mcp/chat' }),
  });

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <h1 className="text-2xl font-bold mb-4">Freeplay Vercel AI SDK Example</h1>
      <p className="text-gray-600 mb-8">Basic chat + MCP Example with Freeplay Telemetry</p>

      {messages.map(m => (
        <div key={m.id} className="whitespace-pre-wrap mb-4">
          {m.role === 'user' ? 'User: ' : 'AI: '}
          {m.parts
            .map(part => (part.type === 'text' ? part.text : ''))
            .join('')}
        </div>
      ))}

      {(status === 'submitted' || status === 'streaming') && (
        <div className="mt-4 text-gray-500">
          {status === 'submitted' && <div>Loading...</div>}
          <button
            type="button"
            className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
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
            className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
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
        inputClassName="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
        buttonClassName="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
        placeholder="Say something..."
      />
    </div>
  );
}

