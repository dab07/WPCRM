'use client';

import { Brain } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui';

const AI_AGENTS = [
  { name: 'Conversation Agent', status: 'active', load: 85 },
  { name: 'Trigger Detection', status: 'active', load: 72 },
  { name: 'Content Generation', status: 'active', load: 91 },
  { name: 'Campaign Agent', status: 'active', load: 45 },
  { name: 'Analytics Agent', status: 'active', load: 63 },
];

export function AIAgentsStatus() {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          AI Agents Status
        </h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {AI_AGENTS.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AgentCard({ agent }: { agent: typeof AI_AGENTS[0] }) {
  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-xs text-slate-600">{agent.load}%</span>
      </div>
      <p className="font-medium text-slate-900 text-sm">{agent.name}</p>
      <div className="mt-2 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${agent.load}%` }}
        />
      </div>
    </div>
  );
}
