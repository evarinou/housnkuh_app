/**
 * @file TagsPage.tsx
 * @purpose Admin interface for managing tags used across the platform for categorizing products, certifications, methods and features
 * @created 2024-12-08
 * @modified 2025-08-04
 */

// client/src/pages/admin/TagsPage.tsx
import React, { useState, useEffect } from 'react';
import { Tag, Search, Filter, Edit, Trash2, Plus, CheckCircle, AlertCircle, XCircle, Save, X } from 'lucide-react';
import axios from 'axios';

/**
 * Tag data structure
 * @interface TagData
 * @property {string} _id - Unique identifier
 * @property {string} name - Display name of the tag
 * @property {string} slug - URL-friendly version of the name
 * @property {string} [description] - Optional description of the tag
 * @property {'product' | 'certification' | 'method' | 'feature'} category - Tag category type
 * @property {string} [color] - Hex color for tag display
 * @property {string} [icon] - Optional emoji icon for visual representation
 * @property {boolean} isActive - Whether the tag is currently active
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */
interface TagData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  category: 'product' | 'certification' | 'method' | 'feature';
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Form data structure for creating/editing tags
 * @interface TagFormData
 */
interface TagFormData {
  name: string;
  description: string;
  category: 'product' | 'certification' | 'method' | 'feature';
  color: string;
  icon: string;
  isActive: boolean;
}

/**
 * Admin tag management page component
 * @description Provides comprehensive tag management with categorization, visual customization (color/icon),
 * filtering by category/status/search, and real-time preview of tag appearance
 * @returns {React.FC} Tag management interface with CRUD operations
 * @complexity Full CRUD with advanced filtering, visual customization, and status management
 */
