export default async function handler(req: any, res: any) {
  // Enable CORS headers for API route
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, clientId, clientSecret, redirectUri, codeVerifier } = req.body || {};

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const effectiveClientId = clientId || process.env.VITE_DERIV_APP_ID || '347FrwAYb8ptoUsbiGVsA';
    const effectiveRedirectUri = redirectUri || 'https://deriv-digit-three.vercel.app/callback';

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: effectiveClientId,
      code: code,
      redirect_uri: effectiveRedirectUri,
    });

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }

    const secret = clientSecret || process.env.DERIV_CLIENT_SECRET;
    if (secret) {
      params.append('client_secret', secret);
    }

    const derivResponse = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    const data = await derivResponse.json();

    if (!derivResponse.ok) {
      return res.status(derivResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server token exchange failed' });
  }
}
