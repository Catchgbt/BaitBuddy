import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Base64URL decode helper
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

// Convert PEM to ArrayBuffer for crypto.subtle
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

// Get OAuth access token from Service Account JSON
async function getGoogleAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/playintegrity',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const base64Url = (obj) => btoa(JSON.stringify(obj))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const unsigned = `${base64Url(header)}.${base64Url(claim)}`;
  const keyBuffer = pemToArrayBuffer(serviceAccount.private_key);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsigned)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${unsigned}.${signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    throw new Error(`OAuth Token Fehler: ${err}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { integrityToken, packageName } = await req.json();

    if (!integrityToken || !packageName) {
      return Response.json(
        { error: 'integrityToken und packageName erforderlich' },
        { status: 400 }
      );
    }

    const serviceAccountJson = Deno.env.get('Token_Google');
    if (!serviceAccountJson) {
      return Response.json(
        { error: 'Token_Google Secret nicht konfiguriert' },
        { status: 500 }
      );
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (e) {
      return Response.json(
        { error: 'Token_Google ist kein gueltiges JSON' },
        { status: 500 }
      );
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);

    const verifyUrl = `https://playintegrity.googleapis.com/v1/${packageName}:decodeIntegrityToken`;
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ integrity_token: integrityToken }),
    });

    if (!verifyResponse.ok) {
      const errText = await verifyResponse.text();
      return Response.json(
        { error: 'Play Integrity Verifizierung fehlgeschlagen', details: errText },
        { status: 502 }
      );
    }

    const verifyData = await verifyResponse.json();
    const payload = verifyData.tokenPayloadExternal || {};

    const appIntegrity = payload.appIntegrity || {};
    const deviceIntegrity = payload.deviceIntegrity || {};
    const accountDetails = payload.accountDetails || {};

    const verdict = {
      appRecognized: appIntegrity.appRecognitionVerdict === 'PLAY_RECOGNIZED',
      deviceVerdicts: deviceIntegrity.deviceRecognitionVerdict || [],
      licensed: accountDetails.appLicensingVerdict === 'LICENSED',
      packageNameMatches: appIntegrity.packageName === packageName,
    };

    const isTrusted =
      verdict.appRecognized &&
      verdict.packageNameMatches &&
      verdict.deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY');

    return Response.json({
      success: true,
      trusted: isTrusted,
      verdict,
      raw: payload,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});