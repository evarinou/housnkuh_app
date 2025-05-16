// server/src/controllers/adminController.ts
import { Request, Response } from 'express';
import User from '../models/User';
import Mietfach from '../models/Mietfach';
import Vertrag from '../models/Vertrag';

// Alle Newsletter-Abonnenten abrufen
export const getNewsletterSubscribers = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscribers = await User.find({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true
    }).select('kontakt createdAt updatedAt');
    
    res.json({
      success: true,
      count: subscribers.length,
      subscribers
    });
  } catch (err) {
    console.error('Fehler beim Abrufen der Newsletter-Abonnenten:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Newsletter-Abonnenten' 
    });
  }
};

// Nach Typ gefilterte Newsletter-Abonnenten abrufen
export const getNewsletterSubscribersByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    
    const subscribers = await User.find({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true,
      'kontakt.newslettertype': type
    }).select('kontakt createdAt updatedAt');
    
    res.json({
      success: true,
      count: subscribers.length,
      subscribers
    });
  } catch (err) {
    console.error('Fehler beim Abrufen der Newsletter-Abonnenten nach Typ:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Newsletter-Abonnenten nach Typ' 
    });
  }
};

// Dashboard-Übersicht
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    // Anzahl der Newsletter-Abonnenten
    const newsletterCount = await User.countDocuments({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true
    });
    
    // Anzahl der ausstehenden Bestätigungen
    const pendingCount = await User.countDocuments({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': false
    });
    
    // Aufschlüsselung nach Typ
    const customerCount = await User.countDocuments({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true,
      'kontakt.newslettertype': 'customer'
    });
    
    const vendorCount = await User.countDocuments({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true,
      'kontakt.newslettertype': 'vendor'
    });
    
    // Anzahl der Mietfächer und Verträge
    const mietfachCount = await Mietfach.countDocuments();
    const vertragCount = await Vertrag.countDocuments();
    
    // Neueste Abonnenten (letzte 5)
    const recentSubscribers = await User.find({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('kontakt createdAt');
    
    res.json({
      success: true,
      overview: {
        newsletter: {
          total: newsletterCount,
          pending: pendingCount,
          customer: customerCount,
          vendor: vendorCount
        },
        mietfaecher: mietfachCount,
        vertraege: vertragCount,
        recentSubscribers
      }
    });
  } catch (err) {
    console.error('Fehler beim Abrufen der Dashboard-Übersicht:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Abrufen der Dashboard-Übersicht' 
    });
  }
};

// Newsletter-Abonnent löschen
export const deleteNewsletterSubscriber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'Abonnent nicht gefunden' 
      });
      return;
    }
    
    // Wenn es ein reiner Newsletter-Abonnent ist, lösche den User
    if (!user.isFullAccount) {
      await User.findByIdAndDelete(id);
    } else {
      // Wenn es ein vollständiger Account ist, deaktiviere nur das Newsletter-Abonnement
      user.kontakt.mailNewsletter = false;
      user.kontakt.newsletterConfirmed = false;
      await user.save();
    }
    
    res.json({
      success: true,
      message: 'Newsletter-Abonnent erfolgreich entfernt'
    });
  } catch (err) {
    console.error('Fehler beim Löschen des Newsletter-Abonnenten:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Serverfehler beim Löschen des Newsletter-Abonnenten' 
    });
  }
};