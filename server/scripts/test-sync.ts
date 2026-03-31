/**
 * Quick test script: Sync vendor → BusinessPartner and Mietfach → Warehouse
 * Usage: npx ts-node scripts/test-sync.ts
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

import mongoose from 'mongoose';
import axios from 'axios';
import { FlourioClient } from '../src/services/flourio/client/FlourioClient';
import { flourioConfig } from '../src/services/flourio/client/config';
import { BusinessPartnerService } from '../src/services/flourio/services/BusinessPartnerService';
import { WarehouseService } from '../src/services/flourio/services/WarehouseService';
import User from '../src/models/User';
import Mietfach from '../src/models/Mietfach';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/housnkuh');
  console.log('Connected to MongoDB\n');

  const client = new FlourioClient(flourioConfig);
  console.log('Flourio API URL:', flourioConfig.baseURL);
  console.log('Bearer Token length:', flourioConfig.bearerToken?.length || 0, '\n');

  // Test 0: Explore existing data + try create
  console.log('=== Flourio Exploration ===');
  const headers = { Authorization: `Bearer ${flourioConfig.bearerToken}` };

  // First: see what exists
  try {
    const bpList = await axios.get(`${flourioConfig.baseURL}/businesspartners?pageSize=1`, { headers });
    console.log('Existing BusinessPartner (first):', JSON.stringify(bpList.data?.data?.[0] || bpList.data?.[0] || 'none', null, 2));
  } catch (err: any) {
    console.error('List BP error:', err.response?.status);
  }

  try {
    const whList = await axios.get(`${flourioConfig.baseURL}/stocks?pageSize=1`, { headers });
    console.log('\nExisting Warehouse (first):', JSON.stringify(whList.data?.data?.[0] || whList.data?.[0] || 'none', null, 2));
  } catch (err: any) {
    console.error('List WH error:', err.response?.status);
  }

  // Get pricelist ID from existing BP
  let pricelistId = '';
  try {
    const bpList = await axios.get(`${flourioConfig.baseURL}/businesspartners?pageSize=1`, { headers });
    const firstBp = bpList.data?.data?.[0] || bpList.data?.[0];
    pricelistId = firstBp?.pricelist || '';
    console.log('Pricelist ID from existing BP:', pricelistId);
  } catch (e) {}

  // List available pricelists
  try {
    const plRes = await axios.get(`${flourioConfig.baseURL}/pricelists?pageSize=5`, { headers });
    const pls = plRes.data?.data || plRes.data || [];
    console.log('Available pricelists:', JSON.stringify(pls.map((p: any) => ({ id: p._id, name: p.name })), null, 2));
  } catch (err: any) {
    console.error('Pricelists error:', err.response?.status);
  }

  // Test: Create article with same DTO as the sync
  try {
    const articleDto = {
      name: 'Test Artikel',
      description: 'Test Beschreibung',
      price: 4.99,
      unit: 'piece',
      tags: [],
      sku: 'TEST-001',
      taxRate: 19,
      stock: 0,
      minStock: 1,
      images: []
    };
    console.log('\nArticle DTO:', JSON.stringify(articleDto, null, 2));
    const artRes = await axios.post(`${flourioConfig.baseURL}/articles`, articleDto, { headers });
    console.log('Article Response:', artRes.status, JSON.stringify(artRes.data?._id));
  } catch (err: any) {
    console.error('Article Error:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }

  console.log('\n=== Raw Create Tests ===');

  // Test BP create with correct format
  try {
    // Get revenueCreditor ID from existing BP
    let revenueCreditorId = '';
    try {
      const bpFirst = await axios.get(`${flourioConfig.baseURL}/businesspartners?pageSize=1`, { headers });
      const bp = bpFirst.data?.data?.[0] || bpFirst.data?.[0];
      revenueCreditorId = bp?.tax?.revenueCreditor || '';
    } catch (e) {}

    const bpDto = {
      type: 'business',
      isCreditor: true,
      billingAddress: {
        company1: 'housnaffe',
        firstName: 'Eva-Maria',
        lastName: 'Schaller',
        street: 'Strauer Str.',
        streetNumber: '15',
        zipCode: '96317',
        city: 'Kronach',
        country: 'DE'
      },
      tax: {
        revenueCreditor: revenueCreditorId
      },
      pricelist: pricelistId
    };
    console.log('BP DTO (corrected):', JSON.stringify(bpDto, null, 2));

    const bpRes = await axios.post(`${flourioConfig.baseURL}/businesspartners`, bpDto, { headers });
    console.log('BP Response:', bpRes.status, JSON.stringify(bpRes.data?._id || bpRes.data?.id));
  } catch (err: any) {
    console.error('BP Error:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }

  // Test WH create with address
  try {
    const whDto = {
      name: 'Mietfach A-1-1',
      address: {
        company1: 'housnkuh',
        street: 'Strauer Str.',
        streetNumber: '15',
        zipCode: '96317',
        city: 'Kronach',
        country: 'DE'
      },
      useBins: false
    };
    console.log('\nWH DTO (corrected):', JSON.stringify(whDto, null, 2));
    const whRes = await axios.post(`${flourioConfig.baseURL}/stocks`, whDto, { headers });
    console.log('WH Response:', whRes.status, JSON.stringify(whRes.data?._id || whRes.data?.id));
  } catch (err: any) {
    console.error('WH Error:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }

  console.log('\n');

  // Test 1: Sync Vendor → BusinessPartner
  const vendor = await User.findOne({ isVendor: true });
  if (vendor) {
    console.log('=== Vendor → BusinessPartner ===');
    console.log('Vendor:', vendor.kontakt.name, '(' + vendor.kontakt.email + ')');
    try {
      const { BusinessPartnerMapper } = require('../src/services/flourio/services/businessPartnerMapping');
      const dto = BusinessPartnerMapper.vendorToBusinessPartner(vendor);
      console.log('Sending DTO:', JSON.stringify(dto, null, 2));

      const bpService = new BusinessPartnerService(client);
      const result = await bpService.syncVendor(vendor);
      console.log('SUCCESS! Response:', JSON.stringify(result, null, 2));
      console.log('Vendor flourioPartnerId:', vendor.flourioPartnerId);
    } catch (err: any) {
      console.error('FAILED:', err.message);
      if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Response data:', JSON.stringify(err.response.data, null, 2));
      }
    }
  } else {
    console.log('No vendor found in DB');
  }

  console.log('');

  // Test 2: Sync Mietfach → Warehouse
  const mietfach = await Mietfach.findOne();
  if (mietfach) {
    console.log('=== Mietfach → Warehouse ===');
    console.log('Mietfach:', mietfach.bezeichnung, '(' + mietfach.typ + ')');
    try {
      const { WarehouseMapper } = require('../src/services/flourio/services/warehouseMapping');
      const dto = WarehouseMapper.mietfachToWarehouse(mietfach);
      console.log('Sending DTO:', JSON.stringify(dto, null, 2));

      const whService = new WarehouseService(client);
      const result = await whService.syncMietfach(mietfach);
      console.log('SUCCESS! Response:', JSON.stringify(result, null, 2));
      console.log('Mietfach flourioWarehouseId:', mietfach.flourioWarehouseId);
    } catch (err: any) {
      console.error('FAILED:', err.message);
      if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Response data:', JSON.stringify(err.response.data, null, 2));
      }
    }
  } else {
    console.log('No Mietfach found in DB');
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(console.error);
