/**
 * @file adminController.test.ts
 * @purpose Unit tests for adminController functions, specifically testing Mietfach availability logic
 * @created 2025-08-06
 */

import { Request, Response } from 'express';
import { checkMietfachAvailability } from './adminController';
import Mietfach from '../models/Mietfach';
import Vertrag from '../models/Vertrag';
import logger from '../utils/logger';

// Mock dependencies
jest.mock('../models/Mietfach');
jest.mock('../models/Vertrag');
jest.mock('../utils/logger');

describe('adminController', () => {
  describe('checkMietfachAvailability', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Setup response mocks
      jsonMock = jest.fn();
      statusMock = jest.fn().mockReturnThis();
      
      res = {
        json: jsonMock,
        status: statusMock
      };
    });

    it('should return all Mietfächer matching type filter regardless of verfuegbar status', async () => {
      // Setup request
      req = {
        body: {
          startDate: '2025-09-01',
          duration: 3,
          requestedTypes: ['regal']
        }
      };

      // Mock Mietfächer - including both verfuegbar true and false
      const mockMietfaecher = [
        {
          _id: '1',
          bezeichnung: 'Regal A1',
          typ: 'regal',
          verfuegbar: true,
          beschreibung: 'Regal im Erdgeschoss',
          groesse: '2m²',
          standort: 'EG',
          features: [],
          isAvailableForPeriod: jest.fn().mockResolvedValue(true)
        },
        {
          _id: '2',
          bezeichnung: 'Regal A2',
          typ: 'regal',
          verfuegbar: false, // Currently occupied
          beschreibung: 'Regal im Erdgeschoss',
          groesse: '2m²',
          standort: 'EG',
          features: [],
          isAvailableForPeriod: jest.fn().mockResolvedValue(true) // But available in future
        }
      ];

      // Mock database query
      const selectMock = jest.fn().mockResolvedValue(mockMietfaecher);
      (Mietfach.find as jest.Mock).mockReturnValue({ select: selectMock });

      // Execute
      await checkMietfachAvailability(req as Request, res as Response);

      // Verify that find was called WITHOUT verfuegbar filter
      expect(Mietfach.find).toHaveBeenCalledWith({
        typ: { $in: ['regal', 'regal-a', 'regal-b'] }
      });

      // Verify both Mietfächer are returned
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        mietfaecher: expect.arrayContaining([
          expect.objectContaining({ _id: '1', available: true }),
          expect.objectContaining({ _id: '2', available: true })
        ])
      });
    });

    it('should show currently occupied Mietfach as available for future period after rental ends', async () => {
      // Setup request for future booking
      const futureStart = new Date('2025-12-01');
      req = {
        body: {
          startDate: futureStart.toISOString(),
          duration: 2,
          requestedTypes: ['kuehl']
        }
      };

      // Mock a currently occupied Mietfach
      const mockMietfach = {
        _id: 'mf1',
        bezeichnung: 'Kühlregal K1',
        typ: 'kuehl',
        verfuegbar: false, // Currently marked as unavailable
        beschreibung: 'Kühlregal',
        groesse: '1m²',
        standort: 'KG',
        features: ['gekühlt'],
        isAvailableForPeriod: jest.fn().mockImplementation(async (start: Date, end: Date) => {
          // Current rental ends 2025-11-30, so future booking is available
          return start >= new Date('2025-12-01');
        })
      };

      const selectMock = jest.fn().mockResolvedValue([mockMietfach]);
      (Mietfach.find as jest.Mock).mockReturnValue({ select: selectMock });

      // Execute
      await checkMietfachAvailability(req as Request, res as Response);

      // Verify the Mietfach is included despite verfuegbar: false
      expect(Mietfach.find).toHaveBeenCalledWith({
        typ: { $in: ['kuehl', 'kuehlregal', 'gekuehlt'] }
      });

      // Verify it shows as available for the future period
      expect(mockMietfach.isAvailableForPeriod).toHaveBeenCalledWith(
        futureStart,
        expect.any(Date)
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        mietfaecher: [
          expect.objectContaining({
            _id: 'mf1',
            bezeichnung: 'Kühlregal K1',
            available: true
          })
        ]
      });
    });

    it('should handle Mietfach with conflicts correctly', async () => {
      req = {
        body: {
          startDate: '2025-09-01',
          duration: 3,
          requestedTypes: ['all']
        }
      };

      const mockMietfach = {
        _id: 'mf2',
        bezeichnung: 'Regal B1',
        typ: 'regal',
        beschreibung: 'Test',
        groesse: '3m²',
        standort: 'OG',
        features: [],
        isAvailableForPeriod: jest.fn().mockResolvedValue(false) // Not available due to conflict
      };

      const selectMock = jest.fn().mockResolvedValue([mockMietfach]);
      (Mietfach.find as jest.Mock).mockReturnValue({ select: selectMock });

      // Mock conflict
      const mockConflict = {
        _id: 'contract1',
        user: { kontakt: { name: 'Test User' } },
        availabilityImpact: {
          from: new Date('2025-08-15'),
          to: new Date('2025-10-15')
        },
        status: 'active'
      };

      const populateMock = jest.fn().mockResolvedValue([mockConflict]);
      const conflictSelectMock = jest.fn().mockReturnValue({ populate: populateMock });
      (Vertrag.find as jest.Mock).mockReturnValue({ select: conflictSelectMock });

      // Execute
      await checkMietfachAvailability(req as Request, res as Response);

      // Verify response includes conflict information
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        mietfaecher: [
          expect.objectContaining({
            _id: 'mf2',
            available: false,
            conflicts: expect.arrayContaining([
              expect.objectContaining({
                contractId: 'contract1',
                userName: 'Test User'
              })
            ]),
            nextAvailable: expect.any(Date)
          })
        ]
      });
    });

    it('should not filter by verfuegbar field in database query', async () => {
      req = {
        body: {
          startDate: '2025-09-01',
          duration: 1,
          requestedTypes: ['schaufenster']
        }
      };

      const selectMock = jest.fn().mockResolvedValue([]);
      (Mietfach.find as jest.Mock).mockReturnValue({ select: selectMock });

      await checkMietfachAvailability(req as Request, res as Response);

      // Ensure the query does NOT include verfuegbar field
      const findCall = (Mietfach.find as jest.Mock).mock.calls[0][0];
      expect(findCall).not.toHaveProperty('verfuegbar');
      expect(findCall).toEqual({
        typ: { $in: ['schaufenster'] }
      });
    });

    it('should return error for missing required fields', async () => {
      req = {
        body: {
          startDate: '2025-09-01'
          // Missing duration and requestedTypes
        }
      };

      await checkMietfachAvailability(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Fehlende Pflichtfelder')
      });
    });
  });
});