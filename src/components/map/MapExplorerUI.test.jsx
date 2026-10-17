import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MapSearch, MapSpotPreview, matchesSpecies, spotCoordinates } from './MapExplorerUI';
vi.mock('@/hooks/useFishingConditions', () => ({ useFishingConditions: () => ({ data: null, window: null }) }));
vi.mock('@/entities/Spot', () => ({ Spot: { update: vi.fn().mockRejectedValue(new Error('offline')) } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('map explorer', () => {
  it('filters only known species and rejects invalid coordinates', () => {
    expect(matchesSpecies({ target_species: ['Hecht', 'Barsch'] }, 'hecht')).toBe(true);
    expect(matchesSpecies({ fische: ['Zander'] }, 'Hecht')).toBe(false);
    expect(matchesSpecies({}, 'Hecht')).toBe(false);
    expect(matchesSpecies({}, '')).toBe(true);
    expect(spotCoordinates({ latitude: '50', longitude: '6' })).toEqual({ lat: 50, lon: 6 });
    expect(spotCoordinates({ coordinates: { lat: 0, lng: 0 } })).toEqual({ lat: 0, lon: 0 });
    expect(spotCoordinates({ latitude: 100, longitude: 0 })).toBeNull();
    expect(spotCoordinates({})).toBeNull();
  });
  it('keeps loaded spots searchable without a geocoding request', () => {
    const select = vi.fn();
    render(<MapSearch spots={[{ id: '1', name: 'Schilfbucht' }]} onSelect={select} species="" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Schilf' } });
    fireEvent.click(screen.getByRole('button', { name: /Schilfbucht/ }));
    expect(select).toHaveBeenCalledWith({ id: '1', name: 'Schilfbucht' });
  });
  it('does not invent weather and keeps favorite state on save failure', async () => {
    render(<MemoryRouter><MapSpotPreview spot={{ id: '1', type: 'spot', name: 'Schilfbucht', latitude: 50, longitude: 6 }} /></MemoryRouter>);
    expect(screen.queryByText('Dein nächstes Zeitfenster')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Spot merken' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Spot merken' })).not.toBeDisabled());
    expect(screen.getByRole('button', { name: 'Spot merken' })).toHaveAttribute('aria-pressed', 'false');
  });
});
