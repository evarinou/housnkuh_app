// server/scripts/seed-faqs.ts
import mongoose from 'mongoose';
import FAQ from '../src/models/FAQ';
import config from '../src/config/config';

const defaultFAQs = [
  // Allgemeine Fragen
  {
    category: 'Allgemein',
    question: 'Was ist housnkuh und wie funktioniert die Plattform?',
    answer: 'housnkuh ist eine Online-Plattform, die regionale Direktvermarkter mit Endkunden verbindet. Direktvermarkter können sich registrieren, ihr Profil erstellen und Verkaufsflächen an verschiedenen Standorten buchen. Kunden finden über die Plattform lokale Anbieter und deren Produkte in ihrer Nähe.',
    keywords: ['plattform', 'funktionsweise', 'direktvermarkter', 'kunden'],
    order: 1,
    isActive: true
  },
  {
    category: 'Allgemein',
    question: 'Für wen ist housnkuh geeignet?',
    answer: 'housnkuh richtet sich an regionale Direktvermarkter (Landwirte, Imker, Winzer, etc.) sowie an Endkunden, die frische, regionale Produkte direkt vom Erzeuger kaufen möchten. Die Plattform eignet sich besonders für kleinere und mittlere Betriebe, die ihre Reichweite erhöhen möchten.',
    keywords: ['zielgruppe', 'landwirte', 'imker', 'winzer', 'regional'],
    order: 2,
    isActive: true
  },
  {
    category: 'Allgemein',
    question: 'In welchen Regionen ist housnkuh verfügbar?',
    answer: 'housnkuh startet zunächst in ausgewählten Regionen Deutschlands und wird sukzessive auf weitere Gebiete ausgedehnt. Aktuelle Verfügbarkeit und geplante Erweiterungen finden Sie auf unserer Standorte-Seite oder kontaktieren Sie uns direkt.',
    keywords: ['regionen', 'verfügbarkeit', 'deutschland', 'standorte'],
    order: 3,
    isActive: true
  },

  // Registrierung und Account
  {
    category: 'Registrierung',
    question: 'Wie kann ich mich als Direktvermarkter registrieren?',
    answer: 'Klicken Sie auf "Jetzt registrieren" und wählen Sie "Als Direktvermarkter". Füllen Sie das Formular mit Ihren Betriebsdaten aus. Nach der E-Mail-Bestätigung können Sie sofort mit dem kostenlosen Probemonat beginnen und Ihr Profil vervollständigen.',
    keywords: ['registrierung', 'anmeldung', 'direktvermarkter', 'probemonat'],
    order: 4,
    isActive: true
  },
  {
    category: 'Registrierung',
    question: 'Was kostet die Nutzung von housnkuh?',
    answer: 'Der erste Monat ist für Direktvermarkter vollständig kostenlos. Danach fallen monatliche Gebühren für gebuchte Verkaufsflächen an. Die genauen Preise werden transparent vor jeder Buchung angezeigt. Für Endkunden ist die Nutzung der Plattform kostenfrei.',
    keywords: ['kosten', 'preise', 'probemonat', 'kostenlos', 'gebühren'],
    order: 5,
    isActive: true
  },
  {
    category: 'Registrierung',
    question: 'Kann ich den Probemonat jederzeit kündigen?',
    answer: 'Ja, Sie können Ihr Konto während des kostenlosen Probemonats jederzeit ohne Angabe von Gründen kündigen. Nutzen Sie dafür die Kündigungsfunktion in Ihrem Dashboard oder kontaktieren Sie unseren Support.',
    keywords: ['kündigung', 'probemonat', 'kostenlos', 'dashboard'],
    order: 6,
    isActive: true
  },

  // Buchungen
  {
    category: 'Buchungen',
    question: 'Wie funktioniert die Buchung von Verkaufsflächen?',
    answer: 'Auf der Preise-Seite wählen Sie Ihren gewünschten Standort und die Flächengröße. Sie sehen sofort die monatlichen Kosten und können direkt buchen. Nach der Buchung erhalten Sie alle Details zum Standort und den nächsten Schritten.',
    keywords: ['buchung', 'verkaufsflächen', 'standort', 'preise', 'fläche'],
    order: 7,
    isActive: true
  },
  {
    category: 'Buchungen',
    question: 'Welche Verkaufsflächen stehen zur Verfügung?',
    answer: 'Wir bieten verschiedene Standorte mit unterschiedlichen Flächengrößen: von kleinen Tischplätzen (2m²) bis zu größeren Bereichen (8m²). Jeder Standort hat spezielle Eigenschaften wie Überdachung, Stromversorgung oder besondere Lage.',
    keywords: ['flächen', 'standorte', 'größe', 'tisch', 'überdachung', 'strom'],
    order: 8,
    isActive: true
  },

  // Zahlungen
  {
    category: 'Zahlungen',
    question: 'Wie wird abgerechnet und wann muss ich bezahlen?',
    answer: 'Die Abrechnung erfolgt monatlich im Voraus. Sie erhalten jeweils zum Monatsende eine Rechnung für den folgenden Monat. Zahlung ist per SEPA-Lastschrift oder Überweisung möglich. Der Probemonat ist kostenfrei.',
    keywords: ['abrechnung', 'zahlung', 'monatlich', 'rechnung', 'sepa', 'überweisung'],
    order: 9,
    isActive: true
  },
  {
    category: 'Zahlungen',
    question: 'Welche Zahlungsmethoden werden akzeptiert?',
    answer: 'Wir akzeptieren SEPA-Lastschrift (empfohlen) und Überweisung. Die Lastschrift wird automatisch zum Fälligkeitstermin eingezogen. Bei Überweisung erhalten Sie rechtzeitig eine Rechnung mit allen nötigen Daten.',
    keywords: ['zahlungsmethoden', 'sepa', 'lastschrift', 'überweisung', 'automatisch'],
    order: 10,
    isActive: true
  },

  // Produkte
  {
    category: 'Produkte',
    question: 'Welche Produkte kann ich über housnkuh anbieten?',
    answer: 'Sie können alle regionalen, selbst erzeugten oder verarbeiteten Produkte anbieten: Obst, Gemüse, Fleisch, Milchprodukte, Honig, Wein, Backwaren und vieles mehr. Die Produkte müssen den gesetzlichen Bestimmungen entsprechen.',
    keywords: ['produkte', 'regional', 'obst', 'gemüse', 'fleisch', 'milch', 'honig', 'wein'],
    order: 11,
    isActive: true
  },
  {
    category: 'Produkte',
    question: 'Wie erstelle ich ein ansprechendes Profil?',
    answer: 'Ein gutes Profil enthält aussagekräftige Fotos, eine detaillierte Beschreibung Ihres Betriebs, Ihre Produktpalette und Ihre Geschichte. Nutzen Sie die Kategorien und Tags, damit Kunden Sie leicht finden. Halten Sie alle Informationen aktuell.',
    keywords: ['profil', 'fotos', 'beschreibung', 'betrieb', 'kategorien', 'tags', 'aktuell'],
    order: 12,
    isActive: true
  },

  // Support
  {
    category: 'Support',
    question: 'Wie erreiche ich den housnkuh-Support?',
    answer: 'Unser Support-Team ist per E-Mail unter info@housnkuh.de oder telefonisch unter 0152 22035788 erreichbar. Wir antworten in der Regel innerhalb von 24 Stunden. Für dringende Fälle nutzen Sie bitte das Telefon.',
    keywords: ['support', 'hilfe', 'kontakt', 'email', 'telefon', 'dringend'],
    order: 13,
    isActive: true
  },
  {
    category: 'Support',
    question: 'Gibt es Schulungen oder Hilfen für Einsteiger?',
    answer: 'Ja, wir bieten Ihnen gerne eine persönliche Einführung in die Plattform. Außerdem finden Sie in Ihrem Dashboard hilfreiche Tipps und Anleitungen. Bei Fragen steht unser Support-Team zur Verfügung.',
    keywords: ['schulung', 'einführung', 'tipps', 'anleitung', 'einsteiger', 'hilfe'],
    order: 14,
    isActive: true
  }
];

async function seedFAQs() {
  try {
    // Verbindung zur Datenbank herstellen
    await mongoose.connect(config.mongoURI);
    console.log('Verbindung zur Datenbank hergestellt');

    // Bestehende FAQs löschen (optional)
    const existingCount = await FAQ.countDocuments();
    if (existingCount > 0) {
      console.log(`Es existieren bereits ${existingCount} FAQs. Keine neuen FAQs werden hinzugefügt.`);
      console.log('Wenn Sie die FAQs neu laden möchten, löschen Sie diese zuerst über das Admin-Interface.');
      process.exit(0);
    }

    // FAQs erstellen
    const createdFAQs = await FAQ.insertMany(defaultFAQs);
    console.log(`${createdFAQs.length} FAQs erfolgreich erstellt`);

    // Verbindung trennen
    await mongoose.disconnect();
    console.log('Datenbankverbindung geschlossen');
    process.exit(0);
  } catch (error) {
    console.error('Fehler beim Erstellen der FAQs:', error);
    process.exit(1);
  }
}

// Script ausführen
seedFAQs();