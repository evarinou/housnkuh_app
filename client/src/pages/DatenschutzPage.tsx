// client/src/pages/DatenschutzPage.tsx
import React from 'react';
import { Shield, Lock, Eye, Database, Mail, Phone } from 'lucide-react';

const DatenschutzPage: React.FC = () => {
  return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-secondary">Datenschutzerklärung</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Informationen zum Datenschutz gemäß DSGVO (EU-Datenschutz-Grundverordnung)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-10">
          {/* Verantwortlicher */}
          <section>
            <div className="flex items-center mb-6">
              <Database className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">1. Verantwortlicher</h2>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Verantwortlicher im Sinne der DSGVO ist:
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>housnkuh</strong></p>
                <p>[Straße und Hausnummer]</p>
                <p>[PLZ Ort]</p>
                <p>Deutschland</p>
                <div className="mt-4 space-y-1">
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
          </section>

          {/* Grundsätze der Datenverarbeitung */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">2. Grundsätze der Datenverarbeitung</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <Lock className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-secondary mb-2">Rechtmäßigkeit</h3>
                <p className="text-gray-700 text-sm">
                  Wir verarbeiten personenbezogene Daten nur auf Grundlage gesetzlicher Erlaubnistatbestände.
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-6">
                <Eye className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-secondary mb-2">Transparenz</h3>
                <p className="text-gray-700 text-sm">
                  Sie werden über die Verarbeitung Ihrer Daten vollständig und verständlich informiert.
                </p>
              </div>
            </div>
            
            <div className="mt-6 bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-secondary mb-3">Weitere Grundsätze</h3>
              <ul className="text-gray-700 space-y-2">
                <li>• <strong>Zweckbindung:</strong> Daten werden nur für festgelegte, eindeutige Zwecke verarbeitet</li>
                <li>• <strong>Datenminimierung:</strong> Nur notwendige Daten werden verarbeitet</li>
                <li>• <strong>Richtigkeit:</strong> Daten werden aktuell und korrekt gehalten</li>
                <li>• <strong>Speicherbegrenzung:</strong> Daten werden nur so lange gespeichert wie notwendig</li>
                <li>• <strong>Sicherheit:</strong> Angemessene technische und organisatorische Maßnahmen</li>
              </ul>
            </div>
          </section>

          {/* Datenverarbeitung auf unserer Website */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">3. Datenverarbeitung auf unserer Website</h2>
            
            <div className="space-y-6">
              {/* Server-Log-Dateien */}
              <div className="border-l-4 border-primary pl-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">Server-Log-Dateien</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-3">
                    <strong>Zweck:</strong> Technischer Betrieb und Sicherheit der Website
                  </p>
                  <p className="text-gray-700 mb-3">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
                  </p>
                  <p className="text-gray-700 mb-3">
                    <strong>Gespeicherte Daten:</strong>
                  </p>
                  <ul className="text-gray-600 text-sm space-y-1 ml-4">
                    <li>• IP-Adresse des zugreifenden Rechners</li>
                    <li>• Datum und Uhrzeit des Zugriffs</li>
                    <li>• Name und URL der abgerufenen Datei</li>
                    <li>• Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>
                    <li>• Verwendeter Browser und ggf. das Betriebssystem</li>
                  </ul>
                  <p className="text-gray-700 mt-3">
                    <strong>Speicherdauer:</strong> 7 Tage, anschließend automatische Löschung
                  </p>
                </div>
              </div>

              {/* Cookies */}
              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">Cookies</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 mb-3">
                    <strong>Zweck:</strong> Verbesserte Nutzererfahrung und Funktionalität
                  </p>
                  <p className="text-gray-700 mb-3">
                    <strong>Arten von Cookies:</strong>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded p-3">
                      <p className="font-medium text-secondary">Technisch notwendige Cookies</p>
                      <p className="text-sm text-gray-600">Session-Management, Login-Status</p>
                      <p className="text-xs text-gray-500 mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO</p>
                    </div>
                    <div className="bg-white rounded p-3">
                      <p className="font-medium text-secondary">Funktionale Cookies</p>
                      <p className="text-sm text-gray-600">Sprach- und Layouteinstellungen</p>
                      <p className="text-xs text-gray-500 mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mt-3">
                    Sie können Cookies in Ihrem Browser jederzeit löschen oder deren Annahme verweigern.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Registrierung und Nutzerkonto */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">4. Registrierung und Nutzerkonto</h2>
            
            <div className="space-y-6">
              {/* Vendor-Registrierung */}
              <div className="bg-orange-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">Direktvermarkter-Registrierung</h3>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>Zweck:</strong> Bereitstellung der Plattform-Funktionen für Direktvermarkter
                  </p>
                  <p className="text-gray-700">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Vertragsdurchführung)
                  </p>
                  <p className="text-gray-700">
                    <strong>Verarbeitete Daten:</strong>
                  </p>
                  <ul className="text-gray-600 space-y-1 ml-4">
                    <li>• Name und Firmenbezeichnung</li>
                    <li>• E-Mail-Adresse</li>
                    <li>• Telefonnummer</li>
                    <li>• Adresse des Betriebs</li>
                    <li>• Produktkategorien und Angebote</li>
                    <li>• Profilbild (optional)</li>
                  </ul>
                  <p className="text-gray-700">
                    <strong>Speicherdauer:</strong> Solange das Nutzerkonto besteht oder gesetzliche Aufbewahrungsfristen bestehen
                  </p>
                </div>
              </div>

              {/* Newsletter */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-secondary mb-3">Newsletter-Anmeldung</h3>
                <div className="space-y-3">
                  <p className="text-gray-700">
                    <strong>Zweck:</strong> Versendung von Informationen über housnkuh und regionale Angebote
                  </p>
                  <p className="text-gray-700">
                    <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)
                  </p>
                  <p className="text-gray-700">
                    <strong>Verarbeitete Daten:</strong> E-Mail-Adresse, Anmeldezeitpunkt
                  </p>
                  <p className="text-gray-700">
                    <strong>Double-Opt-In:</strong> Bestätigung der Anmeldung per E-Mail erforderlich
                  </p>
                  <p className="text-gray-700">
                    <strong>Abmeldung:</strong> Jederzeit über Link in jeder E-Mail oder per Kontakt möglich
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Ihre Rechte */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">5. Ihre Rechte als betroffene Person</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-secondary mb-3">Auskunftsrecht (Art. 15 DSGVO)</h3>
                <p className="text-gray-700 text-sm">
                  Sie haben das Recht, Auskunft über die von uns verarbeiteten personenbezogenen Daten zu erhalten.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-secondary mb-3">Berichtigungsrecht (Art. 16 DSGVO)</h3>
                <p className="text-gray-700 text-sm">
                  Sie haben das Recht, die Berichtigung unrichtiger oder die Vervollständigung Ihrer Daten zu verlangen.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-secondary mb-3">Löschungsrecht (Art. 17 DSGVO)</h3>
                <p className="text-gray-700 text-sm">
                  Sie haben das Recht auf Löschung Ihrer Daten, sofern keine gesetzlichen Aufbewahrungsfristen bestehen.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-secondary mb-3">Einschränkung (Art. 18 DSGVO)</h3>
                <p className="text-gray-700 text-sm">
                  Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer Daten zu verlangen.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-secondary mb-3">Datenübertragbarkeit (Art. 20 DSGVO)</h3>
                <p className="text-gray-700 text-sm">
                  Sie haben das Recht, Ihre Daten in einem strukturierten Format zu erhalten.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-secondary mb-3">Widerspruchsrecht (Art. 21 DSGVO)</h3>
                <p className="text-gray-700 text-sm">
                  Sie haben das Recht, der Verarbeitung Ihrer Daten zu widersprechen.
                </p>
              </div>
            </div>
            
            <div className="mt-6 bg-primary/10 rounded-lg p-6">
              <h3 className="font-semibold text-secondary mb-3">Kontakt für Datenschutzanfragen</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-primary mr-2" />
                  <a href="mailto:datenschutz@housnkuh.de" className="text-primary hover:underline">
                    datenschutz@housnkuh.de
                  </a>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-primary mr-2" />
                  <a href="tel:+4915735711257" className="text-primary hover:underline">
                    0157 35711257
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Datensicherheit */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">6. Datensicherheit</h2>
            
            <div className="bg-green-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-secondary mb-3">Technische Maßnahmen</h3>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• SSL/TLS-Verschlüsselung</li>
                    <li>• Sichere Server-Infrastruktur</li>
                    <li>• Regelmäßige Sicherheitsupdates</li>
                    <li>• Zugriffskontrolle und Authentifizierung</li>
                    <li>• Datensicherung und Backup-Systeme</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-secondary mb-3">Organisatorische Maßnahmen</h3>
                  <ul className="text-gray-700 text-sm space-y-1">
                    <li>• Schulung der Mitarbeiter</li>
                    <li>• Zugriffsbeschränkungen</li>
                    <li>• Vertraulichkeitsverpflichtungen</li>
                    <li>• Incident-Response-Verfahren</li>
                    <li>• Regelmäßige Sicherheitsüberprüfungen</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Beschwerderecht */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">7. Beschwerderecht</h2>
            
            <div className="bg-red-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung 
                Ihrer personenbezogenen Daten durch uns zu beschweren.
              </p>
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-secondary mb-2">Zuständige Aufsichtsbehörde</h3>
                <p className="text-gray-700">
                  [Name der zuständigen Landesdatenschutzbehörde]<br />
                  [Adresse]<br />
                  [Website]
                </p>
              </div>
            </div>
          </section>

          {/* Änderungen */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">8. Änderungen dieser Datenschutzerklärung</h2>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Diese Datenschutzerklärung kann aufgrund geänderter rechtlicher Bestimmungen oder 
                bei Änderungen unserer Datenverarbeitung angepasst werden.
              </p>
              <p className="text-gray-700">
                Die aktuelle Version finden Sie stets auf unserer Website. Bei wesentlichen Änderungen 
                werden wir Sie über geeignete Kanäle informieren.
              </p>
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

export default DatenschutzPage;