import { useState, useEffect, useCallback } from 'react';
import type { ShopifyProduct } from '../services/external/ShopifyService';

export type { ShopifyProduct };

export function useShopifyProducts() {
  const [products, setProducts]   = useState<ShopifyProduct[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shopify/products');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to fetch products');
      setProducts(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { products, loading, error, reload: load };
}
