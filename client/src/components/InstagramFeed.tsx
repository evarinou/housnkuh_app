// client/src/components/InstagramFeed.tsx
import React, { useEffect } from 'react';
import { Instagram } from 'lucide-react';

const InstagramFeed: React.FC = () => {
  useEffect(() => {
    // LightWidget-Skript laden, falls es noch nicht vorhanden ist
    if (!document.getElementById('lightwidget-script')) {
      const script = document.createElement('script');
      script.id = 'lightwidget-script';
      script.src = 'https://cdn.lightwidget.com/widgets/lightwidget.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Das Skript bleibt im DOM, wird aber bei Bedarf neu initialisiert
    return () => {
      // Cleanup-Funktion wenn nötig
    };
  }, []);

  return (
    <section className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Instagram className="w-6 h-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold text-secondary">
            Folge uns auf Instagram
          </h2>
        </div>
        
        <div className="instagram-widget-container rounded-lg overflow-hidden shadow-lg">
          {/* LightWidget iframe */}
          <iframe 
            src="//lightwidget.com/widgets/2c1fbe0c43ad522b8eecd58898189c0c.html" 
            scrolling="no" 
            allowTransparency={true} 
            className="lightwidget-widget" 
            style={{ width: '100%', border: 0, overflow: 'hidden' }}
            title="Instagram Feed"
          ></iframe>
        </div>
        
        <div className="flex justify-center mt-8">
          <a 
            href="https://www.instagram.com/housnkuh_kc/"
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
          >
            <Instagram className="w-5 h-5" />
            <span>@housnkuh_kc auf Instagram</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default InstagramFeed;