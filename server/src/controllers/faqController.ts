/**
 * @file FAQ controller for the housnkuh marketplace application
 * @description FAQ management controller with public and admin endpoints
 * Handles FAQ creation, retrieval, updates, deletion, and ordering with category support
 */

import { Request, Response } from 'express';
import FAQ, { IFAQ } from '../models/FAQ';

/**
 * FAQ controller object with all FAQ management methods
 * @description Comprehensive FAQ management with public/admin separation and full CRUD operations
 */
export const faqController = {
  /**
   * Retrieves all active FAQs for public display
   * @description Fetches only active FAQs sorted by category and order for public consumption
   * @param req - Express request object
   * @param res - Express response object with active FAQ data
   * @returns Promise<void> - Resolves with active FAQ list or error message
   * @complexity O(n log n) where n is number of active FAQs (due to sorting)
   * @security Public endpoint - only returns active FAQs
   */
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

  /**
   * Retrieves all FAQs for admin interface
   * @description Fetches all FAQs (active and inactive) for administrative management
   * @param req - Express request object
   * @param res - Express response object with complete FAQ data
   * @returns Promise<void> - Resolves with complete FAQ list or error message
   * @complexity O(n log n) where n is total number of FAQs (due to sorting)
   * @security Admin endpoint - requires authentication
   */
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

  /**
   * Retrieves a specific FAQ by ID
   * @description Fetches single FAQ by ID for detailed view or editing
   * @param req - Express request object with FAQ ID parameter
   * @param res - Express response object with FAQ data
   * @returns Promise<void> - Resolves with FAQ data or error message
   * @complexity O(1) - Single database lookup by ID
   * @security Returns FAQ regardless of active status
   */
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

  /**
   * Creates a new FAQ entry
   * @description Creates new FAQ with validation and error handling
   * @param req - Express request object with FAQ data (category, question, answer, keywords, order, isActive)
   * @param res - Express response object with created FAQ data
   * @returns Promise<void> - Resolves with created FAQ or error message
   * @complexity O(1) - Single database insertion
   * @security Validates required fields and handles validation errors
   */
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

  /**
   * Updates an existing FAQ entry
   * @description Updates FAQ with validation and error handling
   * @param req - Express request object with FAQ ID parameter and update data
   * @param res - Express response object with updated FAQ data
   * @returns Promise<void> - Resolves with updated FAQ or error message
   * @complexity O(1) - Single database update by ID
   * @security Validates existence and runs model validators
   */
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

  /**
   * Deletes an FAQ entry permanently
   * @description Permanently removes FAQ from database
   * @param req - Express request object with FAQ ID parameter
   * @param res - Express response object with deletion confirmation
   * @returns Promise<void> - Resolves with deletion confirmation or error message
   * @complexity O(1) - Single database deletion by ID
   * @security Validates existence before deletion
   */
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

  /**
   * Toggles the active status of an FAQ
   * @description Switches FAQ between active and inactive states
   * @param req - Express request object with FAQ ID parameter
   * @param res - Express response object with updated FAQ data
   * @returns Promise<void> - Resolves with updated FAQ or error message
   * @complexity O(1) - Single database lookup and update
   * @security Validates existence and provides status feedback
   */
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

  /**
   * Reorders multiple FAQs by updating their order values
   * @description Updates order field for multiple FAQs in batch operation
   * @param req - Express request object with FAQs array containing id and order pairs
   * @param res - Express response object with reorder confirmation
   * @returns Promise<void> - Resolves with reorder confirmation or error message
   * @complexity O(n) where n is number of FAQs to reorder
   * @security Validates array format and uses Promise.all for batch updates
   */
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