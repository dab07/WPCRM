'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, CheckCheck, ExternalLink } from 'lucide-react';
import { config } from '../../../../lib/config/environment';
export function WebhookSetupGuide() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const n8nCartHook  = `${config.n8n.baseUrl}/webhook/shopify-cart-update`;
  const n8nOrderHook = `${config.n8n.baseUrl}/webhook/shopify-order-create-crosssell`;

  const CodeLine = ({ value, id }: { value: string; id: string }) => (
    <div className="flex items-center justify-between bg-slate-900 text-green-400 rounded px-3 py-2 text-xs font-mono mt-1">
      <span className="truncate">{value}</span>
      <button
        onClick={() => copy(value, id)}
        className="ml-2 shrink-0 text-slate-400 hover:text-white transition-colors"
      >
        {copied === id ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-blue-900">Shopify Webhook Setup Guide</span>
        {open ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-blue-600" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 text-sm text-blue-900">
          <p className="text-blue-700">
            Shopify webhooks push real-time events to your n8n instance. You need two webhooks configured in your Shopify admin.
          </p>

          {/* Step 1 */}
          <div>
            <p className="font-semibold mb-1">1. Go to Shopify Admin → Settings → Notifications → Webhooks</p>
            <a
              href="https://admin.shopify.com/store/YOUR_STORE/settings/notifications"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
            >
              <ExternalLink className="w-3 h-3" />
              Open Shopify Webhooks
            </a>
          </div>

          {/* Step 2 */}
          <div>
            <p className="font-semibold mb-1">2. Add webhook: <code className="bg-blue-100 px-1 rounded">Checkout updated</code></p>
            <p className="text-blue-700 text-xs mb-1">This fires when a customer adds items to cart and abandons it.</p>
            <p className="text-xs text-slate-600 mb-0.5">Endpoint URL (n8n):</p>
            <CodeLine value={n8nCartHook} id="cart" />
          </div>

          {/* Step 3 */}
          <div>
            <p className="font-semibold mb-1">3. Add webhook: <code className="bg-blue-100 px-1 rounded">Order created</code></p>
            <p className="text-blue-700 text-xs mb-1">This fires when a customer completes a purchase — marks carts as recovered.</p>
            <p className="text-xs text-slate-600 mb-0.5">Endpoint URL (n8n):</p>
            <CodeLine value={n8nOrderHook} id="order" />
          </div>

          {/* Step 4 */}
          <div>
            <p className="font-semibold mb-1">4. How it works end-to-end</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
              <li>Customer adds item → Shopify fires <strong>Checkout updated</strong> → n8n upserts into <code>abandoned_carts</code></li>
              <li>After 6 hours, this dashboard shows the cart as eligible for a reminder</li>
              <li>You review the cart and approve the WhatsApp message here (Human-in-the-Loop)</li>
              <li>Message is sent via WhatsApp; cart is stamped <code>reminded_at</code></li>
              <li>If customer buys → Shopify fires <strong>Order created</strong> → n8n marks cart <code>recovered = true</code></li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs">
            <strong>Note:</strong> The n8n workflows <code>cart-upsert-shopify-webhook.json</code> and <code>cart-recovery-tracker.json</code> must be imported and active in your n8n instance first.
          </div>
        </div>
      )}
    </div>
  );
}
