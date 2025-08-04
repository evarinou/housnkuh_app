// client/src/pages/FAQPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, ChevronDown, Search, Phone, Mail, MessageCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
      answer: 'housnkuh startet zunächst in ausgewählten Regionen Deutschlands und wird sukzessive auf weitere Gebiete ausgedehnt. Aktuelle Verfügbarkeit und geplante Erweiterungen findest du auf der Standorte-Seite oder kontaktiere Eva-Maria Schaller direkt.',
      keywords: ['regionen', 'verfügbarkeit', 'deutschland', 'standorte']
    },

    // Registrierung und Account
    {
      _id: 'account-1',
      category: 'Registrierung',
      question: 'Wie kann ich mich als Direktvermarkter registrieren?',
      answer: 'Klicke auf "Jetzt registrieren" und wähle "Als Direktvermarkter". Fülle das Formular mit deinen Betriebsdaten aus. Nach der E-Mail-Bestätigung kannst du sofort mit dem kostenlosen Probemonat beginnen und dein Profil vervollständigen.',
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
      answer: 'Ja, du kannst dein Konto während des kostenlosen Probemonats jederzeit ohne Angabe von Gründen kündigen. Nutze dafür die Kündigungsfunktion in deinem Dashboard oder kontaktiere housnkuh direkt.',
      keywords: ['kündigung', 'probemonat', 'kostenlos', 'dashboard']
    },
    {
      _id: 'account-4',
      category: 'Registrierung',
      question: 'Welche Daten muss ich bei der Registrierung angeben?',
      answer: 'Für die Registrierung benötigen wir deine Kontaktdaten (Name, E-Mail, Telefon), Informationen zu deinem Betrieb (Firmenname, Adresse, Betriebsart) und eine Beschreibung deiner Produkte. Optional kannst du ein Profilbild und weitere Details hinzufügen.',
      keywords: ['daten', 'registrierung', 'betrieb', 'kontakt', 'profil']
    },

    // Verkaufsflächen und Buchungen
    {
      _id: 'booking-1',
      category: 'Buchungen',
      question: 'Wie funktioniert die Buchung von Verkaufsflächen?',
      answer: 'Auf der Preise-Seite wählst du deinen gewünschten Standort und die Flächengröße. Du siehst sofort die monatlichen Kosten und kannst direkt buchen. Nach der Buchung erhältst du alle Details zum Standort und den nächsten Schritten.',
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
      answer: 'Ja, du kannst Flächen an verschiedenen Standorten buchen. Jede Buchung wird separat verwaltet und abgerechnet. In deinem Dashboard hast du eine Übersicht über alle deine aktiven Buchungen.',
      keywords: ['mehrere', 'standorte', 'buchungen', 'dashboard', 'übersicht']
    },
    {
      _id: 'booking-4',
      category: 'Buchungen',
      question: 'Wie lange im Voraus muss ich buchen?',
      answer: 'Grundsätzlich kannst du jederzeit buchen, solange Flächen verfügbar sind. Für beliebte Standorte und Zeiten empfehlen wir eine Buchung mindestens 2-3 Wochen im Voraus. Kurzfristige Buchungen sind je nach Verfügbarkeit möglich.',
      keywords: ['voraus', 'buchen', 'zeitraum', 'verfügbar', 'kurzfristig']
    },

    // Zahlungen und Abrechnung
    {
      _id: 'payment-1',
      category: 'Zahlungen',
      question: 'Wie wird abgerechnet und wann muss ich bezahlen?',
      answer: 'Die Abrechnung erfolgt monatlich im Voraus. Du erhältst jeweils zum Monatsende eine Rechnung für den folgenden Monat. Zahlung ist per SEPA-Lastschrift oder Überweisung möglich. Der Probemonat ist kostenfrei.',
      keywords: ['abrechnung', 'zahlung', 'monatlich', 'rechnung', 'sepa', 'überweisung']
    },
    {
      _id: 'payment-2',
      category: 'Zahlungen',
      question: 'Welche Zahlungsmethoden werden akzeptiert?',
      answer: 'Wir akzeptieren SEPA-Lastschrift (empfohlen) und Überweisung. Die Lastschrift wird automatisch zum Fälligkeitstermin eingezogen. Bei Überweisung erhältst du rechtzeitig eine Rechnung mit allen nötigen Daten.',
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
      answer: 'Du kannst alle regionalen, selbst erzeugten oder verarbeiteten Produkte anbieten: Obst, Gemüse, Fleisch, Milchprodukte, Honig, Wein, Backwaren und vieles mehr. Die Produkte müssen den gesetzlichen Bestimmungen entsprechen.',
      keywords: ['produkte', 'regional', 'obst', 'gemüse', 'fleisch', 'milch', 'honig', 'wein']
    },
    {
      _id: 'products-2',
      category: 'Produkte',
      question: 'Wie erstelle ich ein ansprechendes Profil?',
      answer: 'Ein gutes Profil enthält aussagekräftige Fotos, eine detaillierte Beschreibung deines Betriebs, deine Produktpalette und deine Geschichte. Nutze die Kategorien und Tags, damit Kunden dich leicht finden. Halte alle Informationen aktuell.',
      keywords: ['profil', 'fotos', 'beschreibung', 'betrieb', 'kategorien', 'tags', 'aktuell']
    },
    {
      _id: 'products-3',
      category: 'Produkte',
      question: 'Kann ich Preise für meine Produkte angeben?',
      answer: 'Ja, du kannst Preise für deine Produkte hinterlegen. Diese dienen Kunden als Orientierung. Der tatsächliche Verkauf und die Preisgestaltung liegen in deiner Verantwortung - housnkuh ist keine Verkaufsplattform, sondern vermittelt den Kontakt.',
      keywords: ['preise', 'produktpreise', 'orientierung', 'verkauf', 'kontakt', 'vermittlung']
    },

    // Support und Hilfe
    {
      _id: 'support-1',
      category: 'Support',
      question: 'Wie erreiche ich den housnkuh-Support?',
      answer: 'housnkuh ist per E-Mail unter info@housnkuh.de oder telefonisch unter 0157 35711257 erreichbar. Du erhältst in der Regel innerhalb von 24 Stunden eine Antwort. Für dringende Fälle nutze bitte das Telefon.',
      keywords: ['support', 'hilfe', 'kontakt', 'email', 'telefon', 'dringend']
    },
    {
      _id: 'support-2',
      category: 'Support',
      question: 'Gibt es Schulungen oder Hilfen für Einsteiger?',
      answer: 'Ja, housnkuh bietet dir gerne eine persönliche Einführung in die Plattform. Außerdem findest du in deinem Dashboard hilfreiche Tipps und Anleitungen. Bei Fragen hilft dir Eva-Maria Schaller gerne weiter.',
      keywords: ['schulung', 'einführung', 'tipps', 'anleitung', 'einsteiger', 'hilfe']
    },
    {
      _id: 'support-3',
      category: 'Support',
      question: 'Was mache ich bei technischen Problemen?',
      answer: 'Bei technischen Problemen kontaktiere housnkuh mit einer detaillierten Beschreibung des Problems. Gib dabei deinen Browser, das Betriebssystem und die genauen Fehlermeldungen an. Du erhältst schnellstmöglich Hilfe.',
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Animated Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"></div>
              <HelpCircle className="w-16 h-16 text-primary relative z-10" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-secondary mb-4">
            Häufig gestellte Fragen
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Finde schnell Antworten auf deine Fragen oder kontaktiere Eva-Maria Schaller persönlich
          </p>
        </motion.div>

        {/* Search and Filter */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-10 bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative group">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Suche nach Stichworten..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all duration-300"
              />
            </div>
            
            {/* Category Filter */}
            <div className="md:w-72">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all duration-300 cursor-pointer"
              >
                <option value="all">🔍 Alle Kategorien</option>
                {categories.slice(1).map(category => (
                  <option key={category} value={category}>
                    {category === 'Allgemein' && '📌 '}
                    {category === 'Registrierung' && '👤 '}
                    {category === 'Buchungen' && '📅 '}
                    {category === 'Zahlungen' && '💳 '}
                    {category === 'Produkte' && '🛍️ '}
                    {category === 'Support' && '💬 '}
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {searchTerm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-sm text-gray-600 flex items-center"
            >
              <Sparkles className="w-4 h-4 text-primary mr-2" />
              {filteredItems.length} Ergebnis{filteredItems.length !== 1 ? 'se' : ''} für "{searchTerm}"
            </motion.div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Category Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6 border border-gray-100">
              <h3 className="text-xl font-bold text-secondary mb-6 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-primary" />
                Kategorien
              </h3>
              <nav className="space-y-2">
                {categories.map(category => {
                  const count = category === 'all' ? faqItems.length : faqItems.filter(item => item.category === category).length;
                  return (
                    <motion.button
                      key={category}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-300 ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
                      }`}
                    >
                      <span className="flex justify-between items-center">
                        <span className="font-medium">{category === 'all' ? 'Alle Fragen' : category}</span>
                        <span className={`text-sm ${selectedCategory === category ? 'bg-white/20' : 'bg-gray-100'} px-2 py-1 rounded-full`}>
                          {count}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </nav>
              
              {/* Quick Contact */}
              <div className="mt-8 p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                <h4 className="font-bold text-secondary mb-4">Persönliche Hilfe</h4>
                <div className="space-y-3">
                  <a href="tel:+4915735711257" className="flex items-center text-sm group">
                    <div className="bg-white p-2 rounded-lg mr-3 group-hover:shadow-md transition-all duration-300">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-gray-700 group-hover:text-primary transition-colors">0157 35711257</span>
                  </a>
                  <a href="mailto:info@housnkuh.de" className="flex items-center text-sm group">
                    <div className="bg-white p-2 rounded-lg mr-3 group-hover:shadow-md transition-all duration-300">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-gray-700 group-hover:text-primary transition-colors">info@housnkuh.de</span>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* FAQ Items */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="space-y-4">
              {filteredItems.map((item, index) => (
                <motion.div 
                  key={item._id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  <button
                    onClick={() => toggleExpanded(item._id)}
                    className="w-full px-8 py-6 text-left flex justify-between items-center hover:bg-gray-50 transition-all duration-300 group"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center mb-2">
                        <span className="inline-block px-3 py-1 text-xs font-bold bg-gradient-to-r from-primary/20 to-primary/10 text-primary rounded-full">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-secondary group-hover:text-primary transition-colors duration-300">
                        {item.question}
                      </h3>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedItems.includes(item._id) ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="w-6 h-6 text-primary" />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence>
                    {expandedItems.includes(item._id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-8 pb-6">
                          <div className="pt-4 border-t border-gray-100">
                            <p className="text-gray-700 leading-relaxed">
                              {item.answer}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
              
              {filteredItems.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100"
                >
                  <HelpCircle className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-bold text-gray-600 mb-3">
                    Keine Ergebnisse gefunden
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Versuche es mit anderen Suchbegriffen oder wähle eine andere Kategorie.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('all');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
                  >
                    Alle FAQs anzeigen
                  </motion.button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom Contact Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-20 bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-white text-center shadow-2xl relative overflow-hidden"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-white/80" />
            <h2 className="text-3xl font-bold mb-4">Deine Frage war nicht dabei?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              housnkuh hilft dir gerne persönlich weiter und beantwortet alle deine Fragen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="tel:+4915735711257"
                className="inline-flex items-center px-8 py-4 bg-white text-primary rounded-xl hover:shadow-lg transition-all duration-300 font-bold"
              >
                <Phone className="w-5 h-5 mr-3" />
                Jetzt anrufen
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="mailto:info@housnkuh.de"
                className="inline-flex items-center px-8 py-4 bg-white/20 text-white border-2 border-white/30 rounded-xl hover:bg-white/30 transition-all duration-300 font-bold backdrop-blur-sm"
              >
                <Mail className="w-5 h-5 mr-3" />
                E-Mail schreiben
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQPage;