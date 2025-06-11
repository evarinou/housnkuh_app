// server/src/controllers/faqController.ts
import { Request, Response } from 'express';
import FAQ, { IFAQ } from '../models/FAQ';

export const faqController = {
  // Get all FAQs (public endpoint - only active ones)
  getAllPublic: async (req: Request, res: Response) => {
    try {
      const faqs = await FAQ.find({ isActive: true })
        .sort({ category: 1, order: 1 })
        .select('-__v');
      
      res.json({
        success: true,
        faqs
      });
    } catch (error) {
      console.error('Error fetching public FAQs:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der FAQs'
      });
    }
  },

  // Get all FAQs (admin endpoint - all FAQs)
  getAllAdmin: async (req: Request, res: Response) => {
    try {
      const faqs = await FAQ.find()
        .sort({ category: 1, order: 1 })
        .select('-__v');
      
      res.json({
        success: true,
        faqs
      });
    } catch (error) {
      console.error('Error fetching admin FAQs:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der FAQs'
      });
    }
  },

  // Get single FAQ by ID
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const faq = await FAQ.findById(id);
      
      if (!faq) {
        return res.status(404).json({
          success: false,
          message: 'FAQ nicht gefunden'
        });
      }
      
      res.json({
        success: true,
        faq
      });
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der FAQ'
      });
    }
  },

  // Create new FAQ
  create: async (req: Request, res: Response) => {
    try {
      const { category, question, answer, keywords, order, isActive } = req.body;
      
      // Validate required fields
      if (!category || !question || !answer) {
        return res.status(400).json({
          success: false,
          message: 'Kategorie, Frage und Antwort sind erforderlich'
        });
      }
      
      // Create new FAQ
      const newFAQ = new FAQ({
        category,
        question,
        answer,
        keywords: keywords || [],
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true
      });
      
      await newFAQ.save();
      
      res.status(201).json({
        success: true,
        message: 'FAQ erfolgreich erstellt',
        faq: newFAQ
      });
    } catch (error: any) {
      console.error('Error creating FAQ:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen der FAQ'
      });
    }
  },

  // Update FAQ
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedFAQ = await FAQ.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!updatedFAQ) {
        return res.status(404).json({
          success: false,
          message: 'FAQ nicht gefunden'
        });
      }
      
      res.json({
        success: true,
        message: 'FAQ erfolgreich aktualisiert',
        faq: updatedFAQ
      });
    } catch (error: any) {
      console.error('Error updating FAQ:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren der FAQ'
      });
    }
  },

  // Delete FAQ
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const deletedFAQ = await FAQ.findByIdAndDelete(id);
      
      if (!deletedFAQ) {
        return res.status(404).json({
          success: false,
          message: 'FAQ nicht gefunden'
        });
      }
      
      res.json({
        success: true,
        message: 'FAQ erfolgreich gelöscht'
      });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen der FAQ'
      });
    }
  },

  // Toggle FAQ active status
  toggleActive: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const faq = await FAQ.findById(id);
      
      if (!faq) {
        return res.status(404).json({
          success: false,
          message: 'FAQ nicht gefunden'
        });
      }
      
      faq.isActive = !faq.isActive;
      await faq.save();
      
      res.json({
        success: true,
        message: `FAQ ${faq.isActive ? 'aktiviert' : 'deaktiviert'}`,
        faq
      });
    } catch (error) {
      console.error('Error toggling FAQ status:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Ändern des FAQ-Status'
      });
    }
  },

  // Reorder FAQs
  reorder: async (req: Request, res: Response) => {
    try {
      const { faqs } = req.body; // Array of { id, order }
      
      if (!Array.isArray(faqs)) {
        return res.status(400).json({
          success: false,
          message: 'FAQs Array ist erforderlich'
        });
      }
      
      // Update order for each FAQ
      const updatePromises = faqs.map(({ id, order }) => 
        FAQ.findByIdAndUpdate(id, { order })
      );
      
      await Promise.all(updatePromises);
      
      res.json({
        success: true,
        message: 'FAQ-Reihenfolge erfolgreich aktualisiert'
      });
    } catch (error) {
      console.error('Error reordering FAQs:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren der FAQ-Reihenfolge'
      });
    }
  }
};