/**
 * @file FAQManagementPage.tsx
 * @purpose Admin interface for creating, editing, and managing frequently asked questions (FAQs) with categorization and search functionality
 * @created 2024-12-10
 * @modified 2025-08-04
 */

// client/src/pages/admin/FAQManagementPage.tsx
import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus, Edit2, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import axios from 'axios';
import { tokenStorage, apiUtils } from '../../utils/auth';

/**
 * FAQ data structure
 * @interface FAQ
 * @property {string} _id - Unique identifier
 * @property {string} category - FAQ category (Allgemein, Registrierung, etc.)
 * @property {string} question - FAQ question text (max 500 chars)
 * @property {string} answer - FAQ answer text (max 5000 chars)
 * @property {string[]} keywords - Search keywords for FAQ discovery
 * @property {number} order - Display order priority
 * @property {boolean} isActive - Whether FAQ is publicly visible
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */
interface FAQ {
  _id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Admin FAQ management page component
 * @description Provides full CRUD operations for FAQs with category filtering, keyword search,
 * active/inactive status toggle, and bulk statistics overview
 * @returns {React.FC} FAQ management interface
 * @complexity CRUD operations with real-time search filtering and status management
 */
const FAQManagementPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    category: 'Allgemein',
    question: '',
    answer: '',
    keywords: '',
    isActive: true
  });
  const [errors, setErrors] = useState<any>({});

  const categories = ['Allgemein', 'Registrierung', 'Buchungen', 'Zahlungen', 'Produkte', 'Support'];

  useEffect(() => {
    fetchFAQs();
  }, []);

  /**
   * Fetches all FAQs from the admin API endpoint
   * @description Retrieves complete FAQ list with all metadata for admin management
   * @async
   * @returns {Promise<void>} Updates component state with fetched FAQs
   */
  const fetchFAQs = async () => {
    try {
      const token = tokenStorage.getToken('ADMIN');
      const apiUrl = apiUtils.getApiUrl();
      const response = await axios.get(`${apiUrl}/faqs/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setFaqs(response.data.faqs);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      alert('Fehler beim Laden der FAQs');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles FAQ form submission for create/update operations
   * @description Validates form data, processes keywords, and sends to appropriate API endpoint
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>} Creates/updates FAQ and refreshes list on success
   * @complexity Validation logic for character limits and required fields
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: any = {};
    if (!formData.question.trim()) newErrors.question = 'Frage ist erforderlich';
    if (!formData.answer.trim()) newErrors.answer = 'Antwort ist erforderlich';
    if (formData.question.length > 500) newErrors.question = 'Frage darf maximal 500 Zeichen lang sein';
    if (formData.answer.length > 5000) newErrors.answer = 'Antwort darf maximal 5000 Zeichen lang sein';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const token = tokenStorage.getToken('ADMIN');
      const apiUrl = apiUtils.getApiUrl();
      
      const data = {
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k)
      };

      if (editingFAQ) {
        // Update existing FAQ
        const response = await axios.put(
          `${apiUrl}/faqs/${editingFAQ._id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          alert('FAQ erfolgreich aktualisiert');
          fetchFAQs();
          closeModal();
        }
      } else {
        // Create new FAQ
        const response = await axios.post(
          `${apiUrl}/faqs`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          alert('FAQ erfolgreich erstellt');
          fetchFAQs();
          closeModal();
        }
      }
    } catch (error: any) {
      console.error('Error saving FAQ:', error);
      alert(error.response?.data?.message || 'Fehler beim Speichern der FAQ');
    }
  };

  /**
   * Deletes an FAQ after user confirmation
   * @description Shows confirmation dialog before permanently removing FAQ
   * @param {string} id - FAQ ID to delete
   * @returns {Promise<void>} Deletes FAQ and refreshes list on success
   */
  const handleDelete = async (id: string) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diese FAQ löschen möchten?')) {
      return;
    }

    try {
      const token = tokenStorage.getToken('ADMIN');
      const apiUrl = apiUtils.getApiUrl();
      
      const response = await axios.delete(`${apiUrl}/faqs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        alert('FAQ erfolgreich gelöscht');
        fetchFAQs();
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      alert('Fehler beim Löschen der FAQ');
    }
  };

  /**
   * Toggles FAQ active/inactive status
   * @description Switches FAQ visibility without requiring full edit
   * @param {string} id - FAQ ID to toggle
   * @returns {Promise<void>} Updates status and refreshes list
   */
  const toggleActive = async (id: string) => {
    try {
      const token = tokenStorage.getToken('ADMIN');
      const apiUrl = apiUtils.getApiUrl();
      
      const response = await axios.patch(
        `${apiUrl}/faqs/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        fetchFAQs();
      }
    } catch (error) {
      console.error('Error toggling FAQ status:', error);
      alert('Fehler beim Ändern des FAQ-Status');
    }
  };

  /**
   * Opens modal for creating new FAQ or editing existing one
   * @description Prepares form state based on whether creating or editing
   * @param {FAQ} [faq] - Optional FAQ object for editing mode
   * @returns {void} Shows modal with appropriate form state
   */
  const openModal = (faq?: FAQ) => {
    if (faq) {
      setEditingFAQ(faq);
      setFormData({
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords.join(', '),
        isActive: faq.isActive
      });
    } else {
      setEditingFAQ(null);
      setFormData({
        category: 'Allgemein',
        question: '',
        answer: '',
        keywords: '',
        isActive: true
      });
    }
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFAQ(null);
    setFormData({
      category: 'Allgemein',
      question: '',
      answer: '',
      keywords: '',
      isActive: true
    });
    setErrors({});
  };

  /**
   * Filters FAQs based on selected category and search term
   * @description Searches in question, answer, and keywords fields
   * @returns {FAQ[]} Filtered FAQ array
   * @complexity Multi-field search with case-insensitive matching
   */
  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchTerm === '' ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <HelpCircle className="w-8 h-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-secondary">FAQ-Verwaltung</h1>
          </div>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Neue FAQ
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Suche in Fragen, Antworten oder Keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Alle Kategorien</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-secondary">{faqs.length}</div>
            <div className="text-gray-600">Gesamt FAQs</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-green-600">
              {faqs.filter(f => f.isActive).length}
            </div>
            <div className="text-gray-600">Aktive FAQs</div>
          </div>
          <div className="bg-gray-50 rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-gray-600">
              {faqs.filter(f => !f.isActive).length}
            </div>
            <div className="text-gray-600">Inaktive FAQs</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-blue-600">{categories.length}</div>
            <div className="text-gray-600">Kategorien</div>
          </div>
        </div>

        {/* FAQ List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-secondary mb-4">
              FAQ-Liste ({filteredFAQs.length} Einträge)
            </h2>
            
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Keine FAQs gefunden
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFAQs.map((faq) => (
                  <div
                    key={faq._id}
                    className={`border rounded-lg p-4 ${
                      faq.isActive ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded mr-3 ${
                            faq.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {faq.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                            {faq.category}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-secondary mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-gray-600 mb-2 line-clamp-2">
                          {faq.answer}
                        </p>
                        {faq.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {faq.keywords.map((keyword, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          Erstellt: {new Date(faq.createdAt).toLocaleDateString('de-DE')}
                          {faq.updatedAt !== faq.createdAt && (
                            <span className="ml-3">
                              Aktualisiert: {new Date(faq.updatedAt).toLocaleDateString('de-DE')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleActive(faq._id)}
                          className={`p-2 rounded-lg transition-colors ${
                            faq.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title={faq.isActive ? 'Deaktivieren' : 'Aktivieren'}
                        >
                          {faq.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openModal(faq)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(faq._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-secondary mb-6">
                  {editingFAQ ? 'FAQ bearbeiten' : 'Neue FAQ erstellen'}
                </h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategorie *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Question */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Frage * (max. 500 Zeichen)
                      </label>
                      <input
                        type="text"
                        value={formData.question}
                        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                          errors.question ? 'border-red-500' : 'border-gray-300'
                        }`}
                        maxLength={500}
                      />
                      {errors.question && (
                        <p className="mt-1 text-sm text-red-600">{errors.question}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        {formData.question.length}/500 Zeichen
                      </p>
                    </div>
                    
                    {/* Answer */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Antwort * (max. 5000 Zeichen)
                      </label>
                      <textarea
                        value={formData.answer}
                        onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                          errors.answer ? 'border-red-500' : 'border-gray-300'
                        }`}
                        rows={6}
                        maxLength={5000}
                      />
                      {errors.answer && (
                        <p className="mt-1 text-sm text-red-600">{errors.answer}</p>
                      )}
                      <p className="mt-1 text-sm text-gray-500">
                        {formData.answer.length}/5000 Zeichen
                      </p>
                    </div>
                    
                    {/* Keywords */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Keywords (kommagetrennt)
                      </label>
                      <input
                        type="text"
                        value={formData.keywords}
                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="z.B. registrierung, anmeldung, konto"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Helfen bei der Suche nach dieser FAQ
                      </p>
                    </div>
                    
                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                        FAQ ist aktiv und sichtbar
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {editingFAQ ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default FAQManagementPage;