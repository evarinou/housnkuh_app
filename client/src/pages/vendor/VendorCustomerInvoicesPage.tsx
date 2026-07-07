/**
 * @file VendorCustomerInvoicesPage.tsx
 * @purpose Zeigt dem Vendor seine Verkaufsrechnungen (Gutschriften, F2a), die
 *          housnkuh in seinem Namen aus den flour.io-Verkäufen erstellt.
 * @created 2025-01-15
 * @modified 2026-07-07
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import VendorLayout from '../../components/vendor/VendorLayout';
import { tokenStorage, apiUtils } from '../../utils/auth';

interface SalesInvoice {
  _id: string;
  invoiceNumber: string;
  issueDate: string;
  salePeriod: { from: string; to: string };
  netTotal: number;
  grossTotal: number;
  status: 'created' | 'sent' | 'cancelled';
  pdfPath?: string;
}

const euro = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
const date = (d: string) =>
  new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));

const statusBadge = (status: SalesInvoice['status']) => {
  const map: Record<SalesInvoice['status'], { label: string; cls: string }> = {
    created: { label: 'Erstellt', cls: 'bg-blue-100 text-blue-800' },
    sent: { label: 'Versendet', cls: 'bg-green-100 text-green-800' },
    cancelled: { label: 'Storniert', cls: 'bg-gray-100 text-gray-600' }
  };
  const c = map[status] || map.created;
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.cls}`}>{c.label}</span>;
};

const VendorCustomerInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = tokenStorage.getToken('VENDOR');
      const res = await fetch(`${apiUtils.getApiUrl()}/vendor-auth/sales-invoices?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Verkaufsrechnungen');
      const json = await res.json();
      setInvoices(json.data?.invoices || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDownload = async (inv: SalesInvoice) => {
    try {
      const token = tokenStorage.getToken('VENDOR');
      const res = await fetch(`${apiUtils.getApiUrl()}/vendor-auth/sales-invoices/${inv._id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        alert(res.status === 409 ? 'PDF wird noch erzeugt – bitte später erneut versuchen.' : 'PDF konnte nicht geladen werden.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.invoiceNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('PDF konnte nicht geladen werden.');
    }
  };

  return (
    <VendorLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <FileText className="w-8 h-8 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-secondary">Verkaufsrechnungen</h1>
          </div>
          <p className="text-gray-600">
            Deine Verkaufsrechnungen (Gutschriften), die housnkuh in Deinem Namen
            aus den Kassenverkäufen erstellt. PDF jederzeit herunterladbar.
          </p>
        </div>

        {loading && <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Lade Verkaufsrechnungen…</div>}
        {error && <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>}

        {!loading && !error && invoices.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Es liegen noch keine Verkaufsrechnungen vor. Sobald über die Kasse
            verkauft wird, erscheinen hier automatisch Deine Gutschriften.
          </div>
        )}

        {!loading && !error && invoices.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nummer</th>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Zeitraum</th>
                  <th className="px-4 py-3 text-right">Netto</th>
                  <th className="px-4 py-3 text-right">Brutto</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">{date(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-gray-500">{date(inv.salePeriod.from)} – {date(inv.salePeriod.to)}</td>
                    <td className="px-4 py-3 text-right">{euro(inv.netTotal)}</td>
                    <td className="px-4 py-3 text-right font-medium">{euro(inv.grossTotal)}</td>
                    <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownload(inv)}
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                        title="PDF herunterladen"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </VendorLayout>
  );
};

export default VendorCustomerInvoicesPage;
