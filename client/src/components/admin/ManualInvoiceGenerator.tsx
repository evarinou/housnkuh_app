/**
 * @file ManualInvoiceGenerator.tsx
 * @purpose Component for manually triggering invoice generation for specific vendors or all
 * @created 2025-09-16
 * @modified 2025-09-16
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader,
  ChevronDown,
  X
} from 'lucide-react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { apiUtils, tokenStorage } from '../../utils/auth';

interface Vendor {
  _id: string;
  kontakt: {
    name: string;
    email: string;
  };
  isActive: boolean;
  lastInvoiceDate?: string;
}

interface GenerationResult {
  success: boolean;
  invoicesGenerated?: number;
  errors?: string[];
  message?: string;
}

interface ManualInvoiceGeneratorProps {
  onGenerationComplete?: () => void;
  className?: string;
}

const MONTHS = [
  { value: 1, label: 'Januar' },
  { value: 2, label: 'Februar' },
  { value: 3, label: 'März' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Dezember' }
];

const YEARS = [2024, 2025, 2026];

const ManualInvoiceGenerator: React.FC<ManualInvoiceGeneratorProps> = ({
  onGenerationComplete,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [affectedVendorsCount, setAffectedVendorsCount] = useState<number>(0);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedVendor === 'all') {
      setAffectedVendorsCount(vendors.filter(v => v.isActive).length);
    } else {
      setAffectedVendorsCount(1);
    }
  }, [selectedVendor, vendors]);

  const fetchVendors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${apiUtils.getApiUrl()}/vendors`, {
        headers: {
          Authorization: `Bearer ${tokenStorage.getToken('ADMIN')}`
        }
      });
      setVendors(response.data.filter((vendor: Vendor) => vendor.isActive));
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setError('Fehler beim Laden der Anbieter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setIsOpen(true);
    setGenerationResult(null);
    setError(null);
    setShowConfirmation(false);
  };

  const handleCloseDialog = () => {
    if (!isGenerating) {
      setIsOpen(false);
      setSelectedVendor('all');
      setShowConfirmation(false);
      setGenerationResult(null);
      setError(null);
    }
  };

  const handlePreview = () => {
    setShowConfirmation(true);
  };

  const handleConfirmGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      const payload = {
        month: selectedMonth,
        year: selectedYear,
        ...(selectedVendor !== 'all' && { vendorId: selectedVendor })
      };

      const response = await axios.post(`${apiUtils.getApiUrl()}/invoices/generate`, payload, {
        headers: {
          Authorization: `Bearer ${tokenStorage.getToken('ADMIN')}`,
          'Content-Type': 'application/json'
        }
      });

      setGenerationResult(response.data);

      if (response.data.success) {
        setTimeout(() => {
          if (onGenerationComplete) {
            onGenerationComplete();
          }
          handleCloseDialog();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error generating invoices:', err);
      setError(err.response?.data?.message || 'Fehler bei der Rechnungsgenerierung');
      setGenerationResult({
        success: false,
        message: err.response?.data?.message || 'Fehler bei der Rechnungsgenerierung'
      });
    } finally {
      setIsGenerating(false);
      setShowConfirmation(false);
    }
  };

  const getSelectedVendorName = () => {
    if (selectedVendor === 'all') return 'Alle Anbieter';
    const vendor = vendors.find(v => v._id === selectedVendor);
    return vendor ? vendor.kontakt.name : 'Anbieter auswählen';
  };

  const getSelectedMonthName = () => {
    const month = MONTHS.find(m => m.value === selectedMonth);
    return month ? month.label : '';
  };

  return (
    <>
      <button
        onClick={handleOpenDialog}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
      >
        <FileText className="w-4 h-4" />
        Rechnungen generieren
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader className="relative">
              <CardTitle className="text-xl">Manuelle Rechnungsgenerierung</CardTitle>
              <button
                onClick={handleCloseDialog}
                disabled={isGenerating}
                className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>

            <CardContent className="space-y-6">
              {!showConfirmation && !generationResult && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        Anbieter auswählen
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setVendorDropdownOpen(!vendorDropdownOpen)}
                          disabled={isLoading}
                          className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <span className="flex items-center justify-between">
                            {isLoading ? 'Lade Anbieter...' : getSelectedVendorName()}
                            <ChevronDown className="w-4 h-4" />
                          </span>
                        </button>

                        {vendorDropdownOpen && !isLoading && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                            <button
                              onClick={() => {
                                setSelectedVendor('all');
                                setVendorDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 font-medium"
                            >
                              Alle Anbieter ({vendors.filter(v => v.isActive).length})
                            </button>
                            <div className="border-t border-gray-200" />
                            {vendors.map(vendor => (
                              <button
                                key={vendor._id}
                                onClick={() => {
                                  setSelectedVendor(vendor._id);
                                  setVendorDropdownOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100"
                              >
                                {vendor.kontakt.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Monat
                        </label>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {MONTHS.map(month => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Jahr
                        </label>
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {YEARS.map(year => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-blue-900">Vorschau</p>
                          <p className="text-blue-700 mt-1">
                            Es werden Rechnungen für <strong>{affectedVendorsCount}</strong> Anbieter
                            für <strong>{getSelectedMonthName()} {selectedYear}</strong> generiert.
                          </p>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div className="text-sm text-red-700">{error}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCloseDialog}
                      disabled={isGenerating}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handlePreview}
                      disabled={isLoading || isGenerating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Weiter zur Bestätigung
                    </button>
                  </div>
                </>
              )}

              {showConfirmation && !generationResult && (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-900">Bestätigung erforderlich</p>
                        <p className="text-amber-700 mt-2">
                          Sie sind dabei, <strong>{affectedVendorsCount}</strong> Rechnungen für{' '}
                          <strong>{getSelectedMonthName()} {selectedYear}</strong> zu generieren.
                        </p>
                        <p className="text-amber-700 mt-1">
                          {selectedVendor === 'all'
                            ? 'Dies betrifft alle aktiven Anbieter.'
                            : `Dies betrifft: ${getSelectedVendorName()}`}
                        </p>
                        <p className="text-amber-700 mt-2 font-medium">
                          Möchten Sie fortfahren?
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowConfirmation(false)}
                      disabled={isGenerating}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Zurück
                    </button>
                    <button
                      onClick={handleConfirmGeneration}
                      disabled={isGenerating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Generiere Rechnungen...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Rechnungen generieren
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {generationResult && (
                <>
                  <div className={`border rounded-lg p-4 ${
                    generationResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      {generationResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="text-sm">
                        <p className={`font-medium ${
                          generationResult.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {generationResult.success
                            ? 'Rechnungen erfolgreich generiert!'
                            : 'Fehler bei der Generierung'}
                        </p>
                        <p className={`mt-1 ${
                          generationResult.success ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {generationResult.message}
                        </p>
                        {generationResult.invoicesGenerated !== undefined && (
                          <p className="mt-2 text-green-700">
                            <strong>{generationResult.invoicesGenerated}</strong> Rechnungen wurden erstellt.
                          </p>
                        )}
                        {generationResult.errors && generationResult.errors.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium text-red-700">Fehler:</p>
                            <ul className="list-disc list-inside text-red-600">
                              {generationResult.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleCloseDialog}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default ManualInvoiceGenerator;