'use client';

import { Bot } from 'lucide-react';

export function DashboardHeader() {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">WhatsApp CRM</h1>
            <p className="text-sm text-slate-500">AI-powered customer management</p>
          </div>
        </div>
      </div>
    </header>
  );
}