/**
 * @file LadenkartePage.test.tsx
 * @purpose Tests for the public store map page (3D canvas mocked, no WebGL)
 * @created 2026-06-11
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LadenkartePage from './LadenkartePage';
import { useStoreMapData } from '../components/storemap/useStoreMapData';

jest.mock('../components/storemap/useStoreMapData');
jest.mock('../components/storemap/StoreMap3D', () => ({
  __esModule: true,
  default: () => <div data-testid="store-map-3d" />
}));

const mockedHook = useStoreMapData as jest.Mock;

const renderPage = () =>
  render(
    <MemoryRouter>
      <LadenkartePage />
    </MemoryRouter>
  );

describe('LadenkartePage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows heading and legend', () => {
    mockedHook.mockReturnValue({ mietfaecher: [], loading: true, error: null });
    renderPage();

    expect(screen.getByRole('heading', { name: /Ladenkarte/i })).toBeInTheDocument();
    expect(screen.getByText(/Helle Farbe = frei/)).toBeInTheDocument();
  });

  it('renders the 3D map when data is available', async () => {
    mockedHook.mockReturnValue({
      mietfaecher: [
        {
          id: 'm1',
          bezeichnung: 'R1',
          typ: 'regal',
          position: { x: 0, y: 0, w: 1, d: 0.5, h: 2, rotation: 0 },
          belegt: false,
          vendor: null
        }
      ],
      loading: false,
      error: null
    });
    renderPage();

    expect(await screen.findByTestId('store-map-3d')).toBeInTheDocument();
  });

  it('shows empty state when no Mietfächer are positioned', () => {
    mockedHook.mockReturnValue({ mietfaecher: [], loading: false, error: null });
    renderPage();

    expect(screen.getByText(/wird gerade eingerichtet/)).toBeInTheDocument();
  });

  it('shows error message on load failure', () => {
    mockedHook.mockReturnValue({
      mietfaecher: [],
      loading: false,
      error: 'Die Ladenkarte konnte nicht geladen werden.'
    });
    renderPage();

    expect(screen.getByText(/konnte nicht geladen werden/)).toBeInTheDocument();
  });
});
