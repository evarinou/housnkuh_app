// client/src/pages/ImpressumPage.tsx
import React from 'react';
import { Building, Mail, Phone, FileText } from 'lucide-react';

const ImpressumPage: React.FC = () => {
  return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <FileText className="w-12 h-12 text-primary mr-4" />
            <h1 className="text-4xl font-bold text-secondary">Impressum</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Angaben gemäß § 5 TMG (Telemediengesetz)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Diensteanbieter */}
          <section className="mb-10">
            <div className="flex items-center mb-6">
              <Building className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">Diensteanbieter</h2>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-secondary mb-3">Unternehmen</h3>
                  <p className="text-gray-700 mb-2"><strong>housnkuh</strong></p>
                  <p className="text-gray-600 text-sm">
                    Plattform für regionale Direktvermarkter
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-secondary mb-3">Geschäftsführung</h3>
                  <p className="text-gray-700">
                    [Name des Geschäftsführers]
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Kontaktdaten */}
          <section className="mb-10">
            <div className="flex items-center mb-6">
              <Mail className="w-6 h-6 text-primary mr-3" />
              <h2 className="text-2xl font-semibold text-secondary">Kontaktdaten</h2>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-secondary mb-2">Postanschrift</h3>
                    <div className="text-gray-700">
                      <p>[Straße und Hausnummer]</p>
                      <p>[PLZ Ort]</p>
                      <p>Deutschland</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-secondary mb-2">Kontakt</h3>
                    <div className="space-y-2">
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
            </div>
          </section>

          {/* Rechtliche Informationen */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-secondary mb-6">Rechtliche Informationen</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-secondary mb-3">Handelsregister</h3>
                <div className="text-gray-700 space-y-1">
                  <p><strong>Registergericht:</strong> [Amtsgericht]</p>
                  <p><strong>Registernummer:</strong> [HRB-Nummer]</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-secondary mb-3">Umsatzsteuer-ID</h3>
                <div className="text-gray-700">
                  <p><strong>USt-IdNr.:</strong> [DE-Nummer]</p>
                  <p className="text-sm text-gray-600 mt-2">
                    gemäß § 27a Umsatzsteuergesetz
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* EU-Streitschlichtung */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-secondary mb-6">EU-Streitschlichtung</h2>
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
              </p>
              <a 
                href="https://ec.europa.eu/consumers/odr/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              <p className="text-gray-700 mt-4">
                Unsere E-Mail-Adresse finden Sie oben im Impressum.
              </p>
            </div>
          </section>

          {/* Verbraucherstreitbeilegung */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-secondary mb-6">
              Verbraucherstreitbeilegung/Universalschlichtungsstelle
            </h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-700">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </div>
          </section>

          {/* Haftung für Inhalte */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-secondary mb-6">Haftung für Inhalte</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 mb-4">
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten 
                nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als 
                Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte 
                fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine 
                rechtswidrige Tätigkeit hinweisen.
              </p>
              <p className="text-gray-700">
                Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den 
                allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch 
                erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei 
                Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>
            </div>
          </section>

          {/* Haftung für Links */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-secondary mb-6">Haftung für Links</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 mb-4">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen 
                Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. 
                Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der 
                Seiten verantwortlich.
              </p>
              <p className="text-gray-700">
                Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße 
                überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. 
                Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete 
                Anhaltspunkte einer Rechtsverletzung nicht zumutbar.
              </p>
            </div>
          </section>

          {/* Urheberrecht */}
          <section>
            <h2 className="text-2xl font-semibold text-secondary mb-6">Urheberrecht</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 mb-4">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen 
                dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art 
                der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen 
                Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
              <p className="text-gray-700">
                Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch 
                gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden 
                die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche 
                gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, 
                bitten wir um einen entsprechenden Hinweis.
              </p>
            </div>
          </section>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
          </p>
        </div>
      </div>
  );
};

export default ImpressumPage;