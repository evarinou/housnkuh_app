/**
 * @file vendorProfileController.ts
 * @purpose Vendor profile management and public profile endpoints extracted from vendorAuthController
 * @created 2026-03-26
 */

import { Request, Response, NextFunction } from 'express';
import User from '../../models/User';
import { Tag } from '../../models/Tag';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import mongoose from 'mongoose';
import logger from '../../utils/logger';
import AppError from '../../utils/AppError';

// Vendor Profile abrufen
export const getVendorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user?.id;

    // Sicherstellen, dass der User nur sein eigenes Profil abruft
    if (userId !== requestingUserId) {
      res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
      return;
    }

    const user = await User.findById(userId)
      .populate('vendorProfile.tags', 'name slug description category color icon')
      .populate('vendorProfile.businessDetails.certifications', 'name slug description category color icon')
      .populate('vendorProfile.businessDetails.productionMethods', 'name slug description category color icon');

    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    // Profildaten zusammenstellen
    const profileData = {
      name: user.kontakt.name,
      email: user.kontakt.email,
      telefon: user.kontakt.telefon || '',
      unternehmen: user.vendorProfile?.unternehmen || '',
      beschreibung: user.vendorProfile?.beschreibung || '',
      profilBild: user.vendorProfile?.profilBild || '',
      bannerBild: user.vendorProfile?.bannerBild || '', // Banner-Bild hinzugefügt
      adresse: user.adressen.length > 0 ? {
        strasse: user.adressen[0].strasse,
        hausnummer: user.adressen[0].hausnummer,
        plz: user.adressen[0].plz,
        ort: user.adressen[0].ort
      } : {
        strasse: '',
        hausnummer: '',
        plz: '',
        ort: ''
      },
      oeffnungszeiten: user.vendorProfile?.oeffnungszeiten || {
        montag: '',
        dienstag: '',
        mittwoch: '',
        donnerstag: '',
        freitag: '',
        samstag: '',
        sonntag: ''
      },
      // Tag-basiertes System
      tags: (user.vendorProfile as any)?.tags || [],
      businessDetails: {
        certifications: (user.vendorProfile as any)?.businessDetails?.certifications || [],
        productionMethods: (user.vendorProfile as any)?.businessDetails?.productionMethods || [],
        businessType: (user.vendorProfile as any)?.businessDetails?.businessType || 'farm',
        farmSize: (user.vendorProfile as any)?.businessDetails?.farmSize || '',
        founded: (user.vendorProfile as any)?.businessDetails?.founded || null
      },
      location: {
        coordinates: (user.vendorProfile as any)?.location?.coordinates || null,
        address: (user.vendorProfile as any)?.location?.address || '',
        deliveryRadius: (user.vendorProfile as any)?.location?.deliveryRadius || null,
        deliveryAreas: (user.vendorProfile as any)?.location?.deliveryAreas || []
      },
      operationalInfo: {
        seasonal: (user.vendorProfile as any)?.operationalInfo?.seasonal || false,
        yearRoundOperation: (user.vendorProfile as any)?.operationalInfo?.yearRoundOperation || true,
        peakSeason: (user.vendorProfile as any)?.operationalInfo?.peakSeason || null
      },

      slogan: user.vendorProfile?.slogan || '',
      website: user.vendorProfile?.website || '',
      socialMedia: user.vendorProfile?.socialMedia || {
        facebook: '',
        instagram: ''
      },
      verifyStatus: user.vendorProfile?.verifyStatus || 'unverified',
      steuerstatus: user.vendorProfile?.steuerstatus || 'kleinunternehmer',
      steuernummer: user.vendorProfile?.steuernummer || '',
      ustIdNr: user.vendorProfile?.ustIdNr || ''
    };

    res.json({
      success: true,
      profile: profileData
    });
  } catch (err) {
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Vendor Profile aktualisieren
export const updateVendorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).user?.id;

    // Sicherstellen, dass der User nur sein eigenes Profil bearbeitet
    if (userId !== requestingUserId) {
      res.status(403).json({
        success: false,
        message: 'Zugriff verweigert'
      });
      return;
    }

    const {
      name,
      telefon,
      unternehmen,
      beschreibung,
      profilBild,
      bannerBild,
      adresse,
      oeffnungszeiten,
      tags, // Array von Tag IDs oder Namen
      businessDetails,
      location,
      operationalInfo,
      slogan,
      website,
      socialMedia,
      steuernummer,
      ustIdNr
    } = req.body;

    logger.info('📤 Profile update request received:', {
      userId,
      hasProfilBild: !!profilBild,
      hasBannerBild: !!bannerBild,
      profilBildUrl: profilBild,
      bannerBildUrl: bannerBild
    });

    const user = await User.findById(userId);
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: 'Vendor nicht gefunden'
      });
      return;
    }

    // Kontaktdaten aktualisieren
    if (name) user.kontakt.name = name;
    if (telefon !== undefined) user.kontakt.telefon = telefon;

    // Adresse aktualisieren
    if (adresse) {
      if (user.adressen.length > 0) {
        // Erste Adresse aktualisieren
        user.adressen[0].strasse = adresse.strasse || user.adressen[0].strasse;
        user.adressen[0].hausnummer = adresse.hausnummer || user.adressen[0].hausnummer;
        user.adressen[0].plz = adresse.plz || user.adressen[0].plz;
        user.adressen[0].ort = adresse.ort || user.adressen[0].ort;
      } else {
        // Neue Adresse hinzufügen
        user.adressen.push({
          adresstyp: 'Hauptadresse',
          strasse: adresse.strasse,
          hausnummer: adresse.hausnummer,
          plz: adresse.plz,
          ort: adresse.ort,
          name1: user.kontakt.name,
          email: user.kontakt.email
        } as any);
      }
    }

    // Vendor-spezifische Profildaten aktualisieren
    if (!user.vendorProfile) {
      user.vendorProfile = {} as any;
    }

    const vendorProfile = user.vendorProfile!;

    if (profilBild !== undefined || bannerBild !== undefined) {
      logger.info('🖼️ Image URLs being updated:', {
        profilBild: profilBild,
        bannerBild: bannerBild
      });
    }

    if (unternehmen !== undefined) vendorProfile.unternehmen = unternehmen;
    if (beschreibung !== undefined) vendorProfile.beschreibung = beschreibung;
    // Steuer-Identnummern (steuerstatus bleibt admin-kontrolliert, hier nicht änderbar)
    if (steuernummer !== undefined) (vendorProfile as any).steuernummer = steuernummer;
    if (ustIdNr !== undefined) (vendorProfile as any).ustIdNr = ustIdNr;
    if (profilBild !== undefined) vendorProfile.profilBild = profilBild;
    if (bannerBild !== undefined) vendorProfile.bannerBild = bannerBild;
    if (oeffnungszeiten) vendorProfile.oeffnungszeiten = oeffnungszeiten;

    // Tag-System
    if (tags !== undefined) {
      const tagIds: mongoose.Types.ObjectId[] = [];

      for (const tagIdentifier of tags) {
        if (typeof tagIdentifier === 'string') {
          if (mongoose.Types.ObjectId.isValid(tagIdentifier)) {
            // Direkte ObjectId
            tagIds.push(new mongoose.Types.ObjectId(tagIdentifier));
          } else {
            // Tag-Name oder Slug - erstelle oder finde Tag
            const tag = await Tag.findOrCreateTags([tagIdentifier], 'product');
            if (tag && tag.length > 0) {
              tagIds.push(tag[0]._id);
            }
          }
        } else if (tagIdentifier && typeof tagIdentifier === 'object' && tagIdentifier._id) {
          // Tag-Objekt mit _id - extrahiere die ID
          const id = tagIdentifier._id || tagIdentifier.id;
          if (mongoose.Types.ObjectId.isValid(id)) {
            tagIds.push(new mongoose.Types.ObjectId(id));
          }
        }
      }

      (vendorProfile as any).tags = tagIds;
    }

    // Business Details aktualisieren
    if (businessDetails) {
      if (!(vendorProfile as any).businessDetails) {
        (vendorProfile as any).businessDetails = {};
      }

      const businessDetailsObj = (vendorProfile as any).businessDetails;

      if (businessDetails.founded !== undefined) {
        businessDetailsObj.founded = businessDetails.founded;
      }
      if (businessDetails.farmSize !== undefined) {
        businessDetailsObj.farmSize = businessDetails.farmSize;
      }
      if (businessDetails.businessType !== undefined) {
        businessDetailsObj.businessType = businessDetails.businessType;
      }

      // Zertifizierungen als Tags
      if (businessDetails.certifications) {
        const certificationIds: mongoose.Types.ObjectId[] = [];
        const certificationTags = await Tag.findOrCreateTags(businessDetails.certifications, 'certification');
        certificationTags.forEach(tag => certificationIds.push(tag._id));
        businessDetailsObj.certifications = certificationIds;
      }

      // Produktionsmethoden als Tags
      if (businessDetails.productionMethods) {
        const methodIds: mongoose.Types.ObjectId[] = [];
        const methodTags = await Tag.findOrCreateTags(businessDetails.productionMethods, 'method');
        methodTags.forEach(tag => methodIds.push(tag._id));
        businessDetailsObj.productionMethods = methodIds;
      }
    }

    // Location Details aktualisieren
    if (location) {
      if (!(vendorProfile as any).location) {
        (vendorProfile as any).location = {};
      }

      const locationObj = (vendorProfile as any).location;

      if (location.coordinates !== undefined) {
        locationObj.coordinates = location.coordinates;
      }
      if (location.address !== undefined) {
        locationObj.address = location.address;
      }
      if (location.deliveryRadius !== undefined) {
        locationObj.deliveryRadius = location.deliveryRadius;
      }
      if (location.deliveryAreas !== undefined) {
        locationObj.deliveryAreas = location.deliveryAreas;
      }
    }

    // Operational Info aktualisieren
    if (operationalInfo) {
      if (!(vendorProfile as any).operationalInfo) {
        (vendorProfile as any).operationalInfo = {};
      }

      const operationalObj = (vendorProfile as any).operationalInfo;

      if (operationalInfo.seasonal !== undefined) {
        operationalObj.seasonal = operationalInfo.seasonal;
      }
      if (operationalInfo.yearRoundOperation !== undefined) {
        operationalObj.yearRoundOperation = operationalInfo.yearRoundOperation;
      }
      if (operationalInfo.peakSeason !== undefined) {
        operationalObj.peakSeason = operationalInfo.peakSeason;
      }
    }

    if (slogan !== undefined) vendorProfile.slogan = slogan;
    if (website !== undefined) vendorProfile.website = website;
    if (socialMedia) vendorProfile.socialMedia = socialMedia;

    await user.save();

    res.json({
      success: true,
      message: 'Profil erfolgreich aktualisiert'
    });
  } catch (err) {
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Multer-Konfiguration für Bild-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/vendor-images');

    // Sicherstellen, dass das Upload-Verzeichnis existiert
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Eindeutigen Dateinamen generieren
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `vendor-${uniqueSuffix}${fileExtension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB Limit
  },
  fileFilter: (req, file, cb) => {
    // Nur Bilder erlauben
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  }
});

// Bild-Upload für Vendor-Profile (Profil- und Banner-Bilder)
export const uploadVendorImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Multer-Middleware manuell aufrufen
    upload.single('image')(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
              success: false,
              message: 'Datei ist zu groß. Maximum 5MB erlaubt.'
            });
            return;
          }
        }
        res.status(400).json({
          success: false,
          message: err.message || 'Fehler beim Upload'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Keine Datei hochgeladen'
        });
        return;
      }

      // URL für das hochgeladene Bild erstellen
      const imageUrl = `/uploads/vendor-images/${req.file.filename}`;

      res.json({
        success: true,
        imageUrl,
        message: 'Bild erfolgreich hochgeladen'
      });
    });
  } catch (err) {
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Alle Vendor-Profile für die öffentliche Übersicht abrufen mit erweiterten Filteroptionen
export const getAllVendorProfiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      search,
      tags, // Tag-basierte Filterung
      standorte,
      verifyStatus,
      registrationStatus,
      page = 1,
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Base query - nur aktive, bestätigte und öffentlich sichtbare Vendors
    const baseQuery: any = {
      isVendor: true,
      isFullAccount: true,
      'kontakt.status': 'aktiv',
      'kontakt.newsletterConfirmed': true,
      isPubliclyVisible: true
    };

    // Search filter - Tag-basiertes System
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      // Finde Tags, die zum Suchbegriff passen
      const matchingTags = await Tag.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex }
        ],
        isActive: true
      }).select('_id');

      const tagIds = matchingTags.map(tag => tag._id);

      baseQuery.$or = [
        { 'kontakt.name': searchRegex },
        { 'vendorProfile.unternehmen': searchRegex },
        { 'vendorProfile.beschreibung': searchRegex },
        { 'vendorProfile.tags': { $in: tagIds } } // Tag-basierte Suche
      ];
    }

    // Tag-basierte Filterung
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      const validTagIds: mongoose.Types.ObjectId[] = [];

      for (const tagIdentifier of tagsArray) {
        if (typeof tagIdentifier === 'string' && tagIdentifier.trim()) {
          // Versuche als ObjectId
          if (mongoose.Types.ObjectId.isValid(tagIdentifier)) {
            validTagIds.push(new mongoose.Types.ObjectId(tagIdentifier));
          } else {
            // Versuche als Tag-Name oder Slug
            const tag = await Tag.findOne({
              $or: [
                { slug: tagIdentifier.trim() },
                { name: tagIdentifier.trim() }
              ],
              isActive: true
            });
            if (tag) {
              validTagIds.push(tag._id);
            }
          }
        }
      }

      if (validTagIds.length > 0) {
        baseQuery['vendorProfile.tags'] = { $in: validTagIds };
      }
    }

    // Standorte filter (basierend auf Vendor-Adresse)
    if (standorte) {
      const standorteArray = Array.isArray(standorte) ? standorte : [standorte];
      const validStandorte = standorteArray.filter(ort => typeof ort === 'string' && ort.trim());

      if (validStandorte.length > 0) {
        baseQuery['adressen.ort'] = { $in: validStandorte };
      }
    }

    // Verify Status filter
    if (verifyStatus && typeof verifyStatus === 'string') {
      const validVerifyStatuses = ['verified', 'pending', 'unverified'];
      if (validVerifyStatuses.includes(verifyStatus)) {
        baseQuery['vendorProfile.verifyStatus'] = verifyStatus;
      }
    }

    // Registration Status filter (für Trial-Status etc.)
    if (registrationStatus && typeof registrationStatus === 'string') {
      const validRegistrationStatuses = ['trial_active', 'active', 'preregistered'];
      if (validRegistrationStatuses.includes(registrationStatus)) {
        baseQuery.registrationStatus = registrationStatus;
      }
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOptions: any = {};
    const validSortFields = ['name', 'unternehmen', 'registrationDate', 'verifyStatus'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'name';
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    if (sortField === 'name') {
      sortOptions['kontakt.name'] = sortDirection;
    } else if (sortField === 'unternehmen') {
      sortOptions['vendorProfile.unternehmen'] = sortDirection;
    } else if (sortField === 'registrationDate') {
      sortOptions['registrationDate'] = sortDirection;
    } else if (sortField === 'verifyStatus') {
      sortOptions['vendorProfile.verifyStatus'] = sortDirection;
    }

    // Execute query with pagination and populate tags
    const [vendors, totalCount] = await Promise.all([
      User.find(baseQuery)
        .select('kontakt vendorProfile adressen createdAt isPubliclyVisible registrationStatus registrationDate')
        .populate('vendorProfile.tags', 'name slug description category color icon')
        .populate('vendorProfile.businessDetails.certifications', 'name slug description category color icon')
        .populate('vendorProfile.businessDetails.productionMethods', 'name slug description category color icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(baseQuery)
    ]);

    // Verfügbare Filter-Optionen für Frontend ermitteln
    const [allVendors, allTags] = await Promise.all([
      User.find({
        isVendor: true,
        isFullAccount: true,
        'kontakt.status': 'aktiv',
        'kontakt.newsletterConfirmed': true,
        isPubliclyVisible: true
      }).select('vendorProfile.tags adressen.ort vendorProfile.verifyStatus registrationStatus')
        .populate('vendorProfile.tags', 'name slug category')
        .lean(),
      Tag.find({ isActive: true, category: 'product' }).select('name slug category').lean()
    ]);

    // Sammle alle verwendeten Tags
    const usedTags = new Set();
    allVendors.forEach(vendor => {
      if (vendor.vendorProfile?.tags) {
        vendor.vendorProfile.tags.forEach((tag: any) => {
          if (tag && tag.name) {
            usedTags.add(JSON.stringify({
              id: tag._id,
              name: tag.name,
              slug: tag.slug,
              category: tag.category
            }));
          }
        });
      }
    });

    const availableFilters = {
      // Tag-basierte Filter
      tags: Array.from(usedTags).map(tagStr => JSON.parse(tagStr as string)),
      allTags: allTags.map(tag => ({
        id: tag._id,
        name: tag.name,
        slug: tag.slug,
        category: tag.category
      })),

      standorte: [...new Set(allVendors.flatMap(v => v.adressen?.map(a => a.ort) || []))].filter(Boolean).sort(),
      verifyStatuses: [...new Set(allVendors.map(v => v.vendorProfile?.verifyStatus || 'unverified'))].sort(),
      registrationStatuses: [...new Set(allVendors.map(v => v.registrationStatus))].filter(Boolean).sort()
    };

    // Vendor-Daten für die öffentliche Anzeige formatieren
    const publicVendorData = vendors.map(vendor => ({
      id: vendor._id?.toString() || '',
      name: vendor.kontakt.name,
      unternehmen: vendor.vendorProfile?.unternehmen || '',
      beschreibung: vendor.vendorProfile?.beschreibung || '',
      profilBild: vendor.vendorProfile?.profilBild || '',
      bannerBild: vendor.vendorProfile?.bannerBild || '',
      telefon: vendor.kontakt.telefon || '',
      email: vendor.kontakt.email,
      adresse: vendor.adressen && vendor.adressen.length > 0 ? {
        strasse: vendor.adressen[0].strasse,
        hausnummer: vendor.adressen[0].hausnummer,
        plz: vendor.adressen[0].plz,
        ort: vendor.adressen[0].ort
      } : {
        strasse: '',
        hausnummer: '',
        plz: '',
        ort: ''
      },

      // Tag-basiertes System
      tags: vendor.vendorProfile?.tags || [],
      businessDetails: {
        certifications: vendor.vendorProfile?.businessDetails?.certifications || [],
        productionMethods: vendor.vendorProfile?.businessDetails?.productionMethods || [],
        businessType: vendor.vendorProfile?.businessDetails?.businessType || 'farm',
        farmSize: vendor.vendorProfile?.businessDetails?.farmSize || '',
        founded: vendor.vendorProfile?.businessDetails?.founded || null
      },
      location: {
        coordinates: vendor.vendorProfile?.location?.coordinates || null,
        address: vendor.vendorProfile?.location?.address || '',
        deliveryRadius: vendor.vendorProfile?.location?.deliveryRadius || null,
        deliveryAreas: vendor.vendorProfile?.location?.deliveryAreas || []
      },

      slogan: vendor.vendorProfile?.slogan || '',
      website: vendor.vendorProfile?.website || '',
      socialMedia: vendor.vendorProfile?.socialMedia || {
        facebook: '',
        instagram: ''
      },
      oeffnungszeiten: vendor.vendorProfile?.oeffnungszeiten || {},
      verifyStatus: vendor.vendorProfile?.verifyStatus || 'unverified',
      registrationStatus: vendor.registrationStatus,
      registrationDate: vendor.registrationDate,
      // TODO: Mietfächer werden später hinzugefügt, wenn die Vertragslogik fertig ist
      mietfaecher: []
    }));

    res.json({
      success: true,
      vendors: publicVendorData,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      },
      availableFilters
    });
  } catch (err) {
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Einzelnes Vendor-Profil für die öffentliche Anzeige abrufen
export const getPublicVendorProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      res.status(400).json({
        success: false,
        message: 'Vendor-ID ist erforderlich'
      });
      return;
    }

    // Vendor suchen (nur aktive, bestätigte und öffentlich sichtbare)
    const vendor = await User.findOne({
      _id: vendorId,
      isVendor: true,
      isFullAccount: true,
      'kontakt.status': 'aktiv',
      'kontakt.newsletterConfirmed': true,
      isPubliclyVisible: true  // Filter für öffentliche Sichtbarkeit
    }).select('kontakt vendorProfile adressen createdAt isPubliclyVisible')
      .populate('vendorProfile.tags', 'name slug description category color icon');

    if (!vendor) {
      res.status(404).json({
        success: false,
        message: 'Direktvermarkter nicht gefunden'
      });
      return;
    }

    // Get distinct product tags for this vendor
    const { Product } = await import('../../models/Product');
    const vendorProducts = await Product.find({ vendorId: vendor._id, isActive: true })
      .populate('tags', 'name slug color icon')
      .select('tags')
      .lean();

    const productTagMap = new Map<string, any>();
    for (const p of vendorProducts) {
      for (const tag of (p.tags || [])) {
        const t = tag as any;
        if (t._id) productTagMap.set(t._id.toString(), t);
      }
    }
    const productTags = Array.from(productTagMap.values());

    // Vendor-Daten für die öffentliche Anzeige formatieren
    const publicVendorData = {
      id: vendor._id?.toString() || '',
      name: vendor.kontakt.name,
      unternehmen: vendor.vendorProfile?.unternehmen || '',
      beschreibung: vendor.vendorProfile?.beschreibung || '',
      profilBild: vendor.vendorProfile?.profilBild || '',
      bannerBild: vendor.vendorProfile?.bannerBild || '', // Banner-Bild hinzugefügt
      telefon: vendor.kontakt.telefon || '',
      email: vendor.kontakt.email,
      adresse: vendor.adressen.length > 0 ? {
        strasse: vendor.adressen[0].strasse,
        hausnummer: vendor.adressen[0].hausnummer,
        plz: vendor.adressen[0].plz,
        ort: vendor.adressen[0].ort
      } : {
        strasse: '',
        hausnummer: '',
        plz: '',
        ort: ''
      },
      oeffnungszeiten: vendor.vendorProfile?.oeffnungszeiten || {
        montag: '',
        dienstag: '',
        mittwoch: '',
        donnerstag: '',
        freitag: '',
        samstag: '',
        sonntag: ''
      },
      // Tags from vendor's actual products (distinct)
      tags: productTags,
      // Vendor profile tags (vendor self-description)
      profileTags: (vendor.vendorProfile as any)?.tags || [],
      slogan: vendor.vendorProfile?.slogan || '',
      website: vendor.vendorProfile?.website || '',
      socialMedia: vendor.vendorProfile?.socialMedia || {
        facebook: '',
        instagram: ''
      },
      verifyStatus: vendor.vendorProfile?.verifyStatus || 'unverified',
      // TODO: Mietfächer werden später hinzugefügt, wenn die Vertragslogik fertig ist
      mietfaecher: []
    };

    res.json({
      success: true,
      vendor: publicVendorData
    });
  } catch (err) {
    next(new AppError('Ein Serverfehler ist aufgetreten', 500, err));
  }
};

// Cancel vendor trial/subscription
export const cancelVendorSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // Verify the user is cancelling their own subscription
    if ((req as any).user?.id !== userId) {
      res.status(403).json({
        success: false,
        message: "Keine Berechtigung"
      });
      return;
    }

    // Find the vendor
    const user = await User.findById(userId);
    if (!user || !user.isVendor) {
      res.status(404).json({
        success: false,
        message: "Vendor nicht gefunden"
      });
      return;
    }

    // Check current registration status
    if (user.registrationStatus === 'cancelled') {
      res.status(400).json({
        success: false,
        message: "Account ist bereits gekündigt"
      });
      return;
    }

    // Update registration status to cancelled
    user.registrationStatus = 'cancelled';
    user.isPubliclyVisible = false; // Hide from public listings

    // Log cancellation reason if provided
    if (reason) {
      logger.info('Vendor cancelled subscription:', { email: user.kontakt.email, reason });
    }

    await user.save();

    // Send cancellation confirmation email
    try {
      const { sendCancellationConfirmationEmail } = require('../../utils/emailService');
      await sendCancellationConfirmationEmail(
        user.kontakt.email,
        user.kontakt.name,
        user.trialEndDate
      );
    } catch (emailError) {
      logger.error('Failed to send cancellation confirmation email:', emailError);
      // Continue even if email fails
    }

    res.json({
      success: true,
      message: "Deine Registrierung wurde erfolgreich gekündigt. Du kannst dich jederzeit wieder anmelden."
    });

  } catch (error) {
    next(new AppError("Ein Serverfehler ist aufgetreten", 500, error));
  }
};

// Tag erstellen (für Vendors)
export const createVendorTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    logger.info('=== CREATE VENDOR TAG REQUEST ===');
    logger.debug('Request body:', { body: req.body });
    logger.debug('User from token:', { user: (req as any).user });

    const { name, description, category = 'product', icon, color } = req.body;
    const vendorId = (req as any).user?.id;

    logger.debug('Extracted data:', { name, description, category, icon, color, vendorId });

    if (!name || !name.trim()) {
      logger.error('Error: Tag name is missing');
      res.status(400).json({
        success: false,
        message: 'Tag-Name ist erforderlich'
      });
      return;
    }

    if (!vendorId) {
      logger.error('Error: Vendor ID is missing');
      res.status(401).json({
        success: false,
        message: 'Vendor-Authentifizierung fehlgeschlagen'
      });
      return;
    }

    // Vendor-Info für bessere Beschreibung
    logger.debug('Finding vendor with ID:', { vendorId });
    const vendor = await User.findById(vendorId).select('kontakt.name');
    const vendorName = vendor?.kontakt?.name || 'Unbekannter Vendor';
    logger.debug('Found vendor:', { vendorName });

    // Prüfen ob Tag bereits existiert
    logger.debug('Checking for existing tag:', { name: name.trim(), category });
    const existingTag = await Tag.findOne({
      name: name.trim(),
      category: category
    });

    if (existingTag) {
      logger.warn('Tag already exists:', { existingTag });
      res.status(200).json({
        success: true,
        tag: existingTag,
        message: `Tag "${name}" existiert bereits und wurde zu Ihrem Profil hinzugefügt`
      });
      return;
    }

    // Neuen Tag erstellen
    logger.info('Creating new tag...');

    // Generate slug manually for safety
    const slug = name.trim()
      .toLowerCase()
      .replace(/[äöüß]/g, (match: string) => {
        const replacements: { [key: string]: string } = {
          'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss'
        };
        return replacements[match] || match;
      })
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const newTag = new Tag({
      name: name.trim(),
      slug: slug,
      category: category,
      description: description || `Von ${vendorName} erstellt`,
      icon: icon || undefined,
      color: color || '#6B7280',
      isActive: true // Vendor-erstellte Tags sind sofort aktiv
    });

    logger.debug('Saving new tag:', { newTag });
    await newTag.save();

    logger.info('New tag created successfully by vendor:', { vendorName, tagName: newTag.name });

    res.status(201).json({
      success: true,
      tag: newTag,
      message: `Tag "${newTag.name}" wurde erfolgreich erstellt`
    });

  } catch (err) {
    // Spezifische MongoDB Fehler
    if (err instanceof Error && err.message.includes('E11000')) {
      logger.error('Fehler beim Erstellen des Vendor-Tags:', err);
      res.status(400).json({
        success: false,
        message: 'Ein Tag mit diesem Namen existiert bereits'
      });
      return;
    }

    next(new AppError(`Serverfehler: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`, 500, err));
  }
};
