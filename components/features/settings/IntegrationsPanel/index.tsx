'use client';

import { GallaboxCard } from './GallaboxCard';

export function IntegrationsPanel() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-heading text-[18px] text-brand-offwhite">Integrations</h2>
        <p className="font-body text-[12px] text-brand-muted">
          Connect external services. Email campaigns are unaffected by changes here.
        </p>
      </div>

      {/* Section: WhatsApp */}
      <section className="space-y-3">
        <p className="label-eyebrow text-brand-muted/70">WhatsApp Provider</p>
        <GallaboxCard />
      </section>
    </div>
  );
}
