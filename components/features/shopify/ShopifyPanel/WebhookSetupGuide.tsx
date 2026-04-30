'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, CheckCheck, ExternalLink, CheckCircle } from 'lucide-react';

const WEBHOOK_URL = 'https://wpcrm.vercel.app/api/integrations/webhooks/shopify';

export function WebhookSetupGuide() {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const topics = [
    { event: 'Checkouts update',  topic: 'checkouts/update',  desc: 'Fires when a customer adds items and abandons checkout' },
    { event: 'Orders creation',   topic: 'orders/create',     desc: 'Fires on purchase — marks abandoned carts as recovered' },
    { event: 'Orders update',     topic: 'orders/updated',    desc: 'Fires on fulfillment, refund, or status changes' },
  ];

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-blue-900">Shopify Webhook Setup Guide</span>
        {open
          ? <ChevronDown  className="w-4 h-4 text-blue-600" />
          : <ChevronRight className="w-4 h-4 text-blue-600" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 text-sm text-blue-900">

          {/* Why this approach */}
          <div className="bg-white border border-blue-100 rounded-lg p-3 text-blue-800 text-xs">
            <strong>How it works:</strong> Shopify pushes events directly to your app's stable Vercel URL.
            No n8n URL needed for inbound data — n8n is only used for the outbound reminder scheduler.
          </div>

          {/* Step 1 — webhook URL */}
          <div>
            <p className="font-semibold mb-1">1. Your webhook endpoint (stable — never changes)</p>
            <div className="flex items-center justify-between bg-slate-900 text-green-400 rounded px-3 py-2 text-xs font-mono">
              <span className="truncate">{WEBHOOK_URL}</span>
              <button
                onClick={copy}
                className="ml-2 shrink-0 text-slate-400 hover:text-white transition-colors"
              >
                {copied
                  ? <CheckCheck className="w-3.5 h-3.5 text-green-400" />
                  : <Copy       className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Step 2 — open Shopify */}
          <div>
            <p className="font-semibold mb-1">2. Open Shopify Admin → Settings → Notifications → Webhooks</p>
            <a
              href="https://admin.shopify.com/store/agent-testing-store/settings/notifications"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
            >
              <ExternalLink className="w-3 h-3" />
              Open Shopify Webhooks (agent-testing-store)
            </a>
          </div>

          {/* Step 3 — topics to register */}
          <div>
            <p className="font-semibold mb-2">3. Add these 3 webhooks — all pointing to the same URL above</p>
            <div className="space-y-2">
              {topics.map(t => (
                <div key={t.topic} className="flex items-start gap-2 bg-white border border-blue-100 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-slate-800">{t.event}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                    <code className="text-xs text-blue-700 bg-blue-50 px-1 rounded mt-1 inline-block">
                      Topic: {t.topic}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 4 — format */}
          <div>
            <p className="font-semibold mb-1">4. Webhook format</p>
            <p className="text-xs text-blue-700">
              Set format to <strong>JSON</strong>. API version: <strong>2025-01</strong>.
            </p>
          </div>

          {/* Step 5 — flow */}
          <div>
            <p className="font-semibold mb-1">5. End-to-end flow</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
              <li>Customer adds item → Shopify fires <strong>checkouts/update</strong> → cart saved to DB instantly</li>
              <li>After 6 hours, this dashboard shows the cart as eligible for a reminder</li>
              <li>You approve the WhatsApp message here (Human-in-the-Loop)</li>
              <li>Customer buys → Shopify fires <strong>orders/create</strong> → cart marked <code>recovered = true</code> automatically</li>
              <li>n8n polls every 4 hours as a backup sync to catch anything missed</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
            <strong>Security:</strong> The webhook is verified using HMAC-SHA256 with your{' '}
            <code>SHOPIFY_SECRET</code> key. Requests with invalid signatures are rejected with 401.
          </div>
        </div>
      )}
    </div>
  );
}
