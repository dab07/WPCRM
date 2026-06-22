import { useState, useEffect, useCallback } from 'react';
import type { ShopifyOrder } from '../services/external/ShopifyService';

export type { ShopifyOrder };

export function useShopifyOrders() {
  const [orders, setOrders]       = useState<ShopifyOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shopify/orders');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to fetch orders');
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { orders, loading, error, reload: load };
}
