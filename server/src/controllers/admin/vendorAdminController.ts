/**
 * @file vendorAdminController.ts
 * @purpose Admin vendor oversight — visibility, verification, newsletter subscriber management
 * @created 2026-03-29
 */

import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError';
import User from '../../models/User';

// ===== NEWSLETTER MANAGEMENT =====

/**
 * Retrieves all confirmed newsletter subscribers
 */
export const getNewsletterSubscribers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subscribers = await User.find({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true,
    }).select('kontakt createdAt updatedAt');

    res.json({
      success: true,
      count: subscribers.length,
      subscribers,
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Newsletter-Abonnenten', 500, err));
  }
};

/**
 * Retrieves newsletter subscribers filtered by type
 */
export const getNewsletterSubscribersByType = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { type } = req.params;

    const subscribers = await User.find({
      'kontakt.mailNewsletter': true,
      'kontakt.newsletterConfirmed': true,
      'kontakt.newslettertype': type,
    }).select('kontakt createdAt updatedAt');

    res.json({
      success: true,
      count: subscribers.length,
      subscribers,
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Abrufen der Newsletter-Abonnenten nach Typ', 500, err));
  }
};

/**
 * Delete newsletter subscriber (or deactivate if full account)
 */
export const deleteNewsletterSubscriber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Abonnent nicht gefunden',
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
      message: 'Newsletter-Abonnent erfolgreich entfernt',
    });
  } catch (err) {
    next(new AppError('Serverfehler beim Löschen des Newsletter-Abonnenten', 500, err));
  }
};

// ===== VENDOR VISIBILITY & VERIFICATION =====

/**
 * Toggle vendor public visibility (R004)
 */
export const toggleVendorVisibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const { isPubliclyVisible } = req.body;

    const vendor = await User.findById(vendorId);
    if (!vendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden',
      });
      return;
    }

    if (!vendor.isVendor) {
      res.status(400).json({
        success: false,
        message: 'User ist kein Vendor',
      });
      return;
    }

    vendor.isPubliclyVisible = isPubliclyVisible;
    await vendor.save();

    res.json({
      success: true,
      message: `Vendor-Sichtbarkeit ${isPubliclyVisible ? 'aktiviert' : 'deaktiviert'}`,
      vendor: {
        id: vendor._id,
        name: vendor.kontakt.name,
        email: vendor.kontakt.email,
        isPubliclyVisible: vendor.isPubliclyVisible,
        registrationStatus: vendor.registrationStatus,
      },
    });
  } catch (err) {
    next(new AppError('Server error toggling vendor visibility', 500, err));
  }
};

/**
 * Bulk toggle vendor visibility (R004)
 */
export const bulkToggleVendorVisibility = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vendorIds, isPubliclyVisible } = req.body;

    if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Vendor IDs array ist erforderlich',
      });
      return;
    }

    const result = await User.updateMany(
      {
        _id: { $in: vendorIds },
        isVendor: true,
      },
      {
        isPubliclyVisible: isPubliclyVisible,
      },
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} Vendors ${isPubliclyVisible ? 'sichtbar' : 'versteckt'} gemacht`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(new AppError('Server error bulk toggling vendor visibility', 500, err));
  }
};

/**
 * Update vendor verification status (R007)
 */
export const updateVendorVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vendorId } = req.params;
    const { verifyStatus } = req.body;

    if (!vendorId) {
      res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
      return;
    }

    if (!['verified', 'pending', 'unverified'].includes(verifyStatus)) {
      res.status(400).json({
        success: false,
        message: 'Invalid verification status',
      });
      return;
    }

    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
      return;
    }

    // Update vendor verification status
    vendor.vendorProfile = vendor.vendorProfile || {};
    vendor.vendorProfile.verifyStatus = verifyStatus;

    await vendor.save();

    res.json({
      success: true,
      message: `Vendor verification status updated to ${verifyStatus}`,
      vendorId: vendor._id,
      verifyStatus: verifyStatus,
    });
  } catch (err) {
    next(new AppError('Server error updating vendor verification', 500, err));
  }
};
