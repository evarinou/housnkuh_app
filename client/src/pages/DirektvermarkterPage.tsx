// client/src/pages/DirektvermarkterPage.tsx
import React, { useEffect, useState } from 'react';
// import axios from 'axios'; // Für API-Aufrufe

interface Marketer {
  id: string;
  name: string;
  description: string;
  // Weitere Felder...
}

const DirektvermarkterPage: React.FC = () => {
  const [marketers, setMarketers] = useState<Marketer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Beispiel für das Laden von Daten (muss an Ihr Backend angepasst werden)
    /*
    axios.get('/api/marketers') // Ihr API-Endpunkt
      .then(response => {
        setMarketers(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Fehler beim Laden der Direktvermarkter.');
        setLoading(false);
      });
    */
    // Placeholder Daten:
    setMarketers([
      {id: '1', name: 'Bauer Huber', description: 'Frische Eier und Kartoffeln'},
      {id: '2', name: 'Imkerei Summsebiene', description: 'Regionaler Honig'},
    ]);
    setLoading(false);
  }, []);

  if (loading) return <p className="text-center p-4">Lade Direktvermarkter...</p>;
  if (error) return <p className="text-center text-red-500 p-4">{error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-secondary my-6 text-center">Unsere Direktvermarkter</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {marketers.map(marketer => (
          <div key={marketer.id} className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-primary mb-2">{marketer.name}</h2>
            <p className="text-gray-700">{marketer.description}</p>
            {/* Weitere Details zum Vermarkter */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DirektvermarkterPage;