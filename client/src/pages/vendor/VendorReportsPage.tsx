/**
 * @file VendorReportsPage.tsx
 * @purpose Verkaufs-Reporting des Vendors (F3): Gesamtsummen, Monatsverlauf und
 *          Top-Produkte aus dem Verkaufs-Ledger (flour.io-Kassenverkäufe).
 * @created 2025-01-15
 * @modified 2026-07-07
 */
import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, TrendingUp, ShoppingBag } from 'lucide-react';
import VendorLayout from '../../components/vendor/VendorLayout';
import { tokenStorage, apiUtils } from '../../utils/auth';

interface SalesReport {
  totals: { net: number; gross: number; count: number };
  byMonth: { period: string; net: number; gross: number; count: number }[];
  topProducts: { productId: string; name: string; net: number; qty: number }[];
}

const euro = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

const VendorReportsPage: React.FC = () => {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = tokenStorage.getToken('VENDOR');
      const res = await fetch(`${apiUtils.getApiUrl()}/vendor-auth/sales-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden des Reports');
      const json = await res.json();
      setReport(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const maxMonthNet = report?.byMonth.reduce((m, x) => Math.max(m, x.net), 0) || 0;

  return (
    <VendorLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-8 h-8 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-secondary">Verkaufsberichte</h1>
          </div>
          <p className="text-gray-600">
            Deine Verkäufe aus der Kasse — Umsatz, Monatsverlauf und meistverkaufte Produkte.
          </p>
        </div>

        {loading && <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Lade Bericht…</div>}
        {error && <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>}

        {!loading && !error && report && (
          <div className="space-y-8">
            {/* Kennzahlen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center text-gray-500 mb-2"><TrendingUp className="w-5 h-5 mr-2" />Netto-Umsatz</div>
                <div className="text-2xl font-bold text-secondary">{euro(report.totals.net)}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center text-gray-500 mb-2"><TrendingUp className="w-5 h-5 mr-2" />Brutto-Umsatz</div>
                <div className="text-2xl font-bold text-secondary">{euro(report.totals.gross)}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center text-gray-500 mb-2"><ShoppingBag className="w-5 h-5 mr-2" />Verkäufe</div>
                <div className="text-2xl font-bold text-secondary">{report.totals.count}</div>
              </div>
            </div>

            {/* Monatsverlauf */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-secondary mb-4">Monatsverlauf (Netto)</h2>
              {report.byMonth.length === 0 ? (
                <p className="text-gray-500">Noch keine Verkäufe erfasst.</p>
              ) : (
                <div className="space-y-2">
                  {report.byMonth.map(m => (
                    <div key={m.period} className="flex items-center gap-3">
                      <div className="w-20 text-sm text-gray-500">{m.period}</div>
                      <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-5"
                          style={{ width: maxMonthNet ? `${(m.net / maxMonthNet) * 100}%` : '0%' }}
                        />
                      </div>
                      <div className="w-28 text-right text-sm font-medium">{euro(m.net)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top-Produkte */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-secondary mb-4">Top-Produkte (Netto)</h2>
              {report.topProducts.length === 0 ? (
                <p className="text-gray-500">Noch keine Verkäufe erfasst.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left py-2">Produkt</th>
                      <th className="text-right py-2">Menge</th>
                      <th className="text-right py-2">Netto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.topProducts.map(p => (
                      <tr key={p.productId}>
                        <td className="py-2">{p.name}</td>
                        <td className="py-2 text-right">{p.qty}</td>
                        <td className="py-2 text-right font-medium">{euro(p.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorReportsPage;
