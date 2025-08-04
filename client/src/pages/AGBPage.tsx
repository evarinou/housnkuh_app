// client/src/pages/AGBPage.tsx
import React from 'react';
import { FileText, Users, ShoppingCart, CreditCard, AlertTriangle, Shield, Building, Scale } from 'lucide-react';

const AGBPage: React.FC = () => {
  return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-secondary">Allgemeine Geschäftsbedingungen (AGB)</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            für Direktvermarkter der housnkuh
          </p>
          <p className="text-lg text-gray-500 mt-2">
            Stand: April 2025
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-12">
          {/* § 1 Geltungsbereich */}
          <section>
            <div className="flex items-center mb-6">
              <Users className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">§ 1 Geltungsbereich und Vertragspartner</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 mb-4">
                  (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") gelten für alle Verträge zwischen
                </p>
                <div className="bg-primary/10 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-secondary">housnkuh</p>
                  <p className="text-gray-700">Eva-Maria Schaller</p>
                  <p className="text-gray-700">Strauer Str. 15</p>
                  <p className="text-gray-700">96317 Kronach</p>
                  <p className="text-gray-700">(nachfolgend "Betreiber")</p>
                </div>
                <p className="text-gray-700 mb-4">
                  und den gewerblichen Mietern von Verkaufsflächen (nachfolgend "Direktvermarkter") im Selbstbedienungsladen housnkuh.
                </p>
                <p className="text-gray-700 mb-4">
                  (2) Diese AGB regeln ausschließlich das Rechtsverhältnis zwischen dem Betreiber und den Direktvermarktern. Das Rechtsverhältnis zwischen Direktvermarktern und Endkunden wird durch diese AGB nicht berührt.
                </p>
                <p className="text-gray-700">
                  (3) Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des Direktvermarkters werden nur dann und insoweit Vertragsbestandteil, als der Betreiber ihrer Geltung ausdrücklich schriftlich zugestimmt hat.
                </p>
              </div>
            </div>
          </section>

          {/* § 2 Vertragsgegenstand */}
          <section>
            <div className="flex items-center mb-6">
              <ShoppingCart className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">§ 2 Vertragsgegenstand und Leistungsumfang</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 mb-4">
                  (1) Der Betreiber stellt dem Direktvermarkter verschiedene Verkaufsflächen im Selbstbedienungsladen zur Verfügung.
                </p>
                <p className="text-gray-700 mb-4">
                  (2) Der Betreiber bietet zwei Vertragsmodelle an:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-secondary mb-3">Basismodell (4% Provision)</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li>• Verkauf über das housnkuh-Kassensystem</li>
                      <li>• Tägliche Verkaufsübersicht</li>
                      <li>• Kartenzahlungsgebühren inklusive</li>
                      <li>• Kein Diebstahlschutz (Warenrisiko trägt der Direktvermarkter)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-secondary mb-3">Premium-Modell (7% Provision)</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li>• Alle Leistungen des Basismodells</li>
                      <li>• Diebstahlschutz (Risiko wird von housnkuh getragen)</li>
                      <li>• Automatisierte Bestandsführung</li>
                      <li>• Kartenzahlungsgebühren inklusive</li>
                    </ul>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">
                  (3) Die konkrete Lage und Größe der gemieteten Verkaufsfläche sowie das gewählte Modell werden im individuellen Mietvertrag festgelegt.
                </p>
                
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-secondary mb-3">(4) Zusätzlich buchbare Leistungen:</h3>
                  <ul className="text-gray-700 space-y-1">
                    <li>• Lagerservice mit Warenauffüllung und MHD-Kontrolle</li>
                    <li>• Schaufensterplätze</li>
                    <li>• Weitere Leistungen gemäß aktueller Preisliste</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* § 3 Vertragsschluss */}
          <section>
            <div className="flex items-center mb-6">
              <Building className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">§ 3 Vertragsschluss und Probezeit</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 mb-4">
                  (1) Der Vertrag kommt durch Annahme des Angebots des Direktvermarkters durch den Betreiber zustande. Die Annahme kann erfolgen durch:
                </p>
                <ul className="text-gray-700 space-y-2 mb-4 ml-4">
                  <li>• Schriftliche Bestätigung</li>
                  <li>• Verbindliche Buchung über die Online-Plattform unter Bestätigung dieser AGB</li>
                  <li>• Bereitstellung der Verkaufsfläche</li>
                </ul>
                <p className="text-gray-700 mb-4 italic">
                  Die Buchungsbestätigung mit allen individuellen Vertragsdaten ersetzt einen separaten Mietvertrag.
                </p>
                
                <div className="bg-green-100 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(2) 30-tägige kostenlose Probezeit</h3>
                  <p className="text-gray-700 mb-3">
                    Neuen Direktvermarktern wird eine <strong>30-tägige kostenlose Probezeit</strong> gewährt. Während dieser Zeit gelten folgende Sonderregelungen:
                  </p>
                  <ul className="text-gray-700 space-y-2 ml-4">
                    <li>• Keine Mietgebühren für die Verkaufsfläche</li>
                    <li>• Provision gemäß gewähltem Modell fällt regulär an</li>
                    <li>• Jederzeitige Kündigung ohne Einhaltung einer Frist möglich</li>
                    <li>• Automatische Umwandlung in einen regulären Vertrag nach Ablauf der Probezeit, sofern nicht gekündigt wurde</li>
                  </ul>
                </div>
                
                <p className="text-gray-700 mb-4">
                  (3) Der Direktvermarkter muss gewerblich tätig und zur Lebensmittelabgabe berechtigt sein. Erforderliche Nachweise sind vor Vertragsbeginn vorzulegen.
                </p>
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-secondary mb-3">(4) Bei Online-Buchungen</h3>
                  <p className="text-gray-700 mb-3">
                    erhält der Direktvermarkter eine Buchungsbestätigung per E-Mail, die alle wesentlichen Vertragsdaten enthält:
                  </p>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Gewähltes Modell (Basis/Premium)</li>
                    <li>• Art und Anzahl der gebuchten Verkaufsflächen</li>
                    <li>• Monatliche Mietkosten</li>
                    <li>• Provisionssätze</li>
                    <li>• Vertragslaufzeit und Kündigungsfristen</li>
                    <li>• Beginn der Nutzung</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* § 4 Preise und Zahlungsbedingungen */}
          <section>
            <div className="flex items-center mb-6">
              <CreditCard className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">§ 4 Preise und Zahlungsbedingungen</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="font-semibold text-secondary mb-3">(1) Mietpreise</h3>
                    <p className="text-gray-700 mb-3">
                      Die Höhe der monatlichen Miete richtet sich nach der aktuellen Preisliste und wird im individuellen Mietvertrag festgelegt.
                    </p>
                    <div className="bg-green-100 rounded p-3 mb-2">
                      <p className="text-gray-700 text-sm">
                        <strong>Rabatte:</strong> Bei Vertragsabschluss für 6 Monate wird ein Rabatt von 5%, bei 12 Monaten ein Rabatt von 10% gewährt.
                      </p>
                    </div>
                    <p className="text-gray-700 text-sm font-semibold">
                      Alle Mietpreise verstehen sich netto zuzüglich der gesetzlichen Umsatzsteuer.
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="font-semibold text-secondary mb-3">(2) Provision</h3>
                    <p className="text-gray-700 mb-3">
                      Der Betreiber erhält eine Verkaufsprovision in Höhe von:
                    </p>
                    <ul className="text-gray-700 space-y-2 mb-3">
                      <li>• <strong>Basismodell:</strong> 4% des Bruttoumsatzes (zzgl. gesetzlicher Umsatzsteuer)</li>
                      <li>• <strong>Premium-Modell:</strong> 7% des Bruttoumsatzes (zzgl. gesetzlicher Umsatzsteuer)</li>
                    </ul>
                    <p className="text-gray-700 text-sm font-semibold">
                      Die Provision versteht sich als Nettobetrag. Auf die Provision wird die gesetzliche Umsatzsteuer (derzeit 19%) erhoben.
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(3) Abrechnung</h3>
                  <p className="text-gray-700 mb-3">
                    Die Abrechnung erfolgt monatlich. Der Betreiber erstellt eine Aufstellung über:
                  </p>
                  <ul className="text-gray-700 space-y-1 ml-4 mb-3">
                    <li>• Die verkauften Waren und erzielte Bruttoumsätze</li>
                    <li>• Die einbehaltene Provision (netto zzgl. USt.)</li>
                    <li>• Die Mietgebühren und gebuchte Zusatzleistungen (netto zzgl. USt.)</li>
                    <li>• Den an den Direktvermarkter auszuzahlenden Betrag</li>
                  </ul>
                  <p className="text-gray-700 text-sm font-semibold">
                    Alle Preise verstehen sich netto zuzüglich der gesetzlichen Umsatzsteuer.
                  </p>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(4) Auszahlung</h3>
                  <p className="text-gray-700">
                    Der Bruttoumsatz (inkl. der vom Endkunden gezahlten Umsatzsteuer) abzüglich der Provision wird spätestens zum 15. des Folgemonats an den Direktvermarkter überwiesen. <strong>Die Versteuerung der Umsätze obliegt ausschließlich dem Direktvermarkter.</strong>
                  </p>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-secondary mb-3">(5) Zahlungsverzug</h3>
                  <p className="text-gray-700">
                    Bei Zahlungsverzug von mehr als 14 Tagen ist der Betreiber berechtigt, die Verkaufsfläche zu sperren. Die Entsperrung erfolgt nach vollständigem Zahlungseingang.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* § 4a Rechnungsstellung */}
          <section>
            <div className="flex items-center mb-6">
              <Scale className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">§ 4a Rechnungsstellung im Auftrag</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-orange-100 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(1) Vollmacht zur Rechnungsstellung</h3>
                  <p className="text-gray-700">
                    Der Direktvermarkter erteilt dem Betreiber hiermit unwiderruflich für die Dauer des Vertragsverhältnisses die Vollmacht, in seinem Namen und für seine Rechnung Rechnungen an die Endkunden auszustellen.
                  </p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(2) Umfang der Vollmacht</h3>
                  <p className="text-gray-700 mb-3">Die Vollmacht umfasst:</p>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Die Ausstellung von Rechnungen für alle über das housnkuh-Kassensystem verkauften Waren</li>
                    <li>• Die Vergabe fortlaufender Rechnungsnummern pro Direktvermarkter</li>
                    <li>• Die Angabe aller gesetzlich erforderlichen Pflichtangaben gemäß § 14 UStG</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(3) Pflichten des Direktvermarkters</h3>
                  <p className="text-gray-700 mb-3">Der Direktvermarkter verpflichtet sich:</p>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Dem Betreiber alle für die Rechnungsstellung erforderlichen Daten (Steuernummer/USt-IdNr., korrekte Firmierung, Anschrift) mitzuteilen</li>
                    <li>• Die korrekten Umsatzsteuersätze für seine Produkte im System zu hinterlegen</li>
                    <li>• Änderungen seiner steuerlichen Daten unverzüglich mitzuteilen</li>
                    <li>• Die Verantwortung für die steuerliche Richtigkeit seiner Angaben zu tragen</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(4) Rechnungsabwicklung</h3>
                  <ul className="text-gray-700 space-y-2">
                    <li>• Der Endkunde erhält im Laden eine Sammelrechnung (Kassenbon)</li>
                    <li>• Die Einzelrechnungen der Direktvermarkter können vom Endkunden über das Online-Portal abgerufen werden</li>
                    <li>• Der Direktvermarkter erhält über das Portal Zugriff auf alle in seinem Namen ausgestellten Rechnungen</li>
                    <li>• Die Rechnungen werden für die gesetzlichen Aufbewahrungsfristen digital archiviert</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(5) Haftung und Steuerverantwortung</h3>
                  <ul className="text-gray-700 space-y-2">
                    <li>• Der Direktvermarkter stellt den Betreiber von allen Ansprüchen frei, die aus fehlerhaften Angaben zur Besteuerung seiner Produkte resultieren</li>
                    <li>• Der Betreiber haftet nur für die technisch korrekte Ausstellung der Rechnungen gemäß den Vorgaben des Direktvermarkters</li>
                    <li>• Die ordnungsgemäße Versteuerung der Umsätze liegt in der alleinigen Verantwortung des Direktvermarkters</li>
                    <li>• Der Betreiber agiert ausschließlich als technischer Dienstleister für die Rechnungsstellung</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-semibold text-secondary mb-3">(6) Widerruf</h3>
                  <p className="text-gray-700">
                    Die Vollmacht kann nur aus wichtigem Grund widerrufen werden. Mit Beendigung des Vertragsverhältnisses erlischt die Vollmacht automatisch.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* § 5 Nutzung */}
          <section>
            <div className="flex items-center mb-6">
              <AlertTriangle className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">§ 5 Nutzung der Verkaufsflächen</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-orange-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(1) Bestückung</h3>
                  <p className="text-gray-700">
                    Der Direktvermarkter ist verpflichtet, seine Verkaufsflächen regelmäßig zu bestücken und die Waren ordentlich zu präsentieren. Eine Unterbestückung von mehr als 50% über einen Zeitraum von mehr als 7 Tagen berechtigt den Betreiber zur außerordentlichen Kündigung.
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(2) Warenqualität</h3>
                  <p className="text-gray-700 mb-3">Der Direktvermarkter garantiert, dass alle angebotenen Waren:</p>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Den gesetzlichen Anforderungen entsprechen</li>
                    <li>• Ordnungsgemäß gekennzeichnet sind (Preis, MHD, Allergene etc.)</li>
                    <li>• Frisch und verkehrsfähig sind</li>
                    <li>• Aus legaler Herkunft stammen</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(3) Etikettierung</h3>
                  <p className="text-gray-700">
                    Der Direktvermarkter verwendet ausschließlich die vom Betreiber zur Verfügung gestellten Etiketten mit integrierten Barcodes für das Kassensystem.
                  </p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-secondary mb-3">(4) Zugangsberechtigung</h3>
                  <p className="text-gray-700">
                    Der Direktvermarkter erhält Zugang zum Laden während der Öffnungszeiten. Die Zugangsberechtigung ist personengebunden und nicht übertragbar.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* § 6 Alkoholverkauf */}
          <section>
            <div className="flex items-center mb-6">
              <Shield className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">§ 6 Alkoholverkauf</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-red-100 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 mb-4">
                    (1) Der Verkauf von alkoholischen Getränken ist nur im speziell abgetrennten Alkoholbereich gestattet.
                  </p>
                  <p className="text-gray-700 mb-4">
                    (2) Der Direktvermarkter verpflichtet sich:
                  </p>
                  <ul className="text-gray-700 space-y-1 ml-4 mb-4">
                    <li>• Nur an den dafür vorgesehenen Plätzen Alkohol anzubieten</li>
                    <li>• Alle Produkte mit deutlichen Altershinweisen zu versehen</li>
                    <li>• Die gesetzlichen Bestimmungen zum Jugendschutz einzuhalten</li>
                  </ul>
                  <p className="text-gray-700 mb-4">
                    (3) Der Zutritt zum Alkoholbereich erfolgt ausschließlich nach Altersverifikation mittels Personalausweis oder Reisepass über das automatische Zugangssystem.
                  </p>
                  <p className="text-gray-700 font-bold">
                    (4) Verstöße gegen die Regelungen zum Alkoholverkauf führen zur sofortigen Kündigung des Vertragsverhältnisses.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* § 7 Haftung */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">§ 7 Haftung und Gewährleistung</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(1) Produkthaftung</h3>
                  <p className="text-gray-700 mb-3">
                    Der Direktvermarkter haftet vollumfänglich für seine Produkte gegenüber den Endkunden. Dies umfasst insbesondere:
                  </p>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Produktqualität und Frische</li>
                    <li>• Korrekte Kennzeichnung</li>
                    <li>• Einhaltung lebensmittelrechtlicher Vorschriften</li>
                    <li>• Schäden durch mangelhafte Produkte</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(2) Diebstahlrisiko</h3>
                  <ul className="text-gray-700 space-y-2">
                    <li>• <strong>Basismodell:</strong> Der Direktvermarkter trägt das vollständige Risiko für Warenverluste durch Diebstahl</li>
                    <li>• <strong>Premium-Modell:</strong> Der Betreiber übernimmt das Diebstahlrisiko ohne Begrenzung der Höhe</li>
                  </ul>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(3) Reklamationen</h3>
                  <p className="text-gray-700 mb-3">Bei Reklamationen oder Retouren von Endkunden:</p>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Ist der Direktvermarkter erster Ansprechpartner</li>
                    <li>• Haftet der Betreiber in keinem Fall für Produktmängel</li>
                    <li>• Bereits einbehaltene Provisionen werden nicht erstattet</li>
                  </ul>
                </div>
                
                <div className="bg-gray-100 rounded-lg p-4">
                  <h3 className="font-semibold text-secondary mb-3">(4) Haftungsbeschränkung des Betreibers</h3>
                  <p className="text-gray-700">
                    Die Haftung des Betreibers ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Dies gilt nicht für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* § 8 Lagerservice */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">§ 8 Lagerservice (Zusatzleistung)</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(1) Beim gebuchten Lagerservice übernimmt der Betreiber:</h3>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Regelmäßige Auffüllung der Verkaufsflächen</li>
                    <li>• Kontrolle der Mindesthaltbarkeitsdaten</li>
                    <li>• Entfernung abgelaufener Waren</li>
                    <li>• Benachrichtigung bei niedrigen Lagerbeständen</li>
                  </ul>
                </div>
                
                <p className="text-gray-700 mb-4">
                  (2) Der Direktvermarkter bleibt auch bei gebuchtem Lagerservice für die Qualität und Verkehrsfähigkeit seiner Waren verantwortlich.
                </p>
                
                <p className="text-gray-700">
                  (3) Die Kosten für den Lagerservice richten sich nach der aktuellen Preisliste.
                </p>
              </div>
            </div>
          </section>

          {/* § 9 Pflichten */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">§ 9 Pflichten des Direktvermarkters</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 mb-4">Der Direktvermarkter verpflichtet sich:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="text-gray-700 space-y-3">
                    <li>(1) Die gemieteten Flächen sauber und ordentlich zu halten</li>
                    <li>(2) Nur Waren anzubieten, die seinem angemeldeten Sortiment entsprechen</li>
                    <li>(3) Keine verdorbenen oder abgelaufenen Waren in den Verkaufsflächen zu belassen</li>
                    <li>(4) Die Hausordnung des Selbstbedienungsladens zu beachten</li>
                  </ul>
                  <ul className="text-gray-700 space-y-3">
                    <li>(5) Erforderliche Gewerbeanmeldungen und Genehmigungen vorzuhalten</li>
                    <li>(6) Eine gültige Betriebshaftpflichtversicherung abzuschließen und aufrechtzuerhalten</li>
                    <li>(7) Änderungen seiner Kontaktdaten unverzüglich mitzuteilen</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* § 10 Kündigung */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">§ 10 Vertragslaufzeit und Kündigung</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(1) Mindestvertragslaufzeit</h3>
                  <p className="text-gray-700">
                    Nach Ablauf der Probezeit beträgt die Mindestvertragslaufzeit 3 Monate.
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(2) Ordentliche Kündigung</h3>
                  <ul className="text-gray-700 space-y-2">
                    <li>• <strong>Während der Probezeit:</strong> jederzeit ohne Frist</li>
                    <li>• <strong>Nach der Probezeit:</strong> zum Monatsende mit einer Frist von 4 Wochen</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(3) Außerordentliche Kündigung</h3>
                  <p className="text-gray-700 mb-3">
                    Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Wichtige Gründe sind insbesondere:
                  </p>
                  <ul className="text-gray-700 space-y-1 ml-4">
                    <li>• Zahlungsverzug über 30 Tage</li>
                    <li>• Wiederholte Verstöße gegen diese AGB</li>
                    <li>• Anbieten gesundheitsschädlicher oder illegaler Waren</li>
                    <li>• Manipulation des Kassensystems</li>
                    <li>• Unterbestückung der Verkaufsflächen</li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(4) Form</h3>
                  <p className="text-gray-700">
                    Kündigungen bedürfen der Textform (E-Mail ausreichend).
                  </p>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-secondary mb-3">(5) Räumung</h3>
                  <p className="text-gray-700">
                    Nach Vertragsende sind die Verkaufsflächen innerhalb von 3 Werktagen vollständig zu räumen. Nicht abgeholte Waren können nach Ablauf dieser Frist auf Kosten des Direktvermarkters entsorgt werden.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* § 11 Datenschutz */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">§ 11 Datenschutz</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-4">
                    (1) Der Betreiber verarbeitet personenbezogene Daten des Direktvermarkters nur im Rahmen der Vertragserfüllung und nach Maßgabe der DSGVO.
                  </p>
                  <p className="text-gray-700 mb-4">
                    (2) Verkaufsdaten werden ausschließlich zur Abrechnung und zur Bereitstellung von Verkaufsstatistiken an den jeweiligen Direktvermarkter verwendet.
                  </p>
                  <p className="text-gray-700 mb-4">
                    (3) Eine Weitergabe von Daten an Dritte erfolgt nur mit ausdrücklicher Einwilligung oder soweit gesetzlich erforderlich.
                  </p>
                  <p className="text-gray-700">
                    (4) Details zur Datenverarbeitung sind der separaten Datenschutzerklärung zu entnehmen.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* § 12 Wettbewerbsverbot */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">§ 12 Wettbewerbsverbot</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-gray-700">
                    Ein Wettbewerbsverbot besteht nicht. Direktvermarkter dürfen ihre Produkte auch über andere Vertriebswege anbieten.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* § 13 Änderungen */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">§ 13 Änderungen der AGB</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <p className="text-gray-700 mb-4">
                  (1) Der Betreiber behält sich vor, diese AGB bei Bedarf anzupassen. Änderungen werden dem Direktvermarkter mindestens 6 Wochen vor Inkrafttreten in Textform mitgeteilt.
                </p>
                <p className="text-gray-700 mb-4">
                  (2) Widerspricht der Direktvermarkter den geänderten Bedingungen nicht innerhalb von 4 Wochen nach Zugang der Änderungsmitteilung, gelten die geänderten AGB als angenommen.
                </p>
                <p className="text-gray-700">
                  (3) Im Falle eines Widerspruchs hat jede Partei das Recht, den Vertrag zum Zeitpunkt des Inkrafttretens der Änderungen zu kündigen.
                </p>
              </div>
            </div>
          </section>

          {/* § 14 Schlussbestimmungen */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">§ 14 Schlussbestimmungen</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(1) Schriftform</h3>
                  <p className="text-gray-700">
                    Änderungen und Ergänzungen dieser AGB bedürfen der Schriftform. Dies gilt auch für die Aufhebung dieses Schriftformerfordernisses.
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(2) Salvatorische Klausel</h3>
                  <p className="text-gray-700">
                    Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, wird dadurch die Wirksamkeit der übrigen Bestimmungen nicht berührt. Die Parteien verpflichten sich, die unwirksame Bestimmung durch eine wirksame zu ersetzen, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.
                  </p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-secondary mb-3">(3) Gerichtsstand</h3>
                  <p className="text-gray-700">
                    Gerichtsstand für alle Streitigkeiten aus diesem Vertragsverhältnis ist, soweit gesetzlich zulässig, Kronach.
                  </p>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-secondary mb-3">(4) Anwendbares Recht</h3>
                  <p className="text-gray-700">
                    Es gilt das Recht der Bundesrepublik Deutschland.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Contact Information */}
        <div className="bg-primary/10 rounded-lg p-6 mt-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-secondary mb-4">Kontaktinformationen</h3>
            <div className="space-y-2">
              <p className="font-semibold text-secondary">housnkuh</p>
              <p className="text-gray-700">Eva-Maria Schaller</p>
              <p className="text-gray-700">Strauer Str. 15</p>
              <p className="text-gray-700">96317 Kronach</p>
              <div className="pt-3 space-y-1">
                <p className="text-gray-700">E-Mail: evam.schaller@gmail.com</p>
                <p className="text-gray-700">Telefon: 0157 35711257</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Stand: April 2025 | Version 2.0 - Für Direktvermarkter
          </p>
        </div>
      </div>
  );
};

export default AGBPage;