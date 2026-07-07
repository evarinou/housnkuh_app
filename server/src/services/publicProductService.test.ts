/**
 * @file publicProductService.test.ts
 * @purpose Sichert die öffentliche Produktsuche (F1): nur aktive Produkte
 *          sichtbarer Vendors, Ort-Filter, Volltext, keine sensiblen Felder.
 */

import mongoose from 'mongoose';
import User from '../models/User';
import { Product } from '../models/Product';
import { searchPublicProducts } from './publicProductService';

const makeVendor = (opts: { visible: boolean; ort: string; name: string }): Promise<any> =>
  User.create({
    isVendor: true,
    isFullAccount: true,
    isPubliclyVisible: opts.visible,
    registrationStatus: 'active',
    username: `v-${new mongoose.Types.ObjectId()}`,
    password: 'pw',
    kontakt: { name: opts.name, email: `${new mongoose.Types.ObjectId()}@x.de`, mailNewsletter: false, status: 'aktiv' },
    vendorProfile: { unternehmen: opts.name },
    adressen: [{ adresstyp: 'Hauptadresse', strasse: 'Dorfstr.', hausnummer: '1', plz: '96317', ort: opts.ort, name1: opts.name }]
  } as any) as Promise<any>;

let n = 0;
const makeProduct = (vendorId: mongoose.Types.ObjectId, opts: { name: string; isActive?: boolean; keywords?: string[] }) => {
  n++;
  return Product.create({
    name: opts.name,
    description: `Beschreibung ${opts.name}`,
    slug: `p-${n}-${vendorId}`,
    vendorId,
    price: 5, unit: 'piece', minQuantity: 1,
    seasonStart: new Date('2026-01-01'), seasonEnd: new Date('2026-12-31'),
    availability: 'available',
    isActive: opts.isActive !== false,
    keywords: opts.keywords || []
  } as any);
};

describe('searchPublicProducts', () => {
  beforeEach(async () => {
    // Text-Index für die Volltextsuche sicherstellen.
    await Product.createIndexes();
  });

  it('zeigt nur Produkte öffentlich sichtbarer Vendors', async () => {
    const shown = await makeVendor({ visible: true, ort: 'Kronach', name: 'Hof A' });
    const hidden = await makeVendor({ visible: false, ort: 'Kronach', name: 'Hof B' });
    await makeProduct(shown._id, { name: 'Apfelsaft' });
    await makeProduct(hidden._id, { name: 'Birnensaft' });

    const { products, pagination } = await searchPublicProducts({});
    expect(pagination.total).toBe(1);
    expect(products[0].name).toBe('Apfelsaft');
    expect(products[0].vendor.name).toBe('Hof A');
  });

  it('blendet inaktive Produkte aus', async () => {
    const v = await makeVendor({ visible: true, ort: 'Kronach', name: 'Hof A' });
    await makeProduct(v._id, { name: 'Aktiv' });
    await makeProduct(v._id, { name: 'Inaktiv', isActive: false });

    const { products } = await searchPublicProducts({});
    expect(products.map(p => p.name)).toEqual(['Aktiv']);
  });

  it('filtert nach Ort des Vendors', async () => {
    const kro = await makeVendor({ visible: true, ort: 'Kronach', name: 'Hof Kronach' });
    const cob = await makeVendor({ visible: true, ort: 'Coburg', name: 'Hof Coburg' });
    await makeProduct(kro._id, { name: 'Honig' });
    await makeProduct(cob._id, { name: 'Marmelade' });

    const { products } = await searchPublicProducts({ location: 'coburg' });
    expect(products.map(p => p.name)).toEqual(['Marmelade']);
  });

  it('findet Produkte per Volltextsuche', async () => {
    const v = await makeVendor({ visible: true, ort: 'Kronach', name: 'Hof A' });
    await makeProduct(v._id, { name: 'Bio-Apfelsaft naturtrüb' });
    await makeProduct(v._id, { name: 'Bergkäse' });

    const { products } = await searchPublicProducts({ q: 'Apfelsaft' });
    expect(products.map(p => p.name)).toEqual(['Bio-Apfelsaft naturtrüb']);
  });

  it('gibt keine sensiblen Vendor-Felder preis', async () => {
    const v = await makeVendor({ visible: true, ort: 'Kronach', name: 'Hof A' });
    await makeProduct(v._id, { name: 'Apfelsaft' });

    const { products } = await searchPublicProducts({});
    const vendor = products[0].vendor;
    expect(Object.keys(vendor).sort()).toEqual(['id', 'name', 'ort']);
    // Kein E-Mail/Telefon o. Ä. im Produkt
    expect(JSON.stringify(products[0])).not.toMatch(/@x\.de|password/);
  });
});
