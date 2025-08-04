/**
 * @file Vendor Contract controller for the housnkuh marketplace application
 * @description Vendor contract management controller with trial cancellation and contract operations
 * Handles vendor-specific contract operations including trial management and cancellations
 */

import { Request, Response } from 'express';
import { vertragService } from '../services/vertragService';
import { sendCancellationConfirmationEmail } from '../utils/emailService';
import Vertrag from '../models/Vertrag';
import User from '../models/User';

export class VendorContractController {
  /**
   * POST /api/vendor/contracts/trial-cancel/:vertragId
   * Cancel a trial booking
   */
  async cancelTrialBooking(req: Request, res: Response): Promise<void> {
    try {
      const { vertragId } = req.params;
      const userId = (req as any).user._id;
      
      // Validate the contract belongs to the user and is a trial booking
      const vertrag = await Vertrag.findById(vertragId).populate('services.mietfach');
      const user = await User.findById(userId);
      
      if (!vertrag || !user) {
        res.status(404).json({
          success: false,
          error: 'Vertrag oder Benutzer nicht gefunden'
        });
        return;
      }

      if (vertrag.user.toString() !== userId) {
        res.status(403).json({
          success: false,
          error: 'Keine Berechtigung für diesen Vertrag'
        });
        return;
      }

      if (!vertrag.istProbemonatBuchung) {
        res.status(400).json({
          success: false,
          error: 'Dies ist keine Probemonat-Buchung'
        });
        return;
      }

      if (vertrag.gekuendigtInProbemonat) {
        res.status(400).json({
          success: false,
          error: 'Diese Probemonat-Buchung wurde bereits storniert'
        });
        return;
      }

      // Cancel the trial booking
      await vertragService.cancelTrialBooking(vertragId, userId);
      
      // Send cancellation email
      try {
        await sendCancellationConfirmationEmail(
          user.kontakt?.email || user.username || '',
          user.kontakt?.name || user.username || '',
          user.trialEndDate || null
        );
      } catch (emailError) {
        console.error('Failed to send cancellation email:', emailError);
        // Continue with success response even if email fails
      }
      
      res.json({
        success: true,
        message: 'Probemonat-Buchung erfolgreich storniert'
      });
    } catch (error) {
      console.error('Error cancelling trial booking:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Stornieren der Probemonat-Buchung'
      });
    }
  }

  /**
   * GET /api/vendor/contracts/trial-status
   * Get current trial status and bookings
   */
  async getTrialStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user._id;
      
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Benutzer nicht gefunden'
        });
        return;
      }

      // Get all trial contracts for this user
      const trialContracts = await Vertrag.find({
        user: userId,
        istProbemonatBuchung: true
      })
      .populate('services.mietfach', 'bezeichnung nummer typ standort')
      .sort({ createdAt: -1 });

      // Calculate days remaining in trial
      let daysRemaining = 0;
      if (user.trialEndDate && user.registrationStatus === 'trial_active') {
        const now = new Date();
        const diff = user.trialEndDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      res.json({
        success: true,
        data: {
          isInTrial: user.registrationStatus === 'trial_active',
          trialEndDate: user.trialEndDate,
          trialStartDate: user.trialStartDate,
          daysRemaining: daysRemaining,
          canCancelBookings: daysRemaining > 0,
          trialBookings: trialContracts.map(contract => ({
            id: contract._id,
            mietfaecher: contract.services.map((service: any) => ({
              id: service.mietfach._id,
              name: service.mietfach.bezeichnung || `Mietfach ${service.mietfach.nummer}`,
              typ: service.mietfach.typ,
              standort: service.mietfach.standort,
              preis: service.monatspreis
            })),
            startDate: contract.scheduledStartDate,
            status: contract.status,
            isCancelled: contract.gekuendigtInProbemonat,
            cancellationDate: contract.probemonatKuendigungsdatum,
            willBeChargedOn: contract.zahlungspflichtigAb,
            canCancel: !contract.gekuendigtInProbemonat && daysRemaining > 0
          }))
        }
      });
    } catch (error) {
      console.error('Error getting trial status:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler beim Abrufen des Probemonat-Status'
      });
    }
  }

  /**
   * GET /api/vendor/contracts/my-bookings
   * Get all bookings for the current vendor
   */
  async getMyBookings(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user._id;
      const { status, includeTrialOnly } = req.query;

      let query: any = { user: userId };
      
      if (status && status !== 'all') {
        query.status = status;
      }

      if (includeTrialOnly === 'true') {
        query.istProbemonatBuchung = true;
      }

      const contracts = await Vertrag.find(query)
        .populate('user', 'username kontakt.name registrationStatus')
        .populate('services.mietfach', 'bezeichnung nummer typ standort groesse preis')
        .sort({ createdAt: -1 });

      const transformedContracts = contracts.map(contract => ({
        id: contract._id,
        status: contract.status,
        isTrialBooking: contract.istProbemonatBuchung,
        isCancelled: contract.gekuendigtInProbemonat,
        startDate: contract.scheduledStartDate,
        endDate: contract.availabilityImpact?.to,
        paymentStartDate: contract.zahlungspflichtigAb,
        totalMonthlyPrice: contract.totalMonthlyPrice,
        mietfaecher: contract.services.map((service: any) => ({
          id: service.mietfach._id,
          name: service.mietfach.bezeichnung || `Mietfach ${service.mietfach.nummer}`,
          typ: service.mietfach.typ,
          standort: service.mietfach.standort,
          groesse: service.mietfach.groesse,
          monthlyPrice: service.monatspreis
        })),
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      }));

      res.json({
        success: true,
        data: {
          contracts: transformedContracts,
          total: transformedContracts.length
        }
      });
    } catch (error) {
      console.error('Error getting vendor bookings:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler beim Abrufen der Buchungen'
      });
    }
  }

  /**
   * POST /api/vendor/contracts/validate-trial
   * Validate if user can make a trial booking
   */
  async validateTrialBooking(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user._id;
      
      const result = await vertragService.canMakeTrialBooking(userId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error validating trial booking:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler bei der Validierung der Probemonat-Buchung'
      });
    }
  }

  /**
   * GET /api/vendor/contracts/:contractId
   * Get detailed information about a specific contract
   */
  async getContractDetails(req: Request, res: Response): Promise<void> {
    try {
      const { contractId } = req.params;
      const userId = (req as any).user._id;

      const contract = await Vertrag.findById(contractId)
        .populate('user', 'username kontakt.name registrationStatus trialEndDate')
        .populate('services.mietfach', 'bezeichnung nummer typ standort groesse preis beschreibung');

      if (!contract) {
        res.status(404).json({
          success: false,
          error: 'Vertrag nicht gefunden'
        });
        return;
      }

      // Verify the contract belongs to the requesting user
      if (contract.user.toString() !== userId) {
        res.status(403).json({
          success: false,
          error: 'Keine Berechtigung für diesen Vertrag'
        });
        return;
      }

      const transformedContract = {
        id: contract._id,
        status: contract.status,
        isTrialBooking: contract.istProbemonatBuchung,
        isCancelled: contract.gekuendigtInProbemonat,
        cancellationDate: contract.probemonatKuendigungsdatum,
        startDate: contract.scheduledStartDate,
        endDate: contract.availabilityImpact?.to,
        paymentStartDate: contract.zahlungspflichtigAb,
        totalMonthlyPrice: contract.totalMonthlyPrice,
        contractDuration: contract.contractDuration,
        discount: contract.discount,
        mietfaecher: contract.services.map((service: any) => ({
          id: service.mietfach._id,
          name: service.mietfach.bezeichnung || `Mietfach ${service.mietfach.nummer}`,
          nummer: service.mietfach.nummer,
          typ: service.mietfach.typ,
          standort: service.mietfach.standort,
          groesse: service.mietfach.groesse,
          beschreibung: service.mietfach.beschreibung,
          monthlyPrice: service.monatspreis,
          originalPrice: service.mietfach.preis,
          startDate: service.mietbeginn,
          endDate: service.mietende
        })),
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt
      };

      res.json({
        success: true,
        data: transformedContract
      });
    } catch (error) {
      console.error('Error getting contract details:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler beim Abrufen der Vertragsdetails'
      });
    }
  }

  // Get contracts with zusatzleistungen and packages for vendor
  async getContractsWithZusatzleistungen(req: Request, res: Response): Promise<void> {
    try {
      const vendorId = (req as any).user._id;

      // Find all contracts for vendor with zusatzleistungen
      const contracts = await Vertrag.find({
        user: vendorId,
        $or: [
          { 'zusatzleistungen.lagerservice': true },
          { 'zusatzleistungen.versandservice': true }
        ]
      })
      .select('_id zusatzleistungen zusatzleistungen_kosten status scheduledStartDate')
      .lean();

      // Get packages for each contract
      const PackageTracking = require('../models/PackageTracking').default;
      const contractsWithPackages = await Promise.all(
        contracts.map(async (contract) => {
          const packages = await PackageTracking.find({
            vertrag_id: contract._id
          })
          .sort({ created_at: -1 })
          .lean();

          return {
            ...contract,
            packages
          };
        })
      );

      res.json({
        success: true,
        contracts: contractsWithPackages
      });
    } catch (error) {
      console.error('Error getting contracts with zusatzleistungen:', error);
      res.status(500).json({
        success: false,
        error: 'Fehler beim Abrufen der Verträge mit Zusatzleistungen'
      });
    }
  }
}

export const vendorContractController = new VendorContractController();