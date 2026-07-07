/**
 * @file ProduktePage.tsx
 * @purpose Öffentlicher Produktkatalog für Käufer (F1): produktübergreifende
 *          Suche/Filter über die Produkte aller Direktvermarkter.
 * @created 2026-07-07
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Package } from 'lucide-react';
import { apiUtils } from '../utils/auth';
import { resolveImageUrl } from '../utils/imageUtils';

interface PublicProduct {
  _id: string;
  name: string;
  shortDescription?: string;
  price: number;
  priceUnit?: string;
  availability: string;
  images?: string[];
  vendor: { id: string; name: string; ort?: string } | null;
}

const euro = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

const availabilityLabel: Record<string, { text: string; cls: string }> = {
  available: { text: 'Verfügbar', cls: 'bg-green-100 text-green-800' },
  seasonal: { text: 'Saisonal', cls: 'bg-amber-100 text-amber-800' },
  out_of_stock: { text: 'Ausverkauft', cls: 'bg-gray-100 text-gray-600' },
  preorder: { text: 'Vorbestellung', cls: 'bg-blue-100 text-blue-800' }
};

const ProduktePage: React.FC = () => {
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '48' });
      if (q.trim()) params.set('q', q.trim());
      if (location.trim()) params.set('location', location.trim());
      const res = await fetch(`${apiUtils.getApiUrl()}/public/products?${params}`);
      if (!res.ok) throw new Error('Fehler beim Laden der Produkte');
      const json = await res.json();
      setProducts(json.data?.products || []);
      setTotal(json.data?.pagination?.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [q, location]);

  useEffect(() => { fetchProducts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <Package className="w-8 h-8 text-primary mr-3" />
          <h1 className="text-3xl font-bold text-secondary">Produkte entdecken</h1>
        </div>
        <p className="text-gray-600">
          Durchsuche die Produkte aller Direktvermarkter bei housnkuh.
        </p>
      </div>

      {/* Suche */}
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Produkt suchen (z. B. Apfelsaft, Käse …)"
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="relative sm:w-64">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Ort"
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-md hover:opacity-90 font-medium">
          Suchen
        </button>
      </form>

      {loading && <div className="text-center text-gray-500 py-12">Lade Produkte…</div>}
      {error && <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>}

      {!loading && !error && (
        <>
          <p className="text-sm text-gray-500 mb-4">{total} Produkte gefunden</p>
          {products.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              Keine Produkte gefunden. Versuche einen anderen Suchbegriff.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(p => {
                const avail = availabilityLabel[p.availability] || availabilityLabel.available;
                const img = p.images?.[0] ? resolveImageUrl(p.images[0]) : '';
                return (
                  <div key={p._id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="h-40 bg-gray-100 flex items-center justify-center">
                      {img
                        ? <img src={img} alt={p.name} className="w-full h-full object-cover" />
                        : <Package className="w-10 h-10 text-gray-300" />}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-secondary">{p.name}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${avail.cls}`}>{avail.text}</span>
                      </div>
                      {p.shortDescription && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{p.shortDescription}</p>}
                      <div className="mt-auto pt-2">
                        <div className="text-lg font-bold text-primary">
                          {euro(p.price)}{p.priceUnit ? <span className="text-sm font-normal text-gray-500"> / {p.priceUnit}</span> : null}
                        </div>
                        {p.vendor && (
                          <Link to={`/direktvermarkter/${p.vendor.id}`} className="text-sm text-gray-600 hover:text-primary">
                            {p.vendor.name}{p.vendor.ort ? ` · ${p.vendor.ort}` : ''}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProduktePage;
