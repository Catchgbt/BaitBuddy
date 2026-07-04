// Fängt alle Aufrufe an das eigene Backend (/api/**) ab, damit der E2E-Crawl
// ohne laufenden Express-Server (Secrets fehlen im Checkout) auskommt. Externe
// Hosts (unpkg-CDN) werden ebenfalls gestubbt, damit der Crawl nicht von
// Internetzugriff im Sandbox-Netzwerk abhaengt.

const FIXTURE_USER = {
  id: 'e2e-user-id',
  email: 'e2e-tester@baitbuddy.test',
  full_name: 'E2E Tester',
  user_metadata: { role: 'user' },
};

const FIXTURE_PLAN = {
  plan: 'free',
  status: 'active',
  credits: 0,
  expires_at: null,
};

function fulfillJson(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installApiMocks(page, { authenticated = false } = {}) {
  if (authenticated) {
    await page.addInitScript(([token, refresh]) => {
      window.localStorage.setItem('bb_token', token);
      window.localStorage.setItem('bb_refresh', refresh);
    }, ['e2e-fixture-token', 'e2e-fixture-refresh']);
  }

  await page.route('**/unpkg.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/auth/me') {
      return authenticated ? fulfillJson(route, FIXTURE_USER) : fulfillJson(route, { error: 'Kein Token' }, 401);
    }
    if (path === '/api/auth/refresh') {
      return fulfillJson(route, { error: 'Ungueltiger Refresh-Token' }, 401);
    }
    if (path === '/api/premium/status') {
      return fulfillJson(route, FIXTURE_PLAN);
    }
    if (path === '/api/health') {
      return fulfillJson(route, { ok: true, app: 'BaitBuddy', version: 'e2e' });
    }
    if (method === 'GET') {
      return fulfillJson(route, []);
    }
    return fulfillJson(route, { ok: true });
  });
}
