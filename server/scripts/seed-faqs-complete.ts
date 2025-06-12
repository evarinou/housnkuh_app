// server/scripts/seed-faqs-complete.ts
import mongoose from 'mongoose';
import FAQ from '../src/models/FAQ';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/housnkuh';

interface FAQData {
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  order?: number;
  isActive?: boolean;
}

const faqData: FAQData[] = [
  // FÜR KUNDEN / ENDVERBRAUCHER
  // Allgemeine Fragen zum Einkauf
  {
    category: '🛒 Kunden - Allgemein',
    question: 'Was ist Housnkuh und wie funktioniert das Konzept?',
    answer: 'Housnkuh ist ein regionaler Selbstbedienungsmarktplatz in der Strauer Str. 15 in Kronach. Hier verkaufen lokale Direktvermarkter ihre Produkte - von frischen Lebensmitteln über Handwerk bis hin zu regionalen Spezialitäten. Du kaufst direkt beim Erzeuger, ohne Zwischenhändler. Der Laden funktioniert mit Selbstbedienungskassen und ist daher auch außerhalb der üblichen Ladenöffnungszeiten zugänglich.',
    keywords: ['housnkuh', 'konzept', 'regional', 'selbstbedienung', 'direktvermarkter', 'marktplatz'],
    order: 1
  },
  {
    category: '🛒 Kunden - Allgemein',
    question: 'Wie kann ich einkaufen?',
    answer: '1. Zugangskarte (EC- oder Kreditkarte) am Eingang verwenden\n2. Produkte aussuchen und in den Einkaufskorb legen\n3. An der Selbstbedienungskasse scannen und bezahlen\n4. Mit deinem Einkauf den Laden verlassen',
    keywords: ['einkaufen', 'ablauf', 'kasse', 'zugang', 'bezahlen'],
    order: 2
  },
  {
    category: '🛒 Kunden - Allgemein',
    question: 'Welche Öffnungszeiten hat Housnkuh?',
    answer: 'Unser Ziel ist es, rund um die Uhr (24/7) geöffnet zu haben. Die genauen Öffnungszeiten werden vor der Eröffnung final festgelegt und hängen von den behördlichen Genehmigungen ab. Mindestens sind wir täglich von 6:00 bis 20:00 Uhr geöffnet.',
    keywords: ['öffnungszeiten', 'geöffnet', 'wann', 'uhrzeit', '24/7'],
    order: 3
  },
  {
    category: '🛒 Kunden - Allgemein',
    question: 'Welche Zahlungsmethoden werden akzeptiert?',
    answer: '• EC-Karte (Girocard)\n• Kreditkarte (Visa, Mastercard)\n• Kontaktloses Bezahlen (NFC)\n• Bargeld ist derzeit nicht möglich',
    keywords: ['bezahlen', 'zahlung', 'kreditkarte', 'ec-karte', 'bargeld', 'nfc'],
    order: 4
  },
  {
    category: '🛒 Kunden - Allgemein',
    question: 'Was kostet der Einkauf?',
    answer: 'Die Preise werden von den jeweiligen Direktvermarktern festgelegt. Wir nehmen keinen Aufschlag - du zahlst den gleichen Preis wie beim direkten Kauf beim Erzeuger. Durch wegfallende Zwischenhändler sind die Preise oft sogar günstiger als im Supermarkt.',
    keywords: ['preise', 'kosten', 'teuer', 'günstig', 'aufschlag'],
    order: 5
  },

  // Produktsortiment
  {
    category: '🛒 Kunden - Sortiment',
    question: 'Welche Produkte finde ich bei Housnkuh?',
    answer: '• Frische Lebensmittel (Eier, Milchprodukte, Fleisch, Wurst)\n• Backwaren von lokalen Bäckereien\n• Obst und Gemüse der Saison\n• Honig und Imkereiprodukte\n• Getränke (Säfte, Bier, Schnaps) von regionalen Herstellern\n• Handwerkliche Produkte (Seifen, Kerzen, Holzwaren)\n• Geschenkartikel und Souvenirs\n• Bücher und Medien mit regionalem Bezug',
    keywords: ['produkte', 'sortiment', 'angebot', 'lebensmittel', 'fleisch', 'gemüse', 'obst'],
    order: 6
  },
  {
    category: '🛒 Kunden - Sortiment',
    question: 'Sind die Produkte wirklich regional?',
    answer: 'Ja! Alle unsere Direktvermarkter kommen aus der Frankenwald-Region. Wir legen großen Wert auf kurze Transportwege und echte Regionalität. Bei jedem Produkt findest du Informationen über den Hersteller und die Herkunft.',
    keywords: ['regional', 'lokal', 'herkunft', 'frankenwald', 'transportwege'],
    order: 7
  },
  {
    category: '🛒 Kunden - Sortiment',
    question: 'Gibt es auch Bio-Produkte?',
    answer: 'Viele unserer Direktvermarkter arbeiten nachhaltig oder haben Bio-Zertifizierungen. Die entsprechenden Produkte sind deutlich gekennzeichnet.',
    keywords: ['bio', 'ökologisch', 'nachhaltig', 'zertifizierung'],
    order: 8
  },
  {
    category: '🛒 Kunden - Sortiment',
    question: 'Wie frisch sind die Produkte?',
    answer: 'Die Direktvermarkter beliefern ihre Fächer regelmäßig mit frischen Produkten. Bei verderblichen Waren achten wir besonders auf kurze Verweildauer und optimale Lagerung in unseren Kühlbereichen.',
    keywords: ['frisch', 'frische', 'haltbarkeit', 'verderblich', 'kühlung'],
    order: 9
  },

  // Einkaufserlebnis
  {
    category: '🛒 Kunden - Einkauf',
    question: 'Kann ich die Produkte vor dem Kauf begutachten?',
    answer: 'Selbstverständlich! Du kannst alle Produkte in Ruhe betrachten und dir die Produktinformationen durchlesen. Bei Fragen zu einzelnen Produkten findest du die Kontaktdaten der Hersteller direkt beim Produktregal.',
    keywords: ['begutachten', 'anschauen', 'prüfen', 'kontakt', 'hersteller'],
    order: 10
  },
  {
    category: '🛒 Kunden - Einkauf',
    question: 'Was passiert, wenn ein Produkt defekt ist?',
    answer: 'Bei Problemen mit einem Produkt wende dich direkt an den jeweiligen Hersteller - die Kontaktdaten findest du beim Produktregal oder auf der Verpackung. Alternativ kannst du uns kontaktieren und wir stellen den Kontakt her.',
    keywords: ['defekt', 'kaputt', 'problem', 'reklamation', 'beschwerde'],
    order: 11
  },
  {
    category: '🛒 Kunden - Einkauf',
    question: 'Gibt es Einkaufstaschen?',
    answer: 'Ja, wir haben umweltfreundliche Papiertüten und Stoffbeutel gegen eine kleine Gebühr. Noch besser: Bring deine eigene Tasche mit!',
    keywords: ['taschen', 'tüten', 'beutel', 'verpackung', 'transport'],
    order: 12
  },
  {
    category: '🛒 Kunden - Einkauf',
    question: 'Kann ich Produkte reservieren oder bestellen?',
    answer: 'Derzeit nicht direkt über uns, aber du kannst die Direktvermarkter direkt kontaktieren und individuelle Absprachen treffen.',
    keywords: ['reservieren', 'bestellen', 'vorbestellen', 'reservierung'],
    order: 13
  },

  // FÜR DIREKTVERMARKTER / MIETER
  // Allgemeine Geschäftsfragen
  {
    category: '🏪 Direktvermarkter - Allgemein',
    question: 'Wer kann bei Housnkuh Verkaufsfläche mieten?',
    answer: 'Alle regionalen Direktvermarkter aus der Frankenwald-Region - Landwirte, Bäcker, Metzger, Imker, Kunsthandwerker, kleine Manufakturen und Produzenten. Wichtig ist, dass du deine Produkte selbst herstellst oder verarbeitest.',
    keywords: ['mieten', 'direktvermarkter', 'wer', 'landwirt', 'bäcker', 'produzent'],
    order: 14
  },
  {
    category: '🏪 Direktvermarkter - Allgemein',
    question: 'Welche Mietflächen gibt es und was kosten sie?',
    answer: '• Verkaufsblock Lage A (Augenhöhe): 35€/Monat\n• Verkaufsblock Lage B (untere/obere Regale): 15€/Monat\n• Verkaufsblock gekühlt: 50€/Monat\n• Verkaufsblock Tisch: 40€/Monat\n• Lagerservice: 20€/Monat zusätzlich\n• Schaufensterplatz klein: 30€/Monat\n• Schaufensterplatz groß: 60€/Monat\n\nAlle Preise verstehen sich netto. Rabatte bei längerer Mietdauer: 5% bei 6 Monaten, 10% bei 12 Monaten.',
    keywords: ['mietflächen', 'preise', 'kosten', 'regal', 'kühlung', 'schaufenster'],
    order: 15
  },
  {
    category: '🏪 Direktvermarkter - Allgemein',
    question: 'Wie hoch ist die Verkaufsprovision?',
    answer: 'Wir behalten 5% des Verkaufspreises als Provision ein. Diese deckt Kartenzahlungsgebühren, Versicherung gegen Diebstahl und den technischen Aufwand ab.',
    keywords: ['provision', 'gebühren', 'prozent', 'verkaufsprovision'],
    order: 16
  },
  {
    category: '🏪 Direktvermarkter - Allgemein',
    question: 'Wie lange ist die Mindestmietdauer?',
    answer: 'Die Mindestmietdauer beträgt 3 Monate. Die Kündigungsfrist beträgt 4 Wochen zum Monatsende.',
    keywords: ['mindestmietdauer', 'kündigung', 'kündigungsfrist', 'mietdauer'],
    order: 17
  },

  // Praktische Abwicklung
  {
    category: '🏪 Direktvermarkter - Abwicklung',
    question: 'Wie läuft die Vertragsgestaltung ab?',
    answer: 'Nach einem Erstgespräch erhältst du unseren Standardmietvertrag. Dieser regelt alle wichtigen Punkte wie Mietdauer, Preise, Verantwortlichkeiten und Kündigungsfristen. Nach Vertragsunterzeichnung können wir mit der Einrichtung deines Verkaufsbereichs beginnen.',
    keywords: ['vertrag', 'mietvertrag', 'vertragsgestaltung', 'erstgespräch'],
    order: 18
  },
  {
    category: '🏪 Direktvermarkter - Abwicklung',
    question: 'Wer kümmert sich um das Auffüllen der Waren?',
    answer: 'Grundsätzlich bist du selbst für das Auffüllen verantwortlich. Du erhältst einen Zugangsschlüssel und kannst täglich zwischen 6:00 und 20:00 Uhr deine Waren auffüllen. Gegen Aufpreis bieten wir einen Lagerservice an - dann übernehmen wir das Auffüllen für dich.',
    keywords: ['auffüllen', 'nachfüllen', 'lagerservice', 'zugang', 'schlüssel'],
    order: 19
  },
  {
    category: '🏪 Direktvermarkter - Abwicklung',
    question: 'Wie werden meine Produkte erfasst und etikettiert?',
    answer: 'Beim Onboarding pflegen wir deine Artikel gemeinsam in unser Warenwirtschaftssystem ein. Du erhältst sowohl digitale als auch gedruckte Etiketten. Neue Artikel kannst du eigenständig über unser Online-Portal hinzufügen.',
    keywords: ['etiketten', 'erfassung', 'warenwirtschaft', 'artikel', 'online-portal'],
    order: 20
  },
  {
    category: '🏪 Direktvermarkter - Abwicklung',
    question: 'Wie erhalte ich Verkaufsstatistiken?',
    answer: 'Du bekommst täglich eine E-Mail mit deinen Verkaufszahlen und dem aktuellen Bestand. Außerdem erhältst du monatlich eine detaillierte Auswertung mit allen relevanten Kennzahlen.',
    keywords: ['statistiken', 'verkaufszahlen', 'auswertung', 'bestand', 'kennzahlen'],
    order: 21
  },
  {
    category: '🏪 Direktvermarkter - Abwicklung',
    question: 'Wann und wie bekomme ich mein Geld?',
    answer: 'Am Monatsende erstellen wir eine Abrechnung über deine Verkäufe abzüglich der 5% Provision und der Mietkosten. Der Betrag wird dir bis zum 5. des Folgemonats überwiesen.',
    keywords: ['auszahlung', 'geld', 'abrechnung', 'überweisung', 'monatsende'],
    order: 22
  },

  // Produktmanagement
  {
    category: '🏪 Direktvermarkter - Produkte',
    question: 'Welche Produkte kann ich verkaufen?',
    answer: 'Grundsätzlich alle selbst hergestellten oder verarbeiteten Produkte. Bei Lebensmitteln müssen die entsprechenden Hygiene- und Kennzeichnungsvorschriften eingehalten werden. Alkohol ist nur für Produzenten mit entsprechender Lizenz möglich.',
    keywords: ['produkte', 'verkaufen', 'lebensmittel', 'hygiene', 'alkohol'],
    order: 23
  },
  {
    category: '🏪 Direktvermarkter - Produkte',
    question: 'Wie funktioniert die Preisgestaltung?',
    answer: 'Du legst deine Preise selbst fest. Wir empfehlen faire Preise, die deine Qualität widerspiegeln aber auch für Endkunden attraktiv sind. Preisänderungen sind jederzeit nach Absprache möglich.',
    keywords: ['preise', 'preisgestaltung', 'preisänderung', 'kalkulation'],
    order: 24
  },
  {
    category: '🏪 Direktvermarkter - Produkte',
    question: 'Was passiert mit abgelaufenen Produkten?',
    answer: 'Du bist selbst für die Kontrolle der Haltbarkeit verantwortlich. Wir benachrichtigen dich bei kritischen Beständen, aber die finale Verantwortung liegt bei dir. Abgelaufene Ware muss von dir entsorgt werden.',
    keywords: ['abgelaufen', 'haltbarkeit', 'mhd', 'entsorgung', 'kontrolle'],
    order: 25
  },
  {
    category: '🏪 Direktvermarkter - Produkte',
    question: 'Wie wird mit Diebstahl umgegangen?',
    answer: 'Diebstahl ist durch unsere Videoüberwachung und Zugangskontrolle selten, kann aber vorkommen. Die Kosten dafür sind in der 5%-Provision bereits einkalkuliert - du trägst kein zusätzliches Risiko.',
    keywords: ['diebstahl', 'sicherheit', 'überwachung', 'risiko', 'verlust'],
    order: 26
  },

  // Marketing und Sichtbarkeit
  {
    category: '🏪 Direktvermarkter - Marketing',
    question: 'Wie wird für meine Produkte geworben?',
    answer: '• Präsentation deines Betriebs neben dem Verkaufsregal\n• Erwähnung in unseren Social Media Kanälen\n• Auflistung auf unserer Website\n• Teilnahme an besonderen Aktionen und Verkostungen\n• Optional: Social Media Spotlight (20€/Woche)',
    keywords: ['werbung', 'marketing', 'social media', 'präsentation', 'website'],
    order: 27
  },
  {
    category: '🏪 Direktvermarkter - Marketing',
    question: 'Kann ich Verkostungen oder Events machen?',
    answer: 'Ja! Wir organisieren regelmäßig Events und Verkostungen. Als Mieter hast du bevorzugten Zugang zu diesen Marketingmöglichkeiten.',
    keywords: ['verkostung', 'events', 'veranstaltung', 'marketing', 'promotion'],
    order: 28
  },
  {
    category: '🏪 Direktvermarkter - Marketing',
    question: 'Darf ich meine eigenen Werbematerialien aufstellen?',
    answer: 'In deinem Verkaufsbereich darfst du professionelle Werbematerialien aufstellen. Diese müssen vorher mit uns abgestimmt werden, um ein einheitliches Erscheinungsbild zu gewährleisten.',
    keywords: ['werbematerial', 'aufsteller', 'flyer', 'werbung', 'gestaltung'],
    order: 29
  },

  // ALLGEMEINE FRAGEN
  // Standort und Erreichbarkeit
  {
    category: '🏢 Allgemein - Standort',
    question: 'Wo genau liegt Housnkuh?',
    answer: 'Strauer Str. 15, 96317 Kronach (direkt in der Kronacher Innenstadt, neben der evangelischen Kirche)',
    keywords: ['adresse', 'standort', 'wo', 'kronach', 'strauer straße'],
    order: 30
  },
  {
    category: '🏢 Allgemein - Standort',
    question: 'Gibt es Parkmöglichkeiten?',
    answer: 'Ja, direkt vor dem Laden an der evangelischen Kirche, in der Andreas-Limmer-Straße (50m entfernt) und entlang der Strauer Straße nach der Bushaltestelle.',
    keywords: ['parken', 'parkplatz', 'auto', 'parkmöglichkeiten'],
    order: 31
  },
  {
    category: '🏢 Allgemein - Standort',
    question: 'Ist der Laden barrierefrei?',
    answer: 'Leider nein, der Zugang erfolgt über eine Treppe. Wir arbeiten an Lösungen für Menschen mit eingeschränkter Mobilität.',
    keywords: ['barrierefrei', 'rollstuhl', 'treppe', 'zugang', 'behinderung'],
    order: 32
  },
  {
    category: '🏢 Allgemein - Standort',
    question: 'Gibt es öffentliche Verkehrsmittel?',
    answer: 'Ja, die Bushaltestelle "Strauer Straße" ist direkt vor dem Laden.',
    keywords: ['bus', 'öpnv', 'verkehrsmittel', 'haltestelle', 'erreichbarkeit'],
    order: 33
  },

  // Sicherheit und Hygiene
  {
    category: '🏢 Allgemein - Sicherheit',
    question: 'Wie sicher ist das Einkaufen ohne Personal?',
    answer: 'Sehr sicher! Wir haben ein professionelles Überwachungssystem mit 6 Kameras, Zugangskontrolle und Alarmanlage. Der Zugang ist nur mit gültiger Bankkarte möglich.',
    keywords: ['sicherheit', 'überwachung', 'kameras', 'alarm', 'zugang'],
    order: 34
  },
  {
    category: '🏢 Allgemein - Sicherheit',
    question: 'Wie wird die Hygiene bei Lebensmitteln gewährleistet?',
    answer: 'Wir haben ein HACCP-Konzept implementiert mit täglichen Temperaturkontrollen und regelmäßigen Hygienekontrollen. Alle Direktvermarkter sind für ihre Produkthygiene selbst verantwortlich.',
    keywords: ['hygiene', 'haccp', 'temperatur', 'kontrolle', 'sauberkeit'],
    order: 35
  },
  {
    category: '🏢 Allgemein - Sicherheit',
    question: 'Was passiert bei technischen Problemen?',
    answer: 'Unser Kassensystem hat einen 24/7-Support. Bei größeren Problemen wird der Laden vorübergehend geschlossen und alle Mieter benachrichtigt.',
    keywords: ['technik', 'problem', 'kasse', 'support', 'störung'],
    order: 36
  },

  // Nachhaltigkeit
  {
    category: '🏢 Allgemein - Nachhaltigkeit',
    question: 'Wie nachhaltig ist Housnkuh?',
    answer: 'Sehr nachhaltig! Durch regionale Produkte entstehen kurze Transportwege. Wir fördern lokale Wirtschaftskreisläufe und unterstützen nachhaltige Landwirtschaft. Verpackungen werden möglichst reduziert.',
    keywords: ['nachhaltig', 'umwelt', 'regional', 'ökologisch', 'transport'],
    order: 37
  },
  {
    category: '🏢 Allgemein - Nachhaltigkeit',
    question: 'Was passiert mit nicht verkauften Produkten?',
    answer: 'Nicht verkaufte Produkte gehen zurück an die Direktvermarkter. Wir arbeiten an Kooperationen mit lokalen Tafeln für noch genießbare Lebensmittel.',
    keywords: ['reste', 'tafel', 'verschwendung', 'unverkauft', 'lebensmittel'],
    order: 38
  },

  // Kontakt und Support
  {
    category: '📞 Kontakt',
    question: 'Wie kann ich Housnkuh kontaktieren?',
    answer: '• E-Mail: info@housnkuh.de\n• Telefon: 0157 35711257\n• Website: www.housnkuh.de\n• Social Media: @housnkuh (Instagram, Facebook)\n• Adresse: Strauer Str. 15, 96317 Kronach',
    keywords: ['kontakt', 'email', 'telefon', 'adresse', 'social media'],
    order: 39
  },
  {
    category: '📞 Kontakt',
    question: 'Gibt es einen Newsletter?',
    answer: 'Ja! Melde dich auf unserer Website an und erhalte regelmäßig Informationen über neue Produzenten, besondere Aktionen und Events.',
    keywords: ['newsletter', 'anmeldung', 'info', 'neuigkeiten', 'aktuell'],
    order: 40
  },
  {
    category: '📞 Kontakt',
    question: 'Kann ich Feedback geben oder Verbesserungsvorschläge machen?',
    answer: 'Unbedingt! Wir freuen uns über jedes Feedback. Schreib uns eine E-Mail oder nutze unsere Social Media Kanäle.',
    keywords: ['feedback', 'vorschlag', 'verbesserung', 'meinung', 'kritik'],
    order: 41
  },

  // NOTFÄLLE UND PROBLEME
  {
    category: '🚨 Notfälle',
    question: 'Was mache ich, wenn die Kasse nicht funktioniert?',
    answer: 'Kontaktiere uns sofort unter 0157 35711257. Bei größeren Problemen schließen wir den Laden vorübergehend.',
    keywords: ['kasse', 'defekt', 'notfall', 'problem', 'funktioniert nicht'],
    order: 42
  },
  {
    category: '🚨 Notfälle',
    question: 'Was passiert, wenn ich im Laden eingeschlossen werde?',
    answer: 'Das ist technisch nicht möglich - der Ausgang ist immer frei zugänglich. Bei Problemen kontaktiere uns unter der Notfallnummer.',
    keywords: ['eingeschlossen', 'notfall', 'ausgang', 'tür', 'verlassen'],
    order: 43
  },
  {
    category: '🚨 Notfälle',
    question: 'An wen wende ich mich bei Beschwerden?',
    answer: 'Direkt an uns: info@housnkuh.de oder 0157 35711257. Wir kümmern uns um eine schnelle Lösung.',
    keywords: ['beschwerde', 'problem', 'reklamation', 'unzufrieden', 'hilfe'],
    order: 44
  }
];

async function seedFAQs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing FAQs
    await FAQ.deleteMany({});
    console.log('Cleared existing FAQs');

    // Insert new FAQs
    const result = await FAQ.insertMany(faqData);
    console.log(`Successfully inserted ${result.length} FAQs`);

    // Verify by categories
    const categories = await FAQ.distinct('category');
    console.log('\nCategories created:');
    for (const category of categories) {
      const count = await FAQ.countDocuments({ category });
      console.log(`- ${category}: ${count} questions`);
    }

    console.log('\nFAQ seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding FAQs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedFAQs();