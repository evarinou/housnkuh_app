/**
 * @file useStoreMapData.test.ts
 * @purpose Tests for the store map data hook and vendor filter helper
 * @created 2026-06-11
 */

import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useStoreMapData, filterByVendor } from './useStoreMapData';
import { StoreMapMietfach } from './types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const fach = (id: string, vendorId: string | null): StoreMapMietfach => ({
  id,
  bezeichnung: `Fach ${id}`,
  typ: 'regal',
  position: { x: 0, y: 0, w: 1, d: 0.5, h: 2, rotation: 0 },
  belegt: vendorId !== null,
  vendor: vendorId
    ? { id: vendorId, name: 'Eva', unternehmen: 'Imkerei', profilBild: '', tags: [] }
    : null
});

describe('useStoreMapData', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads mietfaecher from the public endpoint', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { success: true, mietfaecher: [fach('m1', 'v1')] }
    });

    const { result } = renderHook(() => useStoreMapData());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mietfaecher).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/public/store-map'));
  });

  it('sets a German error message on failure', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useStoreMapData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.mietfaecher).toEqual([]);
    expect(result.current.error).toMatch(/Ladenkarte/);
  });
});

describe('filterByVendor', () => {
  it('returns only the Mietfächer of the given vendor', () => {
    const list = [fach('m1', 'v1'), fach('m2', 'v2'), fach('m3', null), fach('m4', 'v1')];
    const result = filterByVendor(list, 'v1');
    expect(result.map((m) => m.id)).toEqual(['m1', 'm4']);
  });
});
