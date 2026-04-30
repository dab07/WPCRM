'use client';

import { ShoppingCart, Clock, CheckCircle, MessageSquare, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AbandonedCart } from '../../../../lib/hooks/useAbandonedCarts';

interface AbandonedCartRowProps {
  cart: AbandonedCart;
  onApprove: (cart: AbandonedCart) => void;
  onMarkRecovered: (cartId: string) => void;
  isSending: boolean;
}

export function AbandonedCartRow({ cart, onApprove, onMarkRecovered, isSending }: AbandonedCartRowProps) {
  const hoursOld = cart.external_created_at
    ? (Date.now() - new Date(cart.external_created_at).getTime()) / 3_600_000
    : 0;

  const isEligible = hoursOld >= 6 && !cart.reminded_at;
  const alreadyReminded = !!cart.reminded_at;

  const urgencyColor =
    hoursOld >= 24 ? 'border-l-red-400' :
    hoursOld >= 6  ? 'border-l-orange-400' :
                     'border-l-slate-300';

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${urgencyColor} p-4`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: cart info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="font-medium text-slate-900 truncate">{cart.email ?? '—'}</span>
            {alreadyReminded && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                <CheckCircle className="w-3 h-3" />
                Reminded
              </span>
            )}
          </div>

          {/* Line items */}
          <ul className="text-sm text-slate-600 space-y-0.5 mb-2">
            {cart.line_items.slice(0, 3).map((item, i) => (
              <li key={i} className="flex justify-between">
                <span className="truncate max-w-[260px]">{item.title} × {item.quantity}</span>
                <span className="ml-2 shrink-0">₹{item.price}</span>
              </li>
            ))}
            {cart.line_items.length > 3 && (
              <li className="text-slate-400 text-xs">+{cart.line_items.length - 3} more items</li>
            )}
          </ul>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              Total: ₹{Number(cart.total_price ?? 0).toFixed(2)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {cart.external_created_at
                ? formatDistanceToNow(new Date(cart.external_created_at), { addSuffix: true })
                : '—'}
            </span>
            {!isEligible && !alreadyReminded && (
              <span className="text-amber-600">
                Eligible in {Math.max(0, Math.ceil(6 - hoursOld))}h
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => onApprove(cart)}
            disabled={isSending || alreadyReminded}
            title={
              alreadyReminded ? 'Already reminded' :
              !isEligible ? 'Cart must be at least 6 hours old' :
              'Send WhatsApp reminder'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              alreadyReminded
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isEligible
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {isSending ? 'Sending…' : 'Send Reminder'}
          </button>

          <button
            onClick={() => onMarkRecovered(cart.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Mark Recovered
          </button>
        </div>
      </div>
    </div>
  );
}
