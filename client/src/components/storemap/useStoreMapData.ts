/**
 * @file useStoreMapData.ts
 * @purpose Data hook for the public store map: loads positioned Mietfächer with occupancy
 * @created 2026-06-11
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUtils } from '../../utils/auth';
import { StoreMapMietfach } from './types';

interface StoreMapDataState {
  mietfaecher: StoreMapMietfach[];
  loading: boolean;
  error: string | null;
}

/** Filtert die Fächer eines bestimmten Vendors (für das Embed auf der Detailseite) */
export function filterByVendor(
  mietfaecher: StoreMapMietfach[],
  vendorId: string
): StoreMapMietfach[] {
  return mietfaecher.filter((mf) => mf.vendor?.id === vendorId);
}

export function useStoreMapData(): StoreMapDataState {
  const [state, setState] = useState<StoreMapDataState>({
    mietfaecher: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    axios
      .get(`${apiUtils.getApiUrl()}/public/store-map`)
      .then((response) => {
        if (cancelled) return;
        setState({
          mietfaecher: response.data?.mietfaecher || [],
          loading: false,
          error: null
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          mietfaecher: [],
          loading: false,
          error: 'Die Ladenkarte konnte nicht geladen werden.'
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
