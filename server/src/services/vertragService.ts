/**
 * @file Contract Service for trial-integrated contract management
 * @description Service for creating and managing contracts with trial period integration
 * @author System
 * @version 1.0.0
 * @since 2024-01-01
 */

import Vertrag from '../models/Vertrag';
import User from '../models/User';
import Mietfach from '../models/Mietfach';
import { IVertrag, IUser } from '../types/modelTypes';
import mongoose from 'mongoose';

/**
 * @interface IVertragCreate
 * @description Interface for creating new contracts
 */
export interface IVertragCreate {
  /** @description User ID for the contract */
  user: string;
  /** @description Array of services included in the contract */
  services: Array<{
    mietfach: mongoose.Types.ObjectId;
    mietbeginn: Date;
    mietende?: Date;
    monatspreis: number;
  }>;
  /** @description Optional package configuration */
  packageConfiguration?: any;
  /** @description Total monthly price for the contract */
  totalMonthlyPrice: number;
  /** @description Contract duration in months */
  contractDuration?: number;
  /** @description Discount amount */
  discount?: number;
  /** @description Scheduled start date */
  scheduledStartDate: Date;
  /** @description Contract status */
  status?: string;
}

/**
 * @class VertragService
 * @description Service for creating and managing contracts with trial period integration
 * @security Handles sensitive contract data and trial period calculations
 * @complexity High - Complex trial integration with payment scheduling
 */
export class VertragService {
  /**
   * @description Create a new contract with trial integration
   * @param {IVertragCreate} vertragData - Contract creation data
   * @security Validates user trial status and calculates payment dates
   * @complexity High - Trial integration with payment scheduling
   * @returns {Promise<IVertrag>} Created contract
   * @throws {Error} If user not found or validation fails
   */
  async createVertrag(vertragData: IVertragCreate): Promise<IVertrag> {
    // Load user to check trial status
    const user = await User.findById(vertragData.user);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if this is a trial booking
    const isTrialBooking = user.registrationStatus === 'trial_active' &&
                          user.trialEndDate &&
                          user.trialEndDate > new Date();

    // Calculate payment start date
    let zahlungspflichtigAb: Date;
    if (isTrialBooking && user.trialEndDate) {
      // Payment starts after trial period ends
      zahlungspflichtigAb = new Date(user.trialEndDate);
    } else {
      // Payment starts immediately
      zahlungspflichtigAb = vertragData.scheduledStartDate;
    }

    // Create contract with trial fields
    const vertrag = new Vertrag({
      user: vertragData.user,
      services: vertragData.services,
      packageConfiguration: vertragData.packageConfiguration,
      totalMonthlyPrice: vertragData.totalMonthlyPrice,
      contractDuration: vertragData.contractDuration || 1,
      discount: vertragData.discount || 0,
      status: vertragData.status || 'scheduled',
      scheduledStartDate: vertragData.scheduledStartDate,
      // Trial-specific fields
      istProbemonatBuchung: isTrialBooking,
      probemonatUserId: isTrialBooking ? user._id : undefined,
      zahlungspflichtigAb: zahlungspflichtigAb,
      gekuendigtInProbemonat: false
    });

    const savedVertrag = await vertrag.save();

    // If this is a trial booking, mark trial as active if not already
    if (isTrialBooking && user.registrationStatus === 'preregistered') {
      user.registrationStatus = 'trial_active';
      user.trialStartDate = new Date();
      // Trial end date should already be set, but ensure it exists
      if (!user.trialEndDate) {
        user.trialEndDate = new Date();
        user.trialEndDate.setDate(user.trialEndDate.getDate() + 30); // 30 day trial
      }
      await user.save();
    }

    return savedVertrag;
  }

