import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import DirektvermarkterPage from './pages/DirektvermarkterPage';
import StandortPage from './pages/StandortPage';
import MietenPage from './pages/MietenPage';
import KontaktPage from './pages/KontaktPage';
//import NotFoundPage from './pages/NotFoundPage';
// import './App.css'; // Ihre bestehenden App-weiten Stile, falls vorhanden

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/direktvermarkter" element={<DirektvermarkterPage />} />
            <Route path="/standort" element={<StandortPage />} />
            <Route path="/mieten" element={<MietenPage />} />
            <Route path="/kontakt" element={<KontaktPage />} />
            {/* Fügen Sie hier Routen für Impressum und Datenschutz hinzu, wenn Sie separate Seiten erstellen */}
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