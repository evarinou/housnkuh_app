// client/src/pages/KontaktPage.tsx
import React from 'react';

const KontaktPage: React.FC = () => {
  // Basic form state and handlers would go here
  // For a real form, consider libraries like Formik or React Hook Form

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-secondary my-6 text-center">Kontaktieren Sie uns</h1>
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-2xl mx-auto">
        <form>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
            <input type="text" id="name" name="name" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">E-Mail:</label>
            <input type="email" id="email" name="email" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
          <div className="mb-4">
            <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2">Betreff:</label>
            <input type="text" id="subject" name="subject" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
          <div className="mb-6">
            <label htmlFor="message" className="block text-gray-700 text-sm font-bold mb-2">Nachricht:</label>
            <textarea id="message" name="message" rows={5} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
          </div>
          <div className="flex items-center justify-center">
            <button type="submit" className="bg-primary hover:bg-red-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline">
              Senden
            </button>
          </div>
        </form>
        <div className="mt-8 text-center">
          <h3 className="text-xl font-semibold text-secondary mb-2">Oder erreichen Sie uns direkt:</h3>
          <p className="text-gray-700">Strauer Str. 15, 96317 Kronach</p>
          <p className="text-gray-700">Tel: 0157/35711257</p>
          <p className="text-gray-700">E-Mail: <a href="mailto:eva-maria.schaller@housnkuh.de" className="text-primary hover:underline">eva-maria.schaller@housnkuh.de</a></p>
        </div>
      </div>
    </div>
  );
};

export default KontaktPage;