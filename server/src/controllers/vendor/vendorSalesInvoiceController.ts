/**
 * @file vendorSalesInvoiceController.ts
 * @purpose Vendor-seitige Endpunkte für die Verkaufsrechnungen (F2a, SalesInvoice)
 *          und das Verkaufs-Reporting (F3) aus dem VendorSale-Ledger.
 * @created 2026-07-07
 *
 * Jeder Endpunkt liefert ausschließlich Daten des eingeloggten Vendors
 * (Ownership über req.user.id).
 */

import { Response } from 'express';
import mongoose, { Types } from 'mongoose';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../../middleware/auth';
import { SalesInvoice } from '../../models/SalesInvoice';
import { VendorSale } from '../../models/VendorSale';
import logger from '../../utils/logger';

/** GET /vendor-auth/sales-invoices — Verkaufsrechnungen des Vendors (paginiert). */
export const getVendorSalesInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(403).json({ success: false, message: 'Keine Berechtigung' });
      return;
    }
    const { page = 1, limit = 10, status } = req.query;
    const query: Record<string, unknown> = { vendor: req.user.id };
    if (status && typeof status === 'string') query.status = status;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      SalesInvoice.find(query)
        .select('-items') // Liste kompakt; Positionen erst im Detail
        .sort({ issueDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SalesInvoice.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
      }
    });
  } catch (error) {
    logger.error('[vendorSalesInvoices] Liste fehlgeschlagen', { error });
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
};

/** GET /vendor-auth/sales-invoices/:id — Detail einer eigenen Verkaufsrechnung. */
export const getVendorSalesInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(403).json({ success: false, message: 'Keine Berechtigung' });
      return;
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Ungültige Rechnungs-ID' });
      return;
    }
    const invoice = await SalesInvoice.findOne({ _id: id, vendor: req.user.id }).lean();
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Rechnung nicht gefunden' });
      return;
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    logger.error('[vendorSalesInvoices] Detail fehlgeschlagen', { error });
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
};

/** GET /vendor-auth/sales-invoices/:id/download — PDF der eigenen Verkaufsrechnung. */
export const downloadVendorSalesInvoicePdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(403).json({ success: false, message: 'Keine Berechtigung' });
      return;
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Ungültige Rechnungs-ID' });
      return;
    }
    const invoice = await SalesInvoice.findOne({ _id: id, vendor: req.user.id }).lean();
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Rechnung nicht gefunden' });
      return;
    }
    if (!invoice.pdfPath) {
      res.status(409).json({ success: false, message: 'PDF noch nicht erzeugt' });
      return;
    }
    const absPath = path.join(process.cwd(), invoice.pdfPath);
    if (!fs.existsSync(absPath)) {
      res.status(404).json({ success: false, message: 'PDF-Datei nicht gefunden' });
      return;
    }
    res.download(absPath, `${invoice.invoiceNumber}.pdf`);
  } catch (error) {
    logger.error('[vendorSalesInvoices] Download fehlgeschlagen', { error });
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
};

/**
 * GET /vendor-auth/sales-report — F3-Reporting aus dem Verkaufs-Ledger.
 * Optional: ?from=YYYY-MM-DD&to=YYYY-MM-DD (Standard: alle).
 * Liefert Gesamtsummen, Monatsverlauf und Top-Produkte (Netto).
 */
export const getVendorSalesReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(403).json({ success: false, message: 'Keine Berechtigung' });
      return;
    }
    const vendorId = new mongoose.Types.ObjectId(req.user.id);
    const match: Record<string, unknown> = { vendorId };
    const { from, to } = req.query;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from && typeof from === 'string') range.$gte = new Date(from);
      if (to && typeof to === 'string') range.$lte = new Date(to);
      match.saleDate = range;
    }

    const [totals, byMonth, topProducts] = await Promise.all([
      VendorSale.aggregate([
        { $match: match },
        { $group: { _id: null, net: { $sum: '$netAmount' }, gross: { $sum: '$grossAmount' }, count: { $sum: 1 } } }
      ]),
      VendorSale.aggregate([
        { $match: match },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
          net: { $sum: '$netAmount' }, gross: { $sum: '$grossAmount' }, count: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
      ]),
      VendorSale.aggregate([
        { $match: match },
        { $group: { _id: '$productId', net: { $sum: '$netAmount' }, qty: { $sum: '$quantity' } } },
        { $sort: { net: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $project: {
          productId: '$_id', _id: 0, net: 1, qty: 1,
          name: { $ifNull: [{ $arrayElemAt: ['$product.name', 0] }, 'Unbekannt'] }
        } }
      ])
    ]);

    const summary = totals[0] || { net: 0, gross: 0, count: 0 };
    res.json({
      success: true,
      data: {
        totals: {
          net: Math.round(summary.net * 100) / 100,
          gross: Math.round(summary.gross * 100) / 100,
          count: summary.count
        },
        byMonth: byMonth.map((m: any) => ({
          period: m._id,
          net: Math.round(m.net * 100) / 100,
          gross: Math.round(m.gross * 100) / 100,
          count: m.count
        })),
        topProducts: topProducts.map((p: any) => ({
          productId: p.productId,
          name: p.name,
          net: Math.round(p.net * 100) / 100,
          qty: p.qty
        }))
      }
    });
  } catch (error) {
    logger.error('[vendorSalesReport] Report fehlgeschlagen', { error });
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
};
