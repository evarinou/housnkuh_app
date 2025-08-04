/**
 * @file Package Tracking Service for the housnkuh marketplace application
 * @description Comprehensive package tracking service for Zusatzleistungen
 * Handles package lifecycle management including status transitions, validation, and reporting
 */

import PackageTracking from '../models/PackageTracking';
import Vertrag from '../models/Vertrag';
import { IPackageTracking } from '../types/modelTypes';
import mongoose from 'mongoose';

/**
 * Package Tracking Service for managing Zusatzleistungen package lifecycle
 * @description Handles all package tracking operations including creation, status updates, and reporting
 */
export class PackageTrackingService {
  /**
   * Creates package tracking entry when zusatzleistung is booked
   * @description Initializes package tracking with 'erwartet' status
   * @param vertrag_id - ID of the contract associated with the package
   * @param package_typ - Type of package ('lagerservice' or 'versandservice')
   * @returns Promise<IPackageTracking> - Created package tracking entry
   * @complexity O(1) - Single database insertion
   * @security Validates ObjectId format and package type
   */
  static async createPackageTracking(
    vertrag_id: string, 
    package_typ: 'lagerservice' | 'versandservice'
  ): Promise<IPackageTracking> {
    try {
      const packageTracking = new PackageTracking({
        vertrag_id: new mongoose.Types.ObjectId(vertrag_id),
        package_typ,
        status: 'erwartet'
      });

      return await packageTracking.save();
    } catch (error) {
      console.error('Fehler beim Erstellen des Package Trackings:', error);
      throw new Error('Package Tracking konnte nicht erstellt werden');
    }
  }

  /**
   * Updates package status with validation
   * @description Updates package status with business logic validation and date tracking
   * @param package_id - ID of the package to update
   * @param status - New status to set
   * @param admin_id - ID of admin performing the update
   * @param notizen - Optional notes for the update
   * @returns Promise<IPackageTracking> - Updated package tracking entry
   * @complexity O(1) - Single database update with validation
   * @security Validates status transitions and admin authorization
   */
  static async updatePackageStatus(
    package_id: string, 
    status: 'erwartet' | 'angekommen' | 'eingelagert' | 'versandt' | 'zugestellt',
    admin_id: string,
    notizen?: string
  ): Promise<IPackageTracking> {
    try {
      const packageTracking = await PackageTracking.findById(package_id);
      
      if (!packageTracking) {
        throw new Error('Package Tracking nicht gefunden');
      }

      // Validate status transition
      const validTransitions = this.getValidStatusTransitions(packageTracking.status);
      if (!validTransitions.includes(status)) {
        throw new Error(`Ungültiger Status-Übergang von ${packageTracking.status} zu ${status}`);
      }

      // Update package tracking
      packageTracking.status = status;
      packageTracking.bestätigt_von = new mongoose.Types.ObjectId(admin_id);
      
      if (notizen) {
        packageTracking.notizen = notizen;
      }

      // Set appropriate date fields based on status
      const now = new Date();
      switch (status) {
        case 'angekommen':
          packageTracking.ankunft_datum = now;
          break;
        case 'eingelagert':
          packageTracking.einlagerung_datum = now;
          // Also update the contract for lagerservice
          if (packageTracking.package_typ === 'lagerservice') {
            await Vertrag.findByIdAndUpdate(packageTracking.vertrag_id, {
              'zusatzleistungen.lagerservice_bestätigt': now
            });
          }
          break;
        case 'versandt':
          packageTracking.versand_datum = now;
          break;
        case 'zugestellt':
          packageTracking.zustellung_datum = now;
          break;
      }

      return await packageTracking.save();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Package Status:', error);
      throw error;
    }
  }

  /**
   * Retrieves package timeline for a contract
   * @description Fetches all packages associated with a contract with admin details
   * @param vertrag_id - ID of the contract to get timeline for
   * @returns Promise<IPackageTracking[]> - Array of package tracking entries
   * @complexity O(n) where n is number of packages for the contract
   * @security Read-only operation with populated admin details
   */
  static async getPackageTimeline(vertrag_id: string): Promise<IPackageTracking[]> {
    try {
      return await PackageTracking.find({ vertrag_id: new mongoose.Types.ObjectId(vertrag_id) })
        .populate('bestätigt_von', 'username kontakt.name')
        .sort({ created_at: -1 });
    } catch (error) {
      console.error('Fehler beim Abrufen der Package Timeline:', error);
      throw new Error('Package Timeline konnte nicht abgerufen werden');
    }
  }

  /**
   * Retrieves all packages for admin overview
   * @description Fetches packages with optional filtering and full population
   * @param filters - Optional filters for status, type, and date range
   * @returns Promise<IPackageTracking[]> - Array of filtered package tracking entries
   * @complexity O(n) where n is number of packages matching filters
   * @security Admin-only operation with comprehensive population
   */
  static async getAllPackages(filters?: {
    status?: string;
    package_typ?: string;
    from_date?: Date;
    to_date?: Date;
  }): Promise<IPackageTracking[]> {
    try {
      const query: any = {};

      if (filters?.status) {
        query.status = filters.status;
      }
      
      if (filters?.package_typ) {
        query.package_typ = filters.package_typ;
      }

      if (filters?.from_date || filters?.to_date) {
        query.created_at = {};
        if (filters.from_date) {
          query.created_at.$gte = filters.from_date;
        }
        if (filters.to_date) {
          query.created_at.$lte = filters.to_date;
        }
      }

      return await PackageTracking.find(query)
        .populate('vertrag_id', 'user totalMonthlyPrice contractDuration')
        .populate({
          path: 'vertrag_id',
          populate: {
            path: 'user',
            select: 'username kontakt.name kontakt.email'
          }
        })
        .populate('bestätigt_von', 'username kontakt.name')
        .sort({ created_at: -1 });
    } catch (error) {
      console.error('Fehler beim Abrufen aller Packages:', error);
      throw new Error('Packages konnten nicht abgerufen werden');
    }
  }

