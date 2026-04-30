import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface AbandonedCart {
  id: string;
  brand_id: string;
  external_id: string;
  email: string | null;
  total_price: number | null;
  line_items: Array<{ title: string; quantity: number; price: string; product_id?: number }>;
  checkout_url: string | null;
  recovered: boolean;
  reminded_at: string | null;
  external_created_at: string | null;
  created_at: string;
}

export interface CartReminderApproval {
  cartId: string;
  email: string;
  message: string;
}

export function useAbandonedCarts(brandId?: string) {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const loadCarts = useCallback(async () => {
    try {
      setError(null);
      let query = supabase
        .from('abandoned_carts')
        .select('*')
        .eq('recovered', false)
        .order('external_created_at', { ascending: false })
        .limit(100);

      if (brandId) query = query.eq('brand_id', brandId);

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setCarts((data as AbandonedCart[]) ?? []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    loadCarts();
  }, [loadCarts]);

  /** Human approves sending a WhatsApp reminder for a specific cart */
  const approveReminder = async (approval: CartReminderApproval) => {
    setSendingReminder(approval.cartId);
    try {
      const res = await fetch('/api/shopify/cart-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approval),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Failed to send reminder');
      }
      await loadCarts();
    } finally {
      setSendingReminder(null);
    }
  };

  /** Mark a cart as recovered manually */
  const markRecovered = async (cartId: string) => {
    const { error: dbError } = await supabase
      .from('abandoned_carts')
      .update({ recovered: true })
      .eq('id', cartId);
    if (dbError) throw new Error(dbError.message);
    await loadCarts();
  };

  return { carts, loading, error, sendingReminder, approveReminder, markRecovered, reload: loadCarts };
}
