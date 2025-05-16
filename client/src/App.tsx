// Modifizierte App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/layout/Navigation';
import Hero from './components/layout/Hero';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import DirektvermarkterPage from './pages/DirektvermarkterPage';
import StandortPage from './pages/StandortPage';
import MietenPage from './pages/MietenPage';
import KontaktPage from './pages/KontaktPage';
// import './App.css'; // Deine bestehenden App-weiten Stile, falls vorhanden

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-grow pt-24"> {/* Ausreichend Platz für die Navigation */}
        {/* Hero nur auf der Startseite anzeigen */}
        <Routes>
          <Route path="/" element={
            <>
              <Hero />
              <HomePage />
            </>
          } />
          <Route path="/direktvermarkter" element={<DirektvermarkterPage />} />
          <Route path="/standort" element={<StandortPage />} />
          <Route path="/mieten" element={<MietenPage />} />
          <Route path="/kontakt" element={<KontaktPage />} />
          {/* Füge hier Routen für Impressum und Datenschutz hinzu, wenn du separate Seiten erstellen möchtest */}
          {/* <Route path="/impressum" element={<ImpressumPage />} /> */}
          {/* <Route path="/datenschutz" element={<DatenschutzPage />} /> */}
        </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;