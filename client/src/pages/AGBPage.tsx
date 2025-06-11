// client/src/pages/AGBPage.tsx
import React from 'react';
import { FileText, Users, ShoppingCart, CreditCard, AlertTriangle } from 'lucide-react';

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
            Nutzungsbedingungen für die housnkuh-Plattform
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-10">
          {/* Geltungsbereich */}
          <section>
            <div className="flex items-center mb-6">
              <Users className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">1. Geltungsbereich und Vertragspartner</h2>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-secondary mb-2">1.1 Anbieter</h3>
                <p className="text-gray-700">
                  Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der housnkuh-Plattform, 
                  die von housnkuh, [Adresse], betrieben wird.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-secondary mb-2">1.2 Geltungsbereich</h3>
                <p className="text-gray-700">
                  Diese AGB gelten für alle Verträge zwischen housnkuh und den Nutzern der Plattform, 
                  insbesondere für Direktvermarkter (Anbieter) und Endkunden (Käufer).
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-secondary mb-2">1.3 Abweichende Bedingungen</h3>
                <p className="text-gray-700">
                  Abweichende, entgegenstehende oder ergänzende Geschäftsbedingungen des Nutzers werden nur 
                  dann Vertragsbestandteil, wenn housnkuh deren Geltung ausdrücklich schriftlich zustimmt.
                </p>
              </div>
            </div>
          </section>

          {/* Leistungsbeschreibung */}
          <section>
            <div className="flex items-center mb-6">
              <ShoppingCart className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">2. Leistungsbeschreibung</h2>
            </div>
            
            <div className="space-y-6">
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">2.1 Plattform-Dienste</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-3">
                    housnkuh stellt eine Online-Plattform zur Verfügung, die regionale Direktvermarkter 
                    mit Endkunden verbindet. Die Plattform umfasst:
                  </p>
                  <ul className="text-gray-600 space-y-1 ml-4">
                    <li>• Präsentation von Direktvermarktern und deren Produkten</li>
                    <li>• Vermittlung von Verkaufsflächen und Standorten</li>
                    <li>• Tools für Buchung und Verwaltung von Mietflächen</li>
                    <li>• Kommunikationstools zwischen Anbietern und Kunden</li>
                    <li>• Administrative Tools für Direktvermarkter</li>
                  </ul>
                </div>
              </div>
              
              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">2.2 Für Direktvermarkter</h3>
                <div className="bg-green-50 rounded-lg p-4">
                  <ul className="text-gray-700 space-y-2">
                    <li>• <strong>Kostenloser Probemonat:</strong> 30 Tage kostenloses Testen aller Funktionen</li>
                    <li>• <strong>Profil-Erstellung:</strong> Präsentation des Betriebs und der Produkte</li>
                    <li>• <strong>Flächenbuchung:</strong> Reservierung von Verkaufsflächen an Standorten</li>
                    <li>• <strong>Verwaltungstools:</strong> Dashboard für Buchungen, Termine und Kunden</li>
                    <li>• <strong>Support:</strong> Technische und betriebliche Unterstützung</li>
                  </ul>
                </div>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">2.3 Für Endkunden</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <ul className="text-gray-700 space-y-2">
                    <li>• <strong>Kostenlose Nutzung:</strong> Suche und Kontaktaufnahme ohne Gebühren</li>
                    <li>• <strong>Direktvermarkter-Suche:</strong> Finden von regionalen Anbietern</li>
                    <li>• <strong>Standort-Information:</strong> Übersicht über Verkaufsstellen und Märkte</li>
                    <li>• <strong>Newsletter:</strong> Informationen über neue Anbieter und Angebote</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Registrierung und Nutzerkonto */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">3. Registrierung und Nutzerkonto</h2>
            
            <div className="space-y-6">
              <div className="bg-orange-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">3.1 Registrierungsvoraussetzungen</h3>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>Direktvermarkter:</strong> Registrierung nur für gewerbliche Anbieter mit gültiger 
                    Betriebsnummer oder entsprechender Berechtigung zum Verkauf regionaler Produkte.
                  </p>
                  <p className="text-gray-700">
                    <strong>Vollständige Angaben:</strong> Alle Pflichtfelder müssen wahrheitsgemäß ausgefüllt werden.
                  </p>
                  <p className="text-gray-700">
                    <strong>Mindestalter:</strong> Nutzer müssen mindestens 18 Jahre alt sein.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">3.2 Kontoverantwortung</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Der Nutzer ist für die Geheimhaltung seiner Zugangsdaten verantwortlich</li>
                  <li>• Bei Verdacht auf Missbrauch ist housnkuh unverzüglich zu informieren</li>
                  <li>• Pro Person/Betrieb ist nur ein Nutzerkonto zulässig</li>
                  <li>• Falsche Angaben können zur Sperrung des Kontos führen</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Preise und Zahlungsbedingungen */}
          <section>
            <div className="flex items-center mb-6">
              <CreditCard className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">4. Preise und Zahlungsbedingungen</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">4.1 Probemonat</h3>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>Kostenlos:</strong> Der erste Monat ist für Direktvermarkter vollständig kostenfrei.
                  </p>
                  <p className="text-gray-700">
                    <strong>Kündigung:</strong> Jederzeit während des Probemonats ohne Angabe von Gründen möglich.
                  </p>
                  <p className="text-gray-700">
                    <strong>Automatische Verlängerung:</strong> Nach dem Probemonat wird das gewählte Paket kostenpflichtig.
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">4.2 Kostenpflichtige Pakete</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-secondary mb-2">Mietflächen</h4>
                    <p className="text-gray-700 text-sm">
                      Monatliche Miete je nach Standort und Flächengröße. 
                      Preise werden transparent vor Buchung angezeigt.
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-secondary mb-2">Service-Gebühren</h4>
                    <p className="text-gray-700 text-sm">
                      Zusätzliche Leistungen wie Premium-Support oder 
                      erweiterte Funktionen gegen Aufpreis.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">4.3 Zahlungsmodalitäten</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• <strong>Zahlungsweise:</strong> Monatliche Abrechnung per SEPA-Lastschrift oder Überweisung</li>
                  <li>• <strong>Fälligkeit:</strong> Zahlung ist zum Monatsende im Voraus fällig</li>
                  <li>• <strong>Verzug:</strong> Bei Zahlungsverzug werden Mahngebühren erhoben</li>
                  <li>• <strong>Preisänderungen:</strong> Werden 30 Tage im Voraus angekündigt</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Pflichten der Nutzer */}
          <section>
            <div className="flex items-center mb-6">
              <AlertTriangle className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">5. Pflichten und Verbote</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-red-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">5.1 Verbotene Handlungen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="text-gray-700 space-y-2">
                    <li>• Falsche oder irreführende Angaben</li>
                    <li>• Verletzung von Urheberrechten</li>
                    <li>• Belästigung anderer Nutzer</li>
                    <li>• Spam oder unerwünschte Werbung</li>
                  </ul>
                  <ul className="text-gray-700 space-y-2">
                    <li>• Manipulation der Plattform</li>
                    <li>• Verkauf illegaler Produkte</li>
                    <li>• Umgehung von Sicherheitsmaßnahmen</li>
                    <li>• Mehrfachregistrierungen</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">5.2 Direktvermarkter-Pflichten</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• <strong>Aktualität:</strong> Profil- und Produktdaten stets aktuell halten</li>
                  <li>• <strong>Erreichbarkeit:</strong> Angegebene Kontaktdaten müssen funktionsfähig sein</li>
                  <li>• <strong>Rechtmäßigkeit:</strong> Nur legal erworbene/produzierte Waren anbieten</li>
                  <li>• <strong>Qualität:</strong> Beworbene Qualitätsstandards einhalten</li>
                  <li>• <strong>Termine:</strong> Vereinbarte Verkaufstermine zuverlässig einhalten</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Kündigung */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">6. Kündigung und Sperrung</h2>
            
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">6.1 Ordentliche Kündigung</h3>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>Probemonat:</strong> Jederzeit ohne Kündigungsfrist möglich
                  </p>
                  <p className="text-gray-700">
                    <strong>Kostenpflichtige Nutzung:</strong> Zum Monatsende mit 14 Tagen Kündigungsfrist
                  </p>
                  <p className="text-gray-700">
                    <strong>Form:</strong> Kündigung per E-Mail oder über das Dashboard möglich
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">6.2 Außerordentliche Kündigung</h3>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>Wichtiger Grund:</strong> Bei schwerwiegenden Vertragsverletzungen
                  </p>
                  <p className="text-gray-700">
                    <strong>Beispiele:</strong> Zahlungsverzug über 30 Tage, Verstöße gegen diese AGB, 
                    illegale Nutzung der Plattform
                  </p>
                  <p className="text-gray-700">
                    <strong>Folgen:</strong> Sofortige Sperrung des Zugangs, keine Rückerstattung bereits gezahlter Beträge
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Haftung */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">7. Haftung und Gewährleistung</h2>
            
            <div className="space-y-6">
              <div className="bg-yellow-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">7.1 Haftungsbeschränkung</h3>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>Plattform-Verfügbarkeit:</strong> housnkuh strebt eine hohe Verfügbarkeit an, 
                    garantiert jedoch keine 100%ige Erreichbarkeit.
                  </p>
                  <p className="text-gray-700">
                    <strong>Inhalte Dritter:</strong> Für Inhalte von Direktvermarktern übernimmt housnkuh 
                    keine Verantwortung.
                  </p>
                  <p className="text-gray-700">
                    <strong>Geschäfte zwischen Nutzern:</strong> housnkuh ist nicht Vertragspartner bei 
                    Geschäften zwischen Direktvermarktern und Endkunden.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">7.2 Gewährleistung</h3>
                <p className="text-gray-700">
                  housnkuh gewährleistet die Erbringung der Dienste mit der geschuldeten Sorgfalt. 
                  Bei Mängeln wird housnkuh diese nach Möglichkeit beheben. Weitergehende 
                  Gewährleistungsansprüche sind ausgeschlossen, soweit gesetzlich zulässig.
                </p>
              </div>
            </div>
          </section>

          {/* Datenschutz */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">8. Datenschutz</h2>
            
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Einzelheiten zur 
                Datenverarbeitung finden Sie in unserer 
                <a href="/datenschutz" className="text-primary hover:underline font-medium mx-1">
                  Datenschutzerklärung
                </a>
                , die Bestandteil dieser AGB ist.
              </p>
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-secondary mb-2">Wichtige Grundsätze</h3>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Datenverarbeitung nur nach DSGVO</li>
                  <li>• Keine Weitergabe an Dritte ohne Einwilligung</li>
                  <li>• Sichere Übertragung und Speicherung</li>
                  <li>• Jederzeit Auskunft, Berichtigung und Löschung möglich</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Schlussbestimmungen */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">9. Schlussbestimmungen</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">9.1 Änderung der AGB</h3>
                <p className="text-gray-700">
                  housnkuh behält sich vor, diese AGB bei wichtigem Grund zu ändern. 
                  Änderungen werden 30 Tage vor Inkrafttreten per E-Mail mitgeteilt. 
                  Widerspricht der Nutzer nicht innerhalb von 14 Tagen, gelten die 
                  neuen AGB als akzeptiert.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">9.2 Rechtswahl und Gerichtsstand</h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Anwendbares Recht:</strong> Es gilt ausschließlich deutsches Recht</p>
                  <p><strong>Gerichtsstand:</strong> [Gerichtsstand am Firmensitz]</p>
                  <p><strong>Verbraucher:</strong> Gesetzliche Bestimmungen zum Verbrauchergerichtsstand bleiben unberührt</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">9.3 Salvatorische Klausel</h3>
                <p className="text-gray-700">
                  Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, 
                  bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Die unwirksame 
                  Bestimmung wird durch eine wirksame Regelung ersetzt, die dem 
                  wirtschaftlichen Zweck am nächsten kommt.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Stand: {new Date().toLocaleDateString('de-DE')} | Version 1.0
          </p>
        </div>
      </div>

  );
};

export default AGBPage;