  /**
   * @description Cancel a trial booking
   * @param {string} vertragId - Contract ID to cancel
   * @param {string} userId - User ID performing the cancellation
   * @security Validates trial booking status and user permissions
   * @complexity Medium - Trial booking cancellation with resource cleanup
   * @returns {Promise<void>}
   * @throws {Error} If contract not found or not a trial booking
   */
  async cancelTrialBooking(vertragId: string, userId: string): Promise<void> {
    const vertrag = await Vertrag.findById(vertragId);
    const user = await User.findById(userId);

    if (!vertrag || !user) {
      throw new Error('Contract or user not found');
    }

    if (!vertrag.istProbemonatBuchung) {
      throw new Error('This is not a trial booking');
    }

    if (user.registrationStatus !== 'trial_active') {
      throw new Error('User is not in trial period');
    }

    // Mark contract as cancelled during trial
    vertrag.gekuendigtInProbemonat = true;
    vertrag.probemonatKuendigungsdatum = new Date();
    vertrag.status = 'cancelled';
    
    await vertrag.save();

    // Free up the Mietfächer
    for (const service of vertrag.services) {
      const mietfach = await Mietfach.findById(service.mietfach);
      if (mietfach) {
        mietfach.verfuegbar = true;
        await mietfach.save();
      }
    }
  }

  /**
   * @description Get contracts by user with trial status
   * @param {string} userId - User ID to get contracts for
   * @security Returns only contracts for the specified user
   * @complexity Medium - Database query with population
   * @returns {Promise<IVertrag[]>} Array of user contracts
   */
  async getContractsByUser(userId: string): Promise<IVertrag[]> {
    return await Vertrag.find({ user: userId })
      .populate('user', 'username kontakt.name registrationStatus trialEndDate')
      .populate('services.mietfach', 'bezeichnung typ beschreibung standort groesse preis')
      .sort({ createdAt: -1 });
  }

  /**
   * @description Check if user can make a trial booking
   * @param {string} userId - User ID to check eligibility for
   * @security Validates user status and existing trial bookings
   * @complexity Medium - Multi-step validation process
   * @returns {Promise<object>} Result object with eligibility status
   */
  async canMakeTrialBooking(userId: string): Promise<{ canBook: boolean; reason?: string }> {
    const user = await User.findById(userId);
    
    if (!user) {
      return { canBook: false, reason: 'User not found' };
    }

    if (!user.isVendor) {
      return { canBook: false, reason: 'Only vendors can make trial bookings' };
    }

    if (user.registrationStatus !== 'trial_active' && user.registrationStatus !== 'preregistered') {
      return { canBook: false, reason: 'User is not in trial period' };
    }

    // Check if trial has expired
    if (user.registrationStatus === 'trial_active' && user.trialEndDate && user.trialEndDate <= new Date()) {
      return { canBook: false, reason: 'Trial period has expired' };
    }

    // Check if user already has an active trial booking
    const existingTrialBooking = await Vertrag.findOne({
      user: userId,
      istProbemonatBuchung: true,
      status: { $in: ['active', 'scheduled', 'pending'] },
      gekuendigtInProbemonat: false
    });

    if (existingTrialBooking) {
      return { canBook: false, reason: 'User already has an active trial booking' };
    }

    return { canBook: true };
  }

  /**
   * @description Get all trial contracts
   * @security Returns trial contracts with populated user data
   * @complexity Medium - Database query with multiple populations
   * @returns {Promise<IVertrag[]>} Array of trial contracts
   */
  async getTrialContracts(): Promise<IVertrag[]> {
    return await Vertrag.find({ istProbemonatBuchung: true })
      .populate('user', 'username kontakt.name registrationStatus trialEndDate')
      .populate('probemonatUserId', 'username kontakt.name')
      .populate('services.mietfach', 'bezeichnung typ beschreibung standort groesse preis')
      .sort({ createdAt: -1 });
  }

  /**
   * @description Get contracts for revenue calculation (excluding unpaid trial bookings)
   * @param {Date} startDate - Start date for revenue period
   * @param {Date} endDate - End date for revenue period
   * @security Filters contracts based on payment eligibility
   * @complexity High - Complex query with trial payment date validation
   * @returns {Promise<IVertrag[]>} Array of contracts eligible for revenue
   */
  async getContractsForRevenue(startDate: Date, endDate: Date): Promise<IVertrag[]> {
    return await Vertrag.find({
      status: 'active',
      scheduledStartDate: { $lte: endDate },
      $and: [
        {
          $or: [
            { 'availabilityImpact.to': { $gte: startDate } },
            { 'availabilityImpact.to': null }
          ]
        },
        {
          // Exclude trial bookings that haven't reached payment date yet
          $or: [
            { istProbemonatBuchung: false },
            { zahlungspflichtigAb: { $lte: endDate } }
          ]
        }
      ]
    }).populate('services.mietfach', 'bezeichnung typ preis');
  }
}

export const vertragService = new VertragService();