const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<TagData[]>([]);
  const [filteredTags, setFilteredTags] = useState<TagData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'product' | 'certification' | 'method' | 'feature'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentTag, setCurrentTag] = useState<TagData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    description: '',
    category: 'product',
    color: '#6B7280',
    icon: '',
    isActive: true
  });

  /**
   * Shows temporary notification message
   * @param {'success' | 'error'} type - Notification type
   * @param {string} message - Message to display
   * @returns {void} Sets notification state with auto-dismiss
   */
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  /**
   * Loads all tags from the API
   * @description Fetches complete tag list with all metadata
   * @async
   * @returns {Promise<void>} Updates component state with tags
   */
  const loadTags = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      
      const response = await axios.get(`${apiUrl}/tags`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setTags(response.data.data || []);
      } else {
        setError('Fehler beim Laden der Tags');
      }
    } catch (err) {
      console.error('Error loading tags:', err);
      setError('Fehler beim Laden der Tags');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  // Filter tags
  useEffect(() => {
    let filtered = tags;

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(tag => 
        tag.name.toLowerCase().includes(searchLower) ||
        tag.description?.toLowerCase().includes(searchLower) ||
        tag.slug.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tag => tag.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tag => 
        statusFilter === 'active' ? tag.isActive : !tag.isActive
      );
    }

    setFilteredTags(filtered);
  }, [tags, searchTerm, categoryFilter, statusFilter]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'product',
      color: '#6B7280',
      icon: '',
      isActive: true
    });
    setCurrentTag(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Open edit modal
  const openEditModal = (tag: TagData) => {
    setCurrentTag(tag);
    setFormData({
      name: tag.name,
      description: tag.description || '',
      category: tag.category,
      color: tag.color || '#6B7280',
      icon: tag.icon || '',
      isActive: tag.isActive
    });
    setShowEditModal(true);
  };

  // Close modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    resetForm();
  };

  /**
   * Handles tag form submission for create/update operations
   * @description Validates and submits tag data to appropriate endpoint
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>} Creates/updates tag and refreshes list
   * @complexity Handles both creation and update with proper error handling
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      
      if (currentTag) {
        // Update existing tag
        const response = await axios.put(`${apiUrl}/tags/${currentTag._id}`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          showNotification('success', 'Tag erfolgreich aktualisiert');
          loadTags();
          closeModals();
        } else {
          showNotification('error', response.data.message || 'Fehler beim Aktualisieren des Tags');
        }
      } else {
        // Create new tag
        const response = await axios.post(`${apiUrl}/tags`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data.success) {
          showNotification('success', 'Tag erfolgreich erstellt');
          loadTags();
          closeModals();
        } else {
          showNotification('error', response.data.message || 'Fehler beim Erstellen des Tags');
        }
      }
    } catch (err) {
      console.error('Error submitting tag:', err);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        showNotification('error', err.response.data.message);
      } else {
        showNotification('error', 'Ein Serverfehler ist aufgetreten');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Toggles tag active/inactive status
   * @description Quick status toggle without full edit form
   * @param {TagData} tag - Tag to toggle
   * @returns {Promise<void>} Updates status and refreshes list
   */
  const toggleTagStatus = async (tag: TagData) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      
      const response = await axios.put(`${apiUrl}/tags/${tag._id}`, {
        ...tag,
        isActive: !tag.isActive
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        showNotification('success', `Tag ${tag.isActive ? 'deaktiviert' : 'aktiviert'}`);
        loadTags();
      } else {
        showNotification('error', 'Fehler beim Ändern des Tag-Status');
      }
    } catch (err) {
      console.error('Error toggling tag status:', err);
      showNotification('error', 'Fehler beim Ändern des Tag-Status');
    }
  };

  /**
   * Deletes a tag after user confirmation
   * @description Shows confirmation dialog before permanent deletion
   * @param {TagData} tag - Tag to delete
   * @returns {Promise<void>} Deletes tag and refreshes list
   */
  const deleteTag = async (tag: TagData) => {
    if (!window.confirm(`Sind Sie sicher, dass Sie den Tag "${tag.name}" löschen möchten?`)) {
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const token = localStorage.getItem('adminToken');
      
      const response = await axios.delete(`${apiUrl}/tags/${tag._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        showNotification('success', 'Tag erfolgreich gelöscht');
        loadTags();
      } else {
        showNotification('error', 'Fehler beim Löschen des Tags');
      }
    } catch (err) {
      console.error('Error deleting tag:', err);
      showNotification('error', 'Fehler beim Löschen des Tags');
    }
  };

  /**
   * Gets localized label for tag category
   * @param {string} category - Category key
   * @returns {string} German label for category
   */
  const getCategoryLabel = (category: string) => {
    const labels = {
      'product': 'Produkt',
      'certification': 'Zertifizierung',
      'method': 'Methode',
      'feature': 'Feature'
    };
    return labels[category as keyof typeof labels] || category;
  };

  /**
   * Gets color classes for tag category
   * @param {string} category - Category key
   * @returns {string} Tailwind CSS classes for category styling
   */
  const getCategoryColor = (category: string) => {
    const colors = {
      'product': 'bg-green-100 text-green-800',
      'certification': 'bg-blue-100 text-blue-800',
      'method': 'bg-purple-100 text-purple-800',
      'feature': 'bg-orange-100 text-orange-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Tag className="mr-2 h-6 w-6 text-primary" />
            Tag-Verwaltung
          </h1>
          <p className="text-gray-600 mt-1">
            Verwalten Sie die Tags für Produktkategorien, Zertifizierungen und mehr.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Neuer Tag
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-md flex items-start ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tags durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
            >
              <option value="all">Alle Kategorien</option>
              <option value="product">Produkt</option>
              <option value="certification">Zertifizierung</option>
              <option value="method">Methode</option>
              <option value="feature">Feature</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </div>

          {/* Stats */}
          <div className="text-sm text-gray-600 flex items-center justify-end">
            {filteredTags.length} von {tags.length} Tags
          </div>
        </div>
      </div>

      {/* Tags Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-gray-600">Tags werden geladen...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Keine Tags gefunden</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beschreibung
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTags.map((tag) => (
                  <tr key={tag._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white mr-3"
                          style={{ backgroundColor: tag.color || '#6B7280' }}
                        >
                          {tag.icon && <span className="mr-1">{tag.icon}</span>}
                          {tag.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(tag.category)}`}>
                        {getCategoryLabel(tag.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {tag.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleTagStatus(tag)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          tag.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {tag.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktiv
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inaktiv
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tag.createdAt).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(tag)}
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteTag(tag)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {currentTag ? 'Tag bearbeiten' : 'Neuer Tag'}
                </h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    placeholder="z.B. Bio-Äpfel"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategorie *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="product">Produkt</option>
                    <option value="certification">Zertifizierung</option>
                    <option value="method">Methode</option>
                    <option value="feature">Feature</option>
                  </select>
                </div>

                {/* Icon and Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon (Emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="🥕"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Farbe
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="#6B7280"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beschreibung
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={3}
                    placeholder="Beschreibung des Tags..."
                  />
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
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Tag ist aktiv
                  </label>
                </div>

                {/* Preview */}
                {(formData.name || formData.icon) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vorschau:
                    </label>
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: formData.color }}
                    >
                      {formData.icon && <span className="mr-1">{formData.icon}</span>}
                      {formData.name || 'Tag Name'}
                    </span>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Speichern...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {currentTag ? 'Aktualisieren' : 'Erstellen'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
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

export default TagsPage;