/**
 * @file Vendor Trial controller for the housnkuh marketplace application
 * @description Vendor trial management controller with trial status, conversion, and history tracking
 * Handles vendor-specific trial operations including status checking, conversion, extension, and cancellation
 */

import { Request, Response } from 'express';
import User from '../models/User';
import Vertrag from '../models/Vertrag';
import { TrialService } from '../services/trialService';
import { VertragService } from '../services/vertragService';
import { sendTrialStatusEmail, sendTrialConversionEmail } from '../utils/emailService';

interface VendorRequest extends Request {
  userId?: string;
}

/**
 * Retrieves current trial status for authenticated vendor
 * @description Fetches trial status including active contracts and trial period information
 * @param req - Express request object with userId from authentication
 * @param res - Express response object with trial status and contract data
 * @returns Promise<void> - Resolves with trial status or error message
 * @complexity O(n) where n is number of active contracts
 * @security Requires vendor authentication
 */
export const getTrialStatus = async (req: VendorRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Get trial status from TrialService
    const trialStatus = await TrialService.getTrialStatus(user);
    
    // Get active contracts for this user
    const activeContracts = await Vertrag.find({
      user: userId,
      status: { $in: ['active', 'trial_active'] }
    }).populate('services.mietfach');

    res.json({
      success: true,
      data: {
        ...trialStatus,
        activeContracts: activeContracts.length,
        contracts: activeContracts.map(contract => ({
          id: contract._id,
          status: contract.status,
          startDate: contract.scheduledStartDate,
          endDate: contract.endDate || null,
          monthlyPrice: contract.totalMonthlyPrice,
          isTrialContract: contract.istProbemonatBuchung || false
        }))
      }
    });
  } catch (error) {
    console.error('Error getting trial status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Converts trial to regular subscription with email notification
 * @description Converts vendor trial to regular subscription using TrialService
 * @param req - Express request object with userId from authentication
 * @param res - Express response object with conversion confirmation
 * @returns Promise<void> - Resolves with conversion success or error message
 * @complexity O(1) - Single user lookup and service call
 * @security Requires vendor authentication and trial status validation
 */
export const convertTrialToRegular = async (req: VendorRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if user is in trial
    if (user.registrationStatus !== 'trial_active') {
      res.status(400).json({
        success: false,
        message: 'User is not in trial period'
      });
      return;
    }

    // Convert trial using TrialService
    const result = await TrialService.convertTrialToRegular(user);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    // Send confirmation email
    await sendTrialConversionEmail({
      email: user.kontakt.email,
      name: user.kontakt.name
    });

    res.json({
      success: true,
      message: 'Trial successfully converted to regular subscription',
      data: {
        newStatus: 'active',
        conversionDate: new Date()
      }
    });
  } catch (error) {
    console.error('Error converting trial:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Extends trial period by specified number of days
 * @description Extends vendor trial period using TrialService with validation
 * @param req - Express request object with userId and extensionDays
 * @param res - Express response object with extension confirmation
 * @returns Promise<void> - Resolves with extension success or error message
 * @complexity O(1) - Single user lookup and service call
 * @security Requires vendor authentication and extension days validation
 */
export const extendTrial = async (req: VendorRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { extensionDays } = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    if (!extensionDays || extensionDays <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid extension days required'
      });
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Extend trial using TrialService
    const result = await TrialService.extendTrial(user, extensionDays);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: 'Trial period extended successfully',
      data: {
        newTrialEndDate: result.newTrialEndDate,
        extensionDays
      }
    });
  } catch (error) {
    console.error('Error extending trial:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Cancels vendor trial with optional reason
 * @description Cancels vendor trial using TrialService with optional cancellation reason
 * @param req - Express request object with userId and optional reason
 * @param res - Express response object with cancellation confirmation
 * @returns Promise<void> - Resolves with cancellation success or error message
 * @complexity O(1) - Single user lookup and service call
 * @security Requires vendor authentication
 */
export const cancelTrial = async (req: VendorRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { reason } = req.body;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Cancel trial using TrialService
    const result = await TrialService.cancelTrial(user, reason);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      message: 'Trial cancelled successfully',
      data: {
        cancellationDate: new Date(),
        reason
      }
    });
  } catch (error) {
    console.error('Error cancelling trial:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Retrieves vendor trial history and current status
 * @description Fetches complete trial history including status changes and dates
 * @param req - Express request object with userId from authentication
 * @param res - Express response object with trial history data
 * @returns Promise<void> - Resolves with trial history or error message
 * @complexity O(n) where n is number of historical trial events
 * @security Requires vendor authentication
 */
export const getTrialHistory = async (req: VendorRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const user = await User.findById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Get trial history from TrialService
    const history = await TrialService.getTrialHistory(user);

    res.json({
      success: true,
      data: {
        history,
        currentStatus: user.registrationStatus,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate
      }
    });
  } catch (error) {
    console.error('Error getting trial history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};