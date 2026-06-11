'use client';

import { useState } from 'react';

import { DashboardHeader } from './Dashboard/DashboardHeader';
import { Sidebar } from './Dashboard/Sidebar';
import { MainContent } from './Dashboard/MainContent';
import type { Tab } from './Dashboard/types';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('agentic');

  return (
    <div className="h-screen flex flex-col bg-brand-navy">
      <DashboardHeader />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <MainContent activeTab={activeTab} />
      </div>
    </div>
  );
}
