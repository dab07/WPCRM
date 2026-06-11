'use client';

import { Brain } from 'lucide-react';

const AI_AGENTS = [
  { name: 'Conversation Agent', status: 'active', load: 85 },
  { name: 'Trigger Detection',  status: 'active', load: 72 },
  { name: 'Content Generation', status: 'active', load: 91 },
  { name: 'Campaign Agent',     status: 'active', load: 45 },
  { name: 'Analytics Agent',    status: 'active', load: 63 },
];

export function AIAgentsStatus() {
  return (
    <div className="bg-brand-slate border border-[rgba(59,91,173,0.18)] rounded-[4px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[rgba(59,91,173,0.18)]">
        <Brain className="w-4 h-4 stroke-[1.5] text-brand-yellow" />
        <h3 className="font-heading font-semibold text-brand-offwhite text-sm tracking-tight">
          AI Agents Status
        </h3>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {AI_AGENTS.map((agent) => (
          <AgentCard key={agent.name} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: (typeof AI_AGENTS)[0] }) {
  const isHigh = agent.load >= 80;

  return (
    <div className="p-4 bg-brand-navy border border-[rgba(59,91,173,0.18)] rounded-[4px] flex flex-col gap-3">
      {/* Status + load */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="font-mono text-[10px] uppercase tracking-label text-brand-muted">
            Active
          </span>
        </div>
        <span
          className={`font-mono text-[11px] font-bold ${
            isHigh ? 'text-brand-yellow' : 'text-brand-muted'
          }`}
        >
          {agent.load}%
        </span>
      </div>

      <p className="font-heading font-semibold text-brand-offwhite text-[12px] leading-snug">
        {agent.name}
      </p>

      {/* Progress bar */}
      <div className="progress-brand rounded-[2px]">
        <div
          className="progress-brand-fill rounded-[2px]"
          style={{ width: `${agent.load}%` }}
        />
      </div>
    </div>
  );
}
