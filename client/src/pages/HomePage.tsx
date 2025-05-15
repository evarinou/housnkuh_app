// client/src/pages/HomePage.tsx
import React from 'react';

const HomePage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <section id="welcome" className="text-center my-12">
        <h1 className="text-4xl font-bold text-secondary mb-4">Willkommen bei Housnkuh!</h1>
        <p className="text-lg text-gray-700 mb-6">
          Ihr innovativer Marktplatz für regionale Produkte in Kronach.
        </p>
        <p className="text-xl text-primary font-semibold">Eröffnung im Sommer 2025</p>
      </section>

      <section id="how-it-works" className="my-12 py-8 bg-gray-100 rounded-lg">
        <h2 className="text-3xl font-bold text-secondary text-center mb-6">So funktioniert Housnkuh</h2>
        <div className="flex flex-wrap justify-around text-center">
          <div className="w-full md:w-1/3 p-4">
            <h3 className="text-xl font-semibold text-primary mb-2">Direktvermarkter</h3>
            <p className="text-gray-700">mieten Verkaufsflächen im Laden.</p>
          </div>
          <div className="w-full md:w-1/3 p-4">
            <h3 className="text-xl font-semibold text-primary mb-2">Housnkuh Marktplatz</h3>
            <p className="text-gray-700">Selbstbedienungsladen mit regionalen Produkten.</p>
          </div>
          <div className="w-full md:w-1/3 p-4">
            <h3 className="text-xl font-semibold text-primary mb-2">Kunden</h3>
            <p className="text-gray-700">kaufen beinahe rund um die Uhr regionale Produkte.</p>
          </div>
        </div>
      </section>

      <section id="what-is-housnkuh" className="my-12">
        <h2 className="text-3xl font-bold text-secondary text-center mb-6">Was ist Housnkuh?</h2>
        <p className="text-gray-700 leading-relaxed">
          Housnkuh wird Ihr neuer Lieblingsort für regionale Spezialitäten und Produkte aus Kronach und Umgebung.
          Im (bald) modern gestalteten Laden in der Strauer Straße 15 werden lokale Erzeuger und Genießer
          zusammengebracht – und das beinahe rund um die Uhr!
        </p>
        {/* Weitere Informationen und Bilder hier */}
      </section>

      <section id="for-customers-vendors" className="my-12 py-8 bg-gray-100 rounded-lg">
        <div className="flex flex-wrap justify-around">
          <div className="w-full md:w-1/2 p-4">
            <h3 className="text-2xl font-semibold text-secondary mb-3">Für Kunden</h3>
            <ul className="list-disc list-inside text-gray-700">
              <li>Regionale Spezialitäten fast rund um die Uhr.</li>
              <li>Zentrale Lage in der Strauer Straße 15.</li>
              <li>Direkter Kontakt zu lokalen Erzeugern.</li>
            </ul>
          </div>
          <div className="w-full md:w-1/2 p-4">
            <h3 className="text-2xl font-semibold text-secondary mb-3">Für Direktvermarkter</h3>
            <ul className="list-disc list-inside text-gray-700">
              <li>Erreichen Sie neue Kundengruppen.</li>
              <li>Verkaufen Sie fast rund um die Uhr.</li>
              <li>Flexible Mietmodelle & faire Konditionen.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="stay-informed" className="my-12 text-center">
         <h2 className="text-3xl font-bold text-secondary mb-4">Bleiben Sie informiert!</h2>
         {/* Hier Newsletter-Anmeldung oder Social Media Links einfügen */}
      </section>
    </div>
  );
};

export default HomePage;