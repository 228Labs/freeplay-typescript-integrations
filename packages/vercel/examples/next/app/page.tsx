'use client';

import {useRouter} from 'next/navigation';

interface Implementation {
  id: string;
  title: string;
  description: string;
  route: string;
}

export default function Home() {
  const router = useRouter();

  const implementations: Implementation[] = [
    {
      id: 'freeplay',
      title: 'With Freeplay Prompt Management',
      description: '⚠️ NOTE: You must have a prompt template created in Freeplay and update the example code for this option to work. Uses Freeplay to manage prompts and variables. Automatically selects the correct model provider based on the prompt configuration.',
      route: '/chat/freeplay'
    },
    {
      id: 'static',
      title: 'Without Freeplay (Static)',
      description: 'Uses static values and hardcoded model configuration. Pure OpenTelemetry telemetry without Freeplay prompt management.',
      route: '/chat/static'
    }
  ];

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto px-4">
      <h1 className="text-3xl font-bold mb-2">Freeplay Vercel AI SDK Example</h1>
      <p className="text-gray-600 mb-8">Choose an implementation to get started</p>

      <div className="flex flex-col gap-4">
        {implementations.map((impl) => (
          <div
            key={impl.id}
            className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => router.push(impl.route)}
          >
            <h2 className="text-xl font-semibold mb-3">{impl.title}</h2>
            <p className="text-gray-600 mb-0">{impl.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