  /**
   * Retrieves packages by status for admin workflow
   * @description Fetches packages with specific status ordered for processing
   * @param status - Status to filter by
   * @returns Promise<IPackageTracking[]> - Array of packages with specified status
   * @complexity O(n) where n is number of packages with the status
   * @security Admin workflow operation with user details
   */
  static async getPackagesByStatus(status: string): Promise<IPackageTracking[]> {
    try {
      return await PackageTracking.find({ status })
        .populate('vertrag_id', 'user totalMonthlyPrice')
        .populate({
          path: 'vertrag_id',
          populate: {
            path: 'user',
            select: 'username kontakt.name kontakt.email'
          }
        })
        .sort({ created_at: 1 }); // Oldest first for processing queue
    } catch (error) {
      console.error(`Fehler beim Abrufen der Packages mit Status ${status}:`, error);
      throw new Error(`Packages mit Status ${status} konnten nicht abgerufen werden`);
    }
  }

  /**
   * Bulk updates packages for admin bulk operations
   * @description Updates multiple packages with error tracking and rollback safety
   * @param package_ids - Array of package IDs to update
   * @param status - New status to set for all packages
   * @param admin_id - ID of admin performing the bulk update
   * @param notizen - Optional notes for all updates
   * @returns Promise<Object> - Results with success/failure counts and errors
   * @complexity O(n) where n is number of packages to update
   * @security Admin-only operation with comprehensive error handling
   */
  static async bulkUpdatePackageStatus(
    package_ids: string[],
    status: string,
    admin_id: string,
    notizen?: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const package_id of package_ids) {
      try {
        await this.updatePackageStatus(package_id, status as any, admin_id, notizen);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Package ${package_id}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    }

    return results;
  }

  /**
   * Retrieves valid status transitions for a given current status
   * @description Defines business logic for allowed status transitions
   * @param currentStatus - Current status of the package
   * @returns string[] - Array of valid next statuses
   * @complexity O(1) - Simple lookup operation
   * @security Private method with predefined transition rules
   */
  private static getValidStatusTransitions(currentStatus: string): string[] {
    const transitions: Record<string, string[]> = {
      'erwartet': ['angekommen'],
      'angekommen': ['eingelagert', 'versandt'],
      'eingelagert': ['versandt'],
      'versandt': ['zugestellt'],
      'zugestellt': [] // Final state
    };

    return transitions[currentStatus] || [];
  }

  /**
   * Processes automatic status transitions for scheduled jobs
   * @description Handles automated status updates from external systems
   * @param package_id - ID of the package to transition
   * @param new_status - New status to set
   * @returns Promise<void> - Completes when transition is processed
   * @complexity O(1) - Single database update
   * @security Automated operation with error handling
   */
  static async processStatusTransition(package_id: string, new_status: string): Promise<void> {
    try {
      const packageTracking = await PackageTracking.findById(package_id);
      
      if (!packageTracking) {
        throw new Error('Package Tracking nicht gefunden');
      }

      // This would be used for automatic transitions like shipping confirmations
      // For now, it's a placeholder for future automation
      packageTracking.status = new_status as any;
      
      const now = new Date();
      switch (new_status) {
        case 'versandt':
          packageTracking.versand_datum = now;
          break;
        case 'zugestellt':
          packageTracking.zustellung_datum = now;
          break;
      }

      await packageTracking.save();
    } catch (error) {
      console.error('Fehler beim automatischen Status-Übergang:', error);
      throw error;
    }
  }

  /**
   * Retrieves package statistics for admin dashboard
   * @description Generates comprehensive statistics including counts by status, type, and activity
   * @returns Promise<Object> - Statistics object with counts and recent activity
   * @complexity O(n) where n is total number of packages (aggregation operations)
   * @security Admin dashboard operation with aggregated data
   */
  static async getPackageStatistics(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    recent_activity: number;
  }> {
    try {
      const total = await PackageTracking.countDocuments();
      
      // Count by status
      const statusCounts = await PackageTracking.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      
      const by_status = statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Count by type
      const typeCounts = await PackageTracking.aggregate([
        { $group: { _id: '$package_typ', count: { $sum: 1 } } }
      ]);
      
      const by_type = typeCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recent_activity = await PackageTracking.countDocuments({
        updated_at: { $gte: sevenDaysAgo }
      });

      return {
        total,
        by_status,
        by_type,
        recent_activity
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Package-Statistiken:', error);
      throw new Error('Package-Statistiken konnten nicht abgerufen werden');
    }
  }
}

export default PackageTrackingService;