import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const { progressionState } = vi.hoisted(() => ({
  progressionState: { current: null },
}));

vi.mock('./ProgressionContext', () => ({
  useProgression: () => progressionState.current,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ToolGuard from './ToolGuard';

function state({ loading = false, unlocked = false, level = 1 } = {}) {
  return {
    loading,
    level,
    levelInfo: {
      current: level, rank: 'Angelküken', rank_icon: 'Egg', prestige: 0, is_max_level: false,
      level_floor_xp: 0, next_level_xp: 250, xp_in_level: 100, xp_to_next: 150, progress: 0.4,
    },
    isToolUnlocked: () => unlocked,
    reload: vi.fn(),
    markToolUnlocked: vi.fn(),
  };
}

function renderGuard(toolId) {
  return render(
    <MemoryRouter>
      <ToolGuard toolId={toolId}>
        <div data-testid="page">Seiteninhalt</div>
      </ToolGuard>
    </MemoryRouter>
  );
}

afterEach(cleanup);
beforeEach(() => { progressionState.current = state(); });

describe('ToolGuard', () => {
  it('zeigt die Seite, wenn das Tool freigeschaltet ist', () => {
    progressionState.current = state({ unlocked: true, level: 6 });
    renderGuard('water-analysis');
    expect(screen.getByTestId('page')).toBeInTheDocument();
  });

  it('sperrt die Seite und nennt das Ziel-Level', () => {
    progressionState.current = state({ unlocked: false, level: 2 });
    renderGuard('water-analysis');

    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    expect(screen.getByText(/Noch nicht freigeschaltet/)).toBeInTheDocument();
    expect(screen.getByText(/Level 6/)).toBeInTheDocument();
  });

  it('bietet den kostenlosen Weg vor dem Kauf an', () => {
    progressionState.current = state({ unlocked: false, level: 2 });
    renderGuard('water-analysis');

    expect(screen.getByText('Weiter angeln & XP sammeln')).toBeInTheDocument();
    expect(screen.getByText(/0,99/)).toBeInTheDocument();
    // Kein Bezahl-Zwang im Text.
    expect(screen.queryByText(/musst.*bezahlen/i)).not.toBeInTheDocument();
  });

  it('blockiert nie bei unbekannter Tool-ID', () => {
    progressionState.current = state({ unlocked: false });
    renderGuard('gibt-es-nicht');
    expect(screen.getByTestId('page')).toBeInTheDocument();
  });

  it('zeigt während des Ladens weder Seite noch Sperre', () => {
    progressionState.current = state({ loading: true, unlocked: false });
    renderGuard('water-analysis');
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
    expect(screen.queryByText(/Noch nicht freigeschaltet/)).not.toBeInTheDocument();
  });
});
