// client/src/pages/FAQPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, Phone, Mail } from 'lucide-react';
import axios from 'axios';

interface FAQItem {
  _id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  order?: number;
}

const FAQPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFAQs = useCallback(async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.get(`${apiUrl}/faqs/public`);
      
      if (response.data.success) {
        setFaqItems(response.data.faqs);
      }
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      // Fallback to default FAQs if API fails
      setFaqItems(getDefaultFAQs());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  // Fallback FAQs for when database is empty or API fails
  const getDefaultFAQs = (): FAQItem[] => [
    // Allgemeine Fragen
    {
      _id: 'general-1',
      category: 'Allgemein',
      question: 'Was ist housnkuh und wie funktioniert die Plattform?',
      answer: 'housnkuh ist eine Online-Plattform, die regionale Direktvermarkter mit Endkunden verbindet. Direktvermarkter können sich registrieren, ihr Profil erstellen und Verkaufsflächen an verschiedenen Standorten buchen. Kunden finden über die Plattform lokale Anbieter und deren Produkte in ihrer Nähe.',
      keywords: ['plattform', 'funktionsweise', 'direktvermarkter', 'kunden']
    },
    {
      _id: 'general-2',
      category: 'Allgemein',
      question: 'Für wen ist housnkuh geeignet?',
      answer: 'housnkuh richtet sich an regionale Direktvermarkter (Landwirte, Imker, Winzer, etc.) sowie an Endkunden, die frische, regionale Produkte direkt vom Erzeuger kaufen möchten. Die Plattform eignet sich besonders für kleinere und mittlere Betriebe, die ihre Reichweite erhöhen möchten.',
      keywords: ['zielgruppe', 'landwirte', 'imker', 'winzer', 'regional']
    },
    {
      _id: 'general-3',
      category: 'Allgemein',
      question: 'In welchen Regionen ist housnkuh verfügbar?',
      answer: 'housnkuh startet zunächst in ausgewählten Regionen Deutschlands und wird sukzessive auf weitere Gebiete ausgedehnt. Aktuelle Verfügbarkeit und geplante Erweiterungen finden Sie auf unserer Standorte-Seite oder kontaktieren Sie uns direkt.',
      keywords: ['regionen', 'verfügbarkeit', 'deutschland', 'standorte']
    },

    // Registrierung und Account
    {
      _id: 'account-1',
      category: 'Registrierung',
      question: 'Wie kann ich mich als Direktvermarkter registrieren?',
      answer: 'Klicken Sie auf "Jetzt registrieren" und wählen Sie "Als Direktvermarkter". Füllen Sie das Formular mit Ihren Betriebsdaten aus. Nach der E-Mail-Bestätigung können Sie sofort mit dem kostenlosen Probemonat beginnen und Ihr Profil vervollständigen.',
      keywords: ['registrierung', 'anmeldung', 'direktvermarkter', 'probemonat']
    },
    {
      _id: 'account-2',
      category: 'Registrierung',
      question: 'Was kostet die Nutzung von housnkuh?',
      answer: 'Der erste Monat ist für Direktvermarkter vollständig kostenlos. Danach fallen monatliche Gebühren für gebuchte Verkaufsflächen an. Die genauen Preise werden transparent vor jeder Buchung angezeigt. Für Endkunden ist die Nutzung der Plattform kostenfrei.',
      keywords: ['kosten', 'preise', 'probemonat', 'kostenlos', 'gebühren']
    },
    {
      _id: 'account-3',
      category: 'Registrierung',
      question: 'Kann ich den Probemonat jederzeit kündigen?',
      answer: 'Ja, Sie können Ihr Konto während des kostenlosen Probemonats jederzeit ohne Angabe von Gründen kündigen. Nutzen Sie dafür die Kündigungsfunktion in Ihrem Dashboard oder kontaktieren Sie unseren Support.',
      keywords: ['kündigung', 'probemonat', 'kostenlos', 'dashboard']
    },
    {
      _id: 'account-4',
      category: 'Registrierung',
      question: 'Welche Daten muss ich bei der Registrierung angeben?',
      answer: 'Für die Registrierung benötigen wir Ihre Kontaktdaten (Name, E-Mail, Telefon), Informationen zu Ihrem Betrieb (Firmenname, Adresse, Betriebsart) und eine Beschreibung Ihrer Produkte. Optional können Sie ein Profilbild und weitere Details hinzufügen.',
      keywords: ['daten', 'registrierung', 'betrieb', 'kontakt', 'profil']
    },

    // Verkaufsflächen und Buchungen
    {
      _id: 'booking-1',
      category: 'Buchungen',
      question: 'Wie funktioniert die Buchung von Verkaufsflächen?',
      answer: 'Auf der Preise-Seite wählen Sie Ihren gewünschten Standort und die Flächengröße. Sie sehen sofort die monatlichen Kosten und können direkt buchen. Nach der Buchung erhalten Sie alle Details zum Standort und den nächsten Schritten.',
      keywords: ['buchung', 'verkaufsflächen', 'standort', 'preise', 'fläche']
    },
    {
      _id: 'booking-2',
      category: 'Buchungen',
      question: 'Welche Verkaufsflächen stehen zur Verfügung?',
      answer: 'Wir bieten verschiedene Standorte mit unterschiedlichen Flächengrößen: von kleinen Tischplätzen (2m²) bis zu größeren Bereichen (8m²). Jeder Standort hat spezielle Eigenschaften wie Überdachung, Stromversorgung oder besondere Lage.',
      keywords: ['flächen', 'standorte', 'größe', 'tisch', 'überdachung', 'strom']
    },
    {
      _id: 'booking-3',
      category: 'Buchungen',
      question: 'Kann ich mehrere Standorte gleichzeitig buchen?',
      answer: 'Ja, Sie können Flächen an verschiedenen Standorten buchen. Jede Buchung wird separat verwaltet und abgerechnet. In Ihrem Dashboard haben Sie eine Übersicht über alle Ihre aktiven Buchungen.',
      keywords: ['mehrere', 'standorte', 'buchungen', 'dashboard', 'übersicht']
    },
    {
      _id: 'booking-4',
      category: 'Buchungen',
      question: 'Wie lange im Voraus muss ich buchen?',
      answer: 'Grundsätzlich können Sie jederzeit buchen, solange Flächen verfügbar sind. Für beliebte Standorte und Zeiten empfehlen wir eine Buchung mindestens 2-3 Wochen im Voraus. Kurzfristige Buchungen sind je nach Verfügbarkeit möglich.',
      keywords: ['voraus', 'buchen', 'zeitraum', 'verfügbar', 'kurzfristig']
    },

    // Zahlungen und Abrechnung
    {
      _id: 'payment-1',
      category: 'Zahlungen',
      question: 'Wie wird abgerechnet und wann muss ich bezahlen?',
      answer: 'Die Abrechnung erfolgt monatlich im Voraus. Sie erhalten jeweils zum Monatsende eine Rechnung für den folgenden Monat. Zahlung ist per SEPA-Lastschrift oder Überweisung möglich. Der Probemonat ist kostenfrei.',
      keywords: ['abrechnung', 'zahlung', 'monatlich', 'rechnung', 'sepa', 'überweisung']
    },
    {
      _id: 'payment-2',
      category: 'Zahlungen',
      question: 'Welche Zahlungsmethoden werden akzeptiert?',
      answer: 'Wir akzeptieren SEPA-Lastschrift (empfohlen) und Überweisung. Die Lastschrift wird automatisch zum Fälligkeitstermin eingezogen. Bei Überweisung erhalten Sie rechtzeitig eine Rechnung mit allen nötigen Daten.',
      keywords: ['zahlungsmethoden', 'sepa', 'lastschrift', 'überweisung', 'automatisch']
    },
    {
      _id: 'payment-3',
      category: 'Zahlungen',
      question: 'Was passiert bei Zahlungsverzug?',
      answer: 'Bei Zahlungsverzug senden wir zunächst eine freundliche Erinnerung. Nach 14 Tagen folgt eine Mahnung mit Mahngebühren. Bei längerem Verzug (über 30 Tage) kann der Zugang vorübergehend gesperrt werden.',
      keywords: ['zahlungsverzug', 'mahnung', 'mahngebühren', 'sperrung', 'erinnerung']
    },

    // Produkte und Präsentation
    {
      _id: 'products-1',
      category: 'Produkte',
      question: 'Welche Produkte kann ich über housnkuh anbieten?',
      answer: 'Sie können alle regionalen, selbst erzeugten oder verarbeiteten Produkte anbieten: Obst, Gemüse, Fleisch, Milchprodukte, Honig, Wein, Backwaren und vieles mehr. Die Produkte müssen den gesetzlichen Bestimmungen entsprechen.',
      keywords: ['produkte', 'regional', 'obst', 'gemüse', 'fleisch', 'milch', 'honig', 'wein']
    },
    {
      _id: 'products-2',
      category: 'Produkte',
      question: 'Wie erstelle ich ein ansprechendes Profil?',
      answer: 'Ein gutes Profil enthält aussagekräftige Fotos, eine detaillierte Beschreibung Ihres Betriebs, Ihre Produktpalette und Ihre Geschichte. Nutzen Sie die Kategorien und Tags, damit Kunden Sie leicht finden. Halten Sie alle Informationen aktuell.',
      keywords: ['profil', 'fotos', 'beschreibung', 'betrieb', 'kategorien', 'tags', 'aktuell']
    },
    {
      _id: 'products-3',
      category: 'Produkte',
      question: 'Kann ich Preise für meine Produkte angeben?',
      answer: 'Ja, Sie können Preise für Ihre Produkte hinterlegen. Diese dienen Kunden als Orientierung. Der tatsächliche Verkauf und die Preisgestaltung liegen in Ihrer Verantwortung - housnkuh ist keine Verkaufsplattform, sondern vermittelt den Kontakt.',
      keywords: ['preise', 'produktpreise', 'orientierung', 'verkauf', 'kontakt', 'vermittlung']
    },

    // Support und Hilfe
    {
      _id: 'support-1',
      category: 'Support',
      question: 'Wie erreiche ich den housnkuh-Support?',
      answer: 'Unser Support-Team ist per E-Mail unter info@housnkuh.de oder telefonisch unter 0157 35711257 erreichbar. Wir antworten in der Regel innerhalb von 24 Stunden. Für dringende Fälle nutzen Sie bitte das Telefon.',
      keywords: ['support', 'hilfe', 'kontakt', 'email', 'telefon', 'dringend']
    },
    {
      _id: 'support-2',
      category: 'Support',
      question: 'Gibt es Schulungen oder Hilfen für Einsteiger?',
      answer: 'Ja, wir bieten Ihnen gerne eine persönliche Einführung in die Plattform. Außerdem finden Sie in Ihrem Dashboard hilfreiche Tipps und Anleitungen. Bei Fragen steht unser Support-Team zur Verfügung.',
      keywords: ['schulung', 'einführung', 'tipps', 'anleitung', 'einsteiger', 'hilfe']
    },
    {
      _id: 'support-3',
      category: 'Support',
      question: 'Was mache ich bei technischen Problemen?',
      answer: 'Bei technischen Problemen kontaktieren Sie unseren Support mit einer detaillierten Beschreibung des Problems. Geben Sie dabei Ihren Browser, das Betriebssystem und die genauen Fehlermeldungen an. Wir helfen schnellstmöglich.',
      keywords: ['technische probleme', 'fehler', 'browser', 'betriebssystem', 'fehlermeldung']
    }
  ];

  const categories = ['all', ...Array.from(new Set(faqItems.map(item => item.category)))];

  const filteredItems = faqItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <HelpCircle className="w-12 h-12 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-secondary">Häufig gestellte Fragen</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hier finden Sie Antworten auf die wichtigsten Fragen rund um housnkuh
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Frage oder Stichwort eingeben..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* Category Filter */}
            <div className="md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Alle Kategorien</option>
                {categories.slice(1).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
          
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-600">
              {filteredItems.length} Ergebnis{filteredItems.length !== 1 ? 'se' : ''} für "{searchTerm}"
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Category Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-secondary mb-4">Kategorien</h3>
              <nav className="space-y-2">
                {categories.map(category => {
                  const count = category === 'all' ? faqItems.length : faqItems.filter(item => item.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedCategory === category
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex justify-between items-center">
                        <span>{category === 'all' ? 'Alle Fragen' : category}</span>
                        <span className="text-sm opacity-75">({count})</span>
                      </span>
                    </button>
                  );
                })}
              </nav>
              
              {/* Quick Contact */}
              <div className="mt-8 p-4 bg-primary/10 rounded-lg">
                <h4 className="font-semibold text-secondary mb-3">Noch Fragen?</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-primary mr-2" />
                    <a href="tel:+4915735711257" className="text-primary hover:underline">
                      0157 35711257
                    </a>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-primary mr-2" />
                    <a href="mailto:info@housnkuh.de" className="text-primary hover:underline">
                      info@housnkuh.de
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Items */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <div key={item._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <button
                    onClick={() => toggleExpanded(item._id)}
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded mr-3">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-secondary">
                        {item.question}
                      </h3>
                    </div>
                    {expandedItems.includes(item._id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                    )}
                  </button>
                  
                  {expandedItems.includes(item._id) && (
                    <div className="px-6 pb-6">
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-gray-700 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredItems.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Keine Ergebnisse gefunden
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Versuchen Sie es mit anderen Suchbegriffen oder wählen Sie eine andere Kategorie.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Alle FAQs anzeigen
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Contact Section */}
        <div className="mt-16 bg-gradient-to-r from-primary to-orange-500 rounded-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Ihre Frage war nicht dabei?</h2>
          <p className="text-lg mb-6 opacity-90">
            Unser Support-Team hilft Ihnen gerne persönlich weiter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+4915735711257"
              className="inline-flex items-center px-6 py-3 bg-white text-primary rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              <Phone className="w-5 h-5 mr-2" />
              Jetzt anrufen
            </a>
            <a
              href="mailto:info@housnkuh.de"
              className="inline-flex items-center px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors font-medium"
            >
              <Mail className="w-5 h-5 mr-2" />
              E-Mail schreiben
            </a>
          </div>
        </div>
      </div>
  );
};

export default FAQPage;