'use client';

import { useState } from 'react';
import {
  ShoppingBag,
  RefreshCw,
  ShoppingCart,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { useAbandonedCarts } from '../../../../lib/hooks/useAbandonedCarts';
import { AbandonedCartRow } from './AbandonedCartRow';
import { CartReminderModal } from './CartReminderModal';
import { WebhookSetupGuide } from './WebhookSetupGuide';
import type { AbandonedCart } from '../../../../lib/hooks/useAbandonedCarts';

type FilterType = 'all' | 'eligible' | 'reminded' | 'recent';

export function ShopifyPanel() {
  const { carts, loading, error, sendingReminder, approveReminder, markRecovered, reload } =
    useAbandonedCarts();

  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    await reload();
    setReloading(false);
  };

  // Derived stats
  const now = Date.now();
  const eligibleCarts = carts.filter(c => {
    const hoursOld = c.external_created_at
      ? (now - new Date(c.external_created_at).getTime()) / 3_600_000
      : 0;
    return hoursOld >= 6 && !c.reminded_at;
  });
  const remindedCarts = carts.filter(c => !!c.reminded_at);
  const recentCarts   = carts.filter(c => {
    if (!c.external_created_at) return false;
    return (now - new Date(c.external_created_at).getTime()) < 24 * 3_600_000;
  });

  const filteredCarts =
    filter === 'eligible' ? eligibleCarts :
    filter === 'reminded' ? remindedCarts :
    filter === 'recent'   ? recentCarts   :
    carts;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="p-6 w-full space-y-6 overflow-y-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-green-600" />
            Shopify — Abandoned Carts
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Review and approve WhatsApp reminders for customers who left items in their cart.
            Reminders are eligible after <strong>6 hours</strong>.
          </p>
        </div>
        <button
          onClick={handleReload}
          disabled={reloading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-slate-600" />}
          bg="bg-slate-100"
          label="Total Active"
          value={carts.length}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
          bg="bg-orange-100"
          label="Eligible (6h+)"
          value={eligibleCarts.length}
          highlight={eligibleCarts.length > 0}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          bg="bg-green-100"
          label="Reminded"
          value={remindedCarts.length}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-100"
          label="Last 24h"
          value={recentCarts.length}
        />
      </div>

      {/* ── Webhook setup guide ── */}
      <WebhookSetupGuide appUrl={appUrl} />

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        {(['all', 'eligible', 'reminded', 'recent'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'all'      ? `All (${carts.length})` :
             f === 'eligible' ? `Eligible (${eligibleCarts.length})` :
             f === 'reminded' ? `Reminded (${remindedCarts.length})` :
                                `Last 24h (${recentCarts.length})`}
          </button>
        ))}
      </div>

      {/* ── Cart list ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Failed to load carts: {error.message}
        </div>
      ) : filteredCarts.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-3">
          {filteredCarts.map(cart => (
            <AbandonedCartRow
              key={cart.id}
              cart={cart}
              onApprove={setSelectedCart}
              onMarkRecovered={markRecovered}
              isSending={sendingReminder === cart.id}
            />
          ))}
        </div>
      )}

      {/* ── Reminder approval modal ── */}
      {selectedCart && (
        <CartReminderModal
          cart={selectedCart}
          onClose={() => setSelectedCart(null)}
          onApprove={approveReminder}
          sending={sendingReminder === selectedCart.id}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon, bg, label, value, highlight = false,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${highlight ? 'border-orange-300 ring-1 ring-orange-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-xl font-bold ${highlight ? 'text-orange-600' : 'text-slate-900'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterType }) {
  const messages: Record<FilterType, { title: string; sub: string }> = {
    all:      { title: 'No active abandoned carts',    sub: 'Carts will appear here once customers add items and leave without purchasing.' },
    eligible: { title: 'No carts eligible yet',        sub: 'Carts become eligible for a reminder after 6 hours of inactivity.' },
    reminded: { title: 'No reminders sent yet',        sub: 'Approve a reminder from the Eligible tab to send a WhatsApp message.' },
    recent:   { title: 'No carts in the last 24 hours', sub: 'New carts will appear here as customers browse your store.' },
  };
  const { title, sub } = messages[filter];
  return (
    <div className="text-center py-16">
      <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto">{sub}</p>
    </div>
  );
}
