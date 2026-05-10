'use client';

import { Package, Tag, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { useShopifyProducts } from '../../../../lib/hooks/useShopifyProducts';

export function ProductsTab() {
  const { products, loading, error, reload } = useShopifyProducts();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-700">Failed to load products</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
          <button
            onClick={reload}
            className="mt-2 text-xs text-red-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {products.length} product{products.length !== 1 ? 's' : ''} from your Shopify store
        </p>
        <button
          onClick={reload}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No active products found</h3>
          <p className="text-slate-500 text-sm">
            Add products in your Shopify admin and they&apos;ll appear here.
          </p>
          <a
            href={`https://admin.shopify.com/store/${process.env.NEXT_PUBLIC_SHOPIFY_SHOP_DOMAIN?.replace('.myshopify.com', '')}/products`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-green-600 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Shopify Products
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ReturnType<typeof useShopifyProducts>['products'][number] }) {
  const image      = product.images?.[0];
  const minPrice   = product.variants.length > 0
    ? Math.min(...product.variants.map(v => parseFloat(v.price || '0')))
    : null;
  const maxPrice   = product.variants.length > 0
    ? Math.max(...product.variants.map(v => parseFloat(v.price || '0')))
    : null;
  const priceLabel = minPrice !== null && maxPrice !== null
    ? minPrice === maxPrice
      ? `₹${minPrice.toFixed(2)}`
      : `₹${minPrice.toFixed(2)} – ₹${maxPrice.toFixed(2)}`
    : '—';

  const totalInventory = product.variants.reduce(
    (sum, v) => sum + (v.inventory_quantity ?? 0), 0
  );

  const tags = product.tags
    ? product.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
      {/* Product image */}
      <div className="aspect-square bg-slate-100 relative overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={image.alt ?? product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-slate-300" />
          </div>
        )}
        {/* Status badge */}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
          product.status === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {product.status}
        </span>
      </div>

      {/* Product info */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-slate-900 text-sm leading-tight">{product.title}</h3>

        {product.vendor && (
          <p className="text-xs text-slate-500">{product.vendor}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800">{priceLabel}</span>
          <span className={`text-xs font-medium ${
            totalInventory === 0 ? 'text-red-500' : 'text-slate-500'
          }`}>
            {totalInventory === 0 ? '0 in stock' : `${totalInventory} in stock`}
          </span>
        </div>

        {product.product_type && (
          <p className="text-xs text-slate-400">{product.product_type}</p>
        )}

        {/* Variants */}
        {product.variants.length > 1 && (
          <p className="text-xs text-slate-400">{product.variants.length} variants</p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
