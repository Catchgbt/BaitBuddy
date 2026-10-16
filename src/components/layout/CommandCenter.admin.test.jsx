import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }));
vi.mock('@/api/frontendClient', () => ({
  entities: { FishingPlan: {}, GearItem: {} },
  events: {},
}));
vi.mock('@/api/auth', () => ({ auth: { logout: vi.fn(), redirectToLogin: vi.fn() } }));
vi.mock('@/components/premium/PlanContext', () => ({ usePlan: () => ({ plan: { id: 'elite', name: 'Ultimate' } }) }));
vi.mock('@/components/location/LocationManager', () => ({ useLocation: () => ({ currentLocation: null }) }));
vi.mock('@/hooks/useFishingConditions', () => ({ useFishingConditions: () => ({ window: null, hasLocation: false }) }));
vi.mock('@/components/layout/AppTopBar', () => ({ AvatarCircle: () => <span>Avatar</span> }));
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }) => <>{children}</>,
  SheetContent: ({ children }) => <div>{children}</div>,
  SheetTitle: ({ children }) => <h1>{children}</h1>,
  SheetDescription: ({ children }) => <p>{children}</p>,
}));

const { default: CommandCenter } = await import('./CommandCenter');

afterEach(() => cleanup());

function renderCommandCenter(user) {
  render(
    <MemoryRouter>
      <CommandCenter
        isOpen
        setIsOpen={vi.fn()}
        currentPageName="Dashboard"
        user={user}
      />
    </MemoryRouter>,
  );
}

describe('Command Center — Admin-Zugang', () => {
  it('zeigt dem serverseitig bestätigten Superuser den Admin-Button', () => {
    renderCommandCenter({ id: 'su', email: 'kaisaschnitt99@gmail.com', is_superuser: true });

    expect(screen.getByRole('link', { name: /Admin-Bereich/ })).toHaveAttribute('href', '/Admin');
  });

  it('zeigt den Admin-Button keinem normalen Admin', () => {
    renderCommandCenter({ id: 'admin', email: 'admin@baitbuddy.test', is_admin: true, is_superuser: false });

    expect(screen.queryByRole('link', { name: /Admin-Bereich/ })).toBeNull();
  });
});
