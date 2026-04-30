'use client';

import { useState } from 'react';
import { MessageSquare, ShoppingCart, ExternalLink } from 'lucide-react';
import { Modal, Button } from '../../../ui';
import type { AbandonedCart } from '../../../../lib/hooks/useAbandonedCarts';

interface CartReminderModalProps {
  cart: AbandonedCart;
  onClose: () => void;
  onApprove: (cartId: string, email: string, message: string) => Promise<void>;
  sending: boolean;
}

function buildDefaultMessage(cart: AbandonedCart): string {
  const itemList = cart.line_items
    .map(i => `• ${i.title} (x${i.quantity})`)
    .join('\n');
  const total = cart.total_price ? `₹${Number(cart.total_price).toFixed(2)}` : '';
  const link = cart.checkout_url ?? '';

  return `Hi! 👋 You left something in your cart:\n\n${itemList}\n\n${total ? `Total: ${total}\n\n` : ''}Complete your purchase here:\n${link}\n\nReply STOP to unsubscribe.`;
}

export function CartReminderModal({ cart, onClose, onApprove, sending }: CartReminderModalProps) {
  const [message, setMessage] = useState(() => buildDefaultMessage(cart));
  const charCount = message.length;
  const isOverLimit = charCount > 1024;

  const handleApprove = async () => {
    if (!cart.email) return;
    await onApprove(cart.id, cart.email, message);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Approve WhatsApp Reminder" maxWidth="lg">
      {/* Cart summary */}
      <div className="bg-slate-50 rounded-lg p-4 mb-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <ShoppingCart className="w-4 h-4 text-orange-500" />
          Cart for <span className="text-slate-900">{cart.email}</span>
        </div>

        <ul className="space-y-1">
          {cart.line_items.map((item, i) => (
            <li key={i} className="flex justify-between text-sm text-slate-600">
              <span>{item.title} × {item.quantity}</span>
              <span className="font-medium">₹{item.price}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between pt-1 border-t border-slate-200">
          <span className="text-sm font-semibold text-slate-800">
            Total: ₹{Number(cart.total_price ?? 0).toFixed(2)}
          </span>
          {cart.checkout_url && (
            <a
              href={cart.checkout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              View cart
            </a>
          )}
        </div>
      </div>

      {/* Message editor */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          WhatsApp Message
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={8}
          className={`w-full px-3 py-2 border rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            isOverLimit ? 'border-red-400' : 'border-slate-300'
          }`}
        />
        <div className={`flex justify-between text-xs mt-1 ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
          <span>Edit the message before sending</span>
          <span>{charCount} / 1024</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
        <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          This will send a WhatsApp message to the customer's registered number.
          The cart will be stamped as <strong>reminded</strong> so the automated scheduler won't double-send.
        </span>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleApprove}
          disabled={sending || isOverLimit || !cart.email}
          className="flex-1"
        >
          {sending ? 'Sending…' : 'Approve & Send'}
        </Button>
      </div>
    </Modal>
  );
}
