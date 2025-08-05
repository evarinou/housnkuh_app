/**
 * @file EmailTemplatesPage.tsx
 * @purpose Admin interface for managing email templates with editing, preview, and testing capabilities
 * @created 2024-12-05
 * @modified 2025-08-04
 */

import React, { useState, useEffect } from 'react';
import { Edit3, Eye, Send, Filter, Search, Plus, Trash2 } from 'lucide-react';
import { sanitizeHtml } from '../../utils/sanitization';
import { tokenStorage, apiUtils } from '../../utils/auth';

/**
 * Email template data structure
 * @interface EmailTemplate
 * @property {string} _id - Unique identifier
 * @property {string} templateId - Template identifier string
 * @property {string} name - Display name of the template
 * @property {string} type - Template type for categorization
 * @property {string} subject - Email subject line
 * @property {string} [htmlBody] - Optional HTML email body
 * @property {string} [textBody] - Optional plain text email body
 * @property {string[]} [variables] - Optional template variables list
 * @property {string} [description] - Optional template description
 * @property {boolean} isActive - Whether template is currently active
 * @property {number} version - Template version number
 * @property {string} lastModified - Last modification timestamp
 * @property {string} [modifiedBy] - Optional user who last modified
 * @property {'vendor' | 'admin' | 'system' | 'notification'} category - Template category
 */
interface EmailTemplate {
  _id: string;
  templateId: string;
  name: string;
  type: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  variables?: string[];
  description?: string;
  isActive: boolean;
  version: number;
  lastModified: string;
  modifiedBy?: string;
  category: 'vendor' | 'admin' | 'system' | 'notification';
}

/**
 * Template variable definition structure
 * @interface TemplateVariable
 * @property {string} name - Variable name
 * @property {string} description - Variable description
 * @property {string} example - Example usage
 */
interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

/**
 * Admin email templates management page
 * @description Comprehensive email template management with editing, preview, testing capabilities,
 * category filtering, search functionality, template variable support, and test email sending
 * @returns {React.FC} Email templates management interface
 * @complexity Advanced template editor with real-time preview, variable injection, and testing workflow
 */
const EmailTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter und Suche
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Editor State
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  // Test Email State
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);

  // Template Variables
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, categoryFilter, activeFilter]);

  /**
   * Fetches all email templates from the API
   * @description Retrieves complete template list with metadata for admin management
   * @async
   * @returns {Promise<void>} Updates component state with templates
   */
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/email-templates', {
        headers: {
          'Authorization': `Bearer ${tokenStorage.getToken('ADMIN')}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Templates');
      }

      const data = await response.json();
      setTemplates(data.data || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filters templates based on search term, category, and active status
   * @description Applies multiple filter criteria to template list for enhanced searchability
   * @returns {void} Updates filteredTemplates state
   * @complexity Multi-field filtering with case-insensitive search
   */
  const filterTemplates = () => {
    let filtered = templates;

    // Suche
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.templateId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Kategorie Filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => template.category === categoryFilter);
    }

    // Active Filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(template => 
        activeFilter === 'active' ? template.isActive : !template.isActive
      );
    }

    setFilteredTemplates(filtered);
  };

  /**
   * Loads detailed template data for editing
   * @description Fetches complete template including HTML/text bodies and variables
   * @param {string} templateId - Template ID to load
   * @returns {Promise<EmailTemplate | null>} Full template data or null on error
   */
  const loadTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${tokenStorage.getToken('ADMIN')}`
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden des Templates');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Laden');
      return null;
    }
  };

  /**
   * Opens template editor with full template data
   * @description Loads complete template data and initializes editor state with variables
   * @param {EmailTemplate} template - Template to edit
   * @returns {Promise<void>} Opens editor modal with template data
   * @complexity Loads template details and associated variables for editing context
   */
  const openEditor = async (template: EmailTemplate) => {
    const fullTemplate = await loadTemplate(template._id);
    if (fullTemplate) {
      setEditingTemplate(fullTemplate);
      setSelectedTemplate(fullTemplate);
      setShowEditor(true);
      
      // Lade verfügbare Variablen für diesen Template-Typ
      await loadTemplateVariables(fullTemplate.type);
    }
  };

  /**
   * Loads available variables for a specific template type
   * @description Fetches template-specific variables for editor reference
   * @param {string} templateType - Type of template to get variables for
   * @returns {Promise<void>} Updates templateVariables state
   */
  const loadTemplateVariables = async (templateType: string) => {
    try {
      const response = await fetch(`/api/admin/email-templates/variables/${templateType}`, {
        headers: {
          'Authorization': `Bearer ${tokenStorage.getToken('ADMIN')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplateVariables(data.data.variables || []);
      }
    } catch (error) {
      console.error('Error loading template variables:', error);
    }
  };

  /**
   * Saves template changes to the API
   * @description Updates template with user modifications and increments version
   * @returns {Promise<void>} Saves template and refreshes list on success
   * @complexity Updates template fields while preserving system metadata
   */
  const saveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await fetch(`/api/admin/email-templates/${editingTemplate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenStorage.getToken('ADMIN')}`
        },
        body: JSON.stringify({
          subject: editingTemplate.subject,
          htmlBody: editingTemplate.htmlBody,
          textBody: editingTemplate.textBody,
          variables: editingTemplate.variables,
          description: editingTemplate.description,
          isActive: editingTemplate.isActive
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Speichern');
      }

      setShowEditor(false);
      setEditingTemplate(null);
      fetchTemplates(); // Refresh liste
      alert('Template erfolgreich gespeichert!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Speichern');
    }
  };

  /**
   * Generates template preview with sample data
   * @description Renders template with placeholder variables for preview
   * @returns {Promise<void>} Shows preview modal with rendered template
   */
  const previewTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const response = await fetch('/api/admin/email-templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenStorage.getToken('ADMIN')}`
        },
        body: JSON.stringify({
          htmlBody: editingTemplate.htmlBody,
          subject: editingTemplate.subject
        })
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Vorschau');
      }

      const data = await response.json();
      setPreviewData(data.data);
      setShowPreview(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler bei der Vorschau');
    }
  };

  /**
   * Sends test email using selected template
   * @description Sends rendered template to specified test email address
   * @returns {Promise<void>} Sends test email and shows confirmation
   * @complexity Renders template with real data and sends via email service
   */
  const sendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) return;

    try {
      setTestSending(true);
      const response = await fetch('/api/admin/email-templates/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenStorage.getToken('ADMIN')}`
        },
        body: JSON.stringify({
          templateId: selectedTemplate._id,
          testEmail: testEmail
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Versenden der Test-Email');
      }

      alert(`Test-Email erfolgreich an ${testEmail} gesendet!`);
      setShowTestDialog(false);
      setTestEmail('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Fehler beim Versenden');
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Lade Email-Templates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filter und Suche */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Alle Kategorien</option>
            <option value="vendor">Vendor</option>
            <option value="admin">Admin</option>
            <option value="system">System</option>
            <option value="notification">Benachrichtigung</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Alle Status</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>

          <div className="text-sm text-gray-600 self-center">
            {filteredTemplates.length} von {templates.length} Templates
          </div>
        </div>
      </div>

      {/* Templates Liste */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Template
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kategorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Letzte Änderung
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTemplates.map((template) => (
              <tr key={template._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{template.name}</div>
                  <div className="text-sm text-gray-500">{template.templateId}</div>
                  <div className="text-xs text-gray-400 mt-1">{template.subject}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    template.category === 'vendor' ? 'bg-blue-100 text-blue-800' :
                    template.category === 'admin' ? 'bg-purple-100 text-purple-800' :
                    template.category === 'system' ? 'bg-gray-100 text-gray-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {template.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    template.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {template.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div>{new Date(template.lastModified).toLocaleDateString('de-DE')}</div>
                  {template.modifiedBy && (
                    <div className="text-xs text-gray-400">von {template.modifiedBy}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => openEditor(template)}
                    className="text-primary hover:text-primary-dark"
                    title="Bearbeiten"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowTestDialog(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                    title="Test-Email senden"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">Keine Templates gefunden</div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Email Template bearbeiten</h2>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                {/* Template Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template ID
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.templateId}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Betreff
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* HTML Body */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTML Template
                  </label>
                  <textarea
                    value={editingTemplate.htmlBody || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlBody: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    value={editingTemplate.description || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isActive}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Template ist aktiv
                  </label>
                </div>

                {/* Verfügbare Variablen */}
                {templateVariables.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Verfügbare Variablen:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {templateVariables.map((variable, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded">
                          <code className="text-blue-600">{`{{${variable.name}}}`}</code>
                          <div className="text-gray-600">{variable.description}</div>
                          <div className="text-gray-500">Beispiel: {variable.example}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center p-6 border-t bg-gray-50">
              <button
                onClick={previewTemplate}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 flex items-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                Vorschau
              </button>
              
              <div className="space-x-3">
                <button
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveTemplate}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Template Vorschau</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Betreff:</h3>
                  <div className="bg-gray-50 p-3 rounded border">{previewData.subject}</div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Email Inhalt:</h3>
                  <div 
                    className="border rounded p-4 bg-white"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewData.htmlBody) }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Email Dialog */}
      {showTestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Test-Email senden</h2>
              <button
                onClick={() => setShowTestDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email-Adresse
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                {selectedTemplate && (
                  <div className="text-sm text-gray-600">
                    Template: <strong>{selectedTemplate.name}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowTestDialog(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={testSending}
              >
                Abbrechen
              </button>
              <button
                onClick={sendTestEmail}
                disabled={!testEmail || testSending}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {testSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sende...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Senden
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesPage;