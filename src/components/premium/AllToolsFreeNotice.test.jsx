import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import AllToolsFreeNotice from './AllToolsFreeNotice';

afterEach(() => cleanup());

describe('AllToolsFreeNotice', () => {
  it('erklärt die globale Freischaltung eindeutig', () => {
    render(<AllToolsFreeNotice />);

    expect(screen.getByRole('status')).toHaveTextContent('Alle Funktionen freigeschaltet');
    expect(screen.getByRole('status')).toHaveTextContent('Alle Funktionen sind derzeit kostenlos freigeschaltet.');
  });
});
