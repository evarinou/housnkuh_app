/**
 * @file Admin Trial controller for the housnkuh marketplace application
 * @description Admin trial management controller with comprehensive trial oversight and bulk operations
 * Handles admin-specific trial operations including filtering, statistics, exports, and manual management
 */

import { Request, Response } from 'express';
import User from '../models/User';
import Vertrag from '../models/Vertrag';
import { TrialService } from '../services/trialService';
import { sendTrialStatusEmail, sendTrialConversionEmail } from '../utils/emailService';
import mongoose from 'mongoose';

interface TrialFilterQuery {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  expiringIn?: number;
  search?: string;
}

/**
 * Retrieves all trials with comprehensive filtering and pagination
 * @description Fetches trials with filtering, sorting, pagination, and contract data aggregation
 * @param req - Express request object with filtering and pagination parameters
 * @param res - Express response object with trial data and pagination info
 * @returns Promise<void> - Resolves with paginated trial data or error message
 * @complexity O(n log n) where n is number of matching trials (due to sorting and aggregation)
 * @security Admin only endpoint with comprehensive trial data
 */
export const getAllTrials = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      startDate,
      endDate,
      expiringIn,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query: any = {};
    
    if (status) {
      query.registrationStatus = status;
    } else {
      // Default to trial statuses
      query.registrationStatus = { $in: ['trial_active', 'trial_expired', 'cancelled'] };
    }

    if (startDate || endDate) {
      query.trialStartDate = {};
      if (startDate) query.trialStartDate.$gte = new Date(startDate as string);
      if (endDate) query.trialStartDate.$lte = new Date(endDate as string);
    }

    if (expiringIn) {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + parseInt(expiringIn as string));
      query.trialEndDate = { $lte: expiringDate };
      query.registrationStatus = 'trial_active';
    }

    if (search) {
      query.$or = [
        { 'kontakt.name': { $regex: search, $options: 'i' } },
        { 'kontakt.email': { $regex: search, $options: 'i' } },
        { 'vendorProfile.unternehmen': { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    const [trials, total] = await Promise.all([
      User.find(query)
        .select('kontakt.name kontakt.email vendorProfile.unternehmen registrationStatus trialStartDate trialEndDate createdAt')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      User.countDocuments(query)
    ]);

    // Get contract counts for each trial user
    const trialUserIds = trials.map(trial => trial._id);
    const contractCounts = await Vertrag.aggregate([
      {
        $match: {
          user: { $in: trialUserIds },
          status: { $in: ['active', 'trial_active'] }
        }
      },
      {
        $group: {
          _id: '$user',
          contractCount: { $sum: 1 },
          totalMonthlyPrice: { $sum: '$totalMonthlyPrice' }
        }
      }
    ]);

    // Map contract data to trials
    const contractMap = new Map();
    contractCounts.forEach(item => {
      contractMap.set(item._id.toString(), {
        contractCount: item.contractCount,
        totalMonthlyPrice: item.totalMonthlyPrice
      });
    });

    const enhancedTrials = trials.map(trial => {
      const contractData = contractMap.get(trial._id.toString()) || { contractCount: 0, totalMonthlyPrice: 0 };
      return {
        ...trial,
        ...contractData,
        daysRemaining: trial.trialEndDate ? 
          Math.ceil((new Date(trial.trialEndDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 
          null
      };
    });

    res.json({
      success: true,
      data: {
        trials: enhancedTrials,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
          totalItems: total,
          itemsPerPage: parseInt(limit as string)
        }
      }
    });
  } catch (error) {
    console.error('Error getting trials:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Retrieves detailed trial information by ID
 * @description Fetches comprehensive trial details including status, contracts, and history
 * @param req - Express request object with trial ID parameter
 * @param res - Express response object with detailed trial data
 * @returns Promise<void> - Resolves with trial details or error message
 * @complexity O(n) where n is number of contracts for the trial
 * @security Admin only endpoint with ID validation
 */
export const getTrialById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid trial ID'
      });
      return;
    }

    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Trial not found'
      });
      return;
    }

    // Get trial details
    const trialStatus = await TrialService.getTrialStatus(user);
    const contracts = await Vertrag.find({ user: id }).populate('services.mietfach');
    const trialHistory = await TrialService.getTrialHistory(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.kontakt.name,
          email: user.kontakt.email,
          unternehmen: user.vendorProfile?.unternehmen || '',
          registrationStatus: user.registrationStatus,
          trialStartDate: user.trialStartDate,
          trialEndDate: user.trialEndDate,
          createdAt: user.createdAt
        },
        trialStatus,
        contracts,
        history: trialHistory
      }
    });
  } catch (error) {
    console.error('Error getting trial by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Updates trial with validation
 * @description Updates trial data with validation and returns updated trial
 * @param req - Express request object with trial ID parameter and update data
 * @param res - Express response object with updated trial data
 * @returns Promise<void> - Resolves with updated trial or error message
 * @complexity O(1) - Single database update with validation
 * @security Admin only endpoint with ID validation and update validation
 */
export const updateTrial = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid trial ID'
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Trial not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Trial updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating trial:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Performs bulk operations on multiple trials
 * @description Executes bulk operations (extend, convert, cancel) on multiple trials
 * @param req - Express request object with operation type, trial IDs, and operation data
 * @param res - Express response object with bulk operation results
 * @returns Promise<void> - Resolves with operation results or error message
 * @complexity O(n) where n is number of trials to process
 * @security Admin only endpoint with operation validation and error tracking
 */
export const bulkOperations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { operation, trialIds, data } = req.body;

    if (!operation || !trialIds || !Array.isArray(trialIds)) {
      res.status(400).json({
        success: false,
        message: 'Invalid bulk operation request'
      });
      return;
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const trialId of trialIds) {
      try {
        const user = await User.findById(trialId);
        if (!user) {
          results.failed++;
          results.errors.push(`Trial ${trialId} not found`);
          continue;
        }

        switch (operation) {
          case 'extend':
            await TrialService.extendTrial(user, data.extensionDays || 7);
            break;
          case 'convert':
            await TrialService.convertTrialToRegular(user);
            break;
          case 'cancel':
            await TrialService.cancelTrial(user, data.reason || 'Admin bulk operation');
            break;
          default:
            results.failed++;
            results.errors.push(`Unknown operation: ${operation}`);
            continue;
        }

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing ${trialId}: ${error}`);
      }
    }

    res.json({
      success: true,
      message: 'Bulk operation completed',
      data: results
    });
  } catch (error) {
    console.error('Error in bulk operations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Retrieves comprehensive trial statistics
 * @description Fetches trial statistics using TrialService for dashboard display
 * @param req - Express request object
 * @param res - Express response object with trial statistics
 * @returns Promise<void> - Resolves with statistics or error message
 * @complexity O(n) where n is number of trials for statistics calculation
 * @security Admin only endpoint
 */
export const getTrialStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await TrialService.getTrialStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting trial statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Exports trial data in CSV or JSON format
 * @description Exports trial data with format selection for external analysis
 * @param req - Express request object with optional format parameter
 * @param res - Express response object with exported data
 * @returns Promise<void> - Resolves with exported data or error message
 * @complexity O(n) where n is number of trials to export
 * @security Admin only endpoint with format validation
 */
export const exportTrialData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format = 'csv' } = req.query;
    
    const trials = await User.find({
      registrationStatus: { $in: ['trial_active', 'trial_expired', 'cancelled'] }
    }).select('kontakt.name kontakt.email vendorProfile.unternehmen registrationStatus trialStartDate trialEndDate createdAt');

    if (format === 'csv') {
      const csvData = trials.map(trial => ({
        Name: trial.kontakt.name,
        Email: trial.kontakt.email,
        Unternehmen: trial.vendorProfile?.unternehmen || '',
        Status: trial.registrationStatus,
        TrialStart: trial.trialStartDate?.toISOString() || '',
        TrialEnd: trial.trialEndDate?.toISOString() || '',
        Created: trial.createdAt.toISOString()
      }));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="trials.csv"');
      
      // Simple CSV generation
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n');

      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: trials
      });
    }
  } catch (error) {
    console.error('Error exporting trial data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Manually converts trial to regular subscription
 * @description Admin-initiated trial conversion with reason logging
 * @param req - Express request object with trial ID and optional reason
 * @param res - Express response object with conversion confirmation
 * @returns Promise<void> - Resolves with conversion success or error message
 * @complexity O(1) - Single trial conversion with logging
 * @security Admin only endpoint with action logging
 */
export const manualTrialConversion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Trial not found'
      });
      return;
    }

    const result = await TrialService.convertTrialToRegular(user);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    // Log admin action
    console.log(`Admin manual trial conversion: ${user.kontakt.email}, reason: ${reason}`);

    res.json({
      success: true,
      message: 'Trial converted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in manual trial conversion:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Manually extends trial period
 * @description Admin-initiated trial extension with reason and days logging
 * @param req - Express request object with trial ID, extension days, and reason
 * @param res - Express response object with extension confirmation
 * @returns Promise<void> - Resolves with extension success or error message
 * @complexity O(1) - Single trial extension with logging
 * @security Admin only endpoint with action logging
 */
export const manualTrialExtension = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { extensionDays, reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Trial not found'
      });
      return;
    }

    const result = await TrialService.extendTrial(user, extensionDays);
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    // Log admin action
    console.log(`Admin manual trial extension: ${user.kontakt.email}, days: ${extensionDays}, reason: ${reason}`);

    res.json({
      success: true,
      message: 'Trial extended successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in manual trial extension:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Manually cancels trial
 * @description Admin-initiated trial cancellation with reason logging
 * @param req - Express request object with trial ID and optional reason
 * @param res - Express response object with cancellation confirmation
 * @returns Promise<void> - Resolves with cancellation success or error message
 * @complexity O(1) - Single trial cancellation with logging
 * @security Admin only endpoint with action logging
 */
export const manualTrialCancellation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Trial not found'
      });
      return;
    }

    const result = await TrialService.cancelTrial(user, reason || 'Admin cancellation');
    
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    // Log admin action
    console.log(`Admin manual trial cancellation: ${user.kontakt.email}, reason: ${reason}`);

    res.json({
      success: true,
      message: 'Trial cancelled successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in manual trial cancellation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};