/**
 * Patreon OAuth Cloudflare Worker
 * 
 * This worker handles the OAuth flow for Patreon authentication on static sites.
 * It provides endpoints for authentication, token exchange, and user data retrieval.
 * 
 * Author: Korben (https://korben.info)
 * License: MIT
 */

export default {
  async fetch(request, env) {
    // Validate required environment variables
    if (!env.PATREON_CLIENT_ID || !env.PATREON_CLIENT_SECRET) {
      return new Response('Missing required configuration', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    const url = new URL(request.url);
    
    // CORS headers for all responses
    // Parse allowed origins
    const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
    const origin = request.headers.get('Origin');
    const isAllowedOrigin = allowedOrigins.length === 0 || allowedOrigins.includes(origin);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0] || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      switch (url.pathname) {
        case '/':
          return handleOAuthRedirect(url, env, corsHeaders);
        case '/token':
          return handleTokenExchange(request, env, corsHeaders);
        case '/identity':
          return handleIdentityRequest(request, env, corsHeaders);
        case '/proxy-image':
          return handleImageProxy(url, corsHeaders);
        default:
          return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Redirects user to Patreon OAuth authorization page
 */
function handleOAuthRedirect(url, env, corsHeaders) {
  const state = url.searchParams.get('state') || generateRandomState();
  const redirectUri = url.searchParams.get('redirect_uri') || env.REDIRECT_URI;
  
  const patreonAuthUrl = new URL('https://www.patreon.com/oauth2/authorize');
  patreonAuthUrl.searchParams.set('response_type', 'code');
  patreonAuthUrl.searchParams.set('client_id', env.PATREON_CLIENT_ID);
  patreonAuthUrl.searchParams.set('redirect_uri', redirectUri);
  patreonAuthUrl.searchParams.set('state', state);
  patreonAuthUrl.searchParams.set('scope', 'identity identity.memberships');

  return Response.redirect(patreonAuthUrl.toString(), 302);
}

/**
 * Exchanges authorization code for access token
 */
async function handleTokenExchange(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const body = await request.json();
  const { code, redirect_uri } = body;

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const tokenUrl = 'https://www.patreon.com/api/oauth2/token';
  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: env.PATREON_CLIENT_ID,
    client_secret: env.PATREON_CLIENT_SECRET,
    redirect_uri: redirect_uri || env.REDIRECT_URI
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error || 'Token exchange failed' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Retrieves user identity and membership information
 */
async function handleIdentityRequest(request, env, corsHeaders) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const accessToken = authHeader.substring(7);
  const campaignId = env.PATREON_CAMPAIGN_ID;
  const creatorId = env.PATREON_CREATOR_ID;

  const identityUrl = `https://www.patreon.com/api/oauth2/v2/identity?include=memberships.campaign&fields[user]=full_name,image_url,thumb_url&fields[member]=patron_status,last_charge_status,last_charge_date,lifetime_support_cents,currently_entitled_amount_cents,pledge_relationship_start`;

  try {
    const response = await fetch(identityUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch user data' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    
    // Process user data and determine membership type
    const userData = processUserData(data, campaignId, creatorId);
    
    return new Response(JSON.stringify(userData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Identity request error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user data' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Proxies images to avoid CORS issues
 */
async function handleImageProxy(url, corsHeaders) {
  const imageUrl = url.searchParams.get('url');
  if (!imageUrl) {
    return new Response('Missing image URL', { status: 400, headers: corsHeaders });
  }
  
  // Validate URL is from Patreon CDN
  try {
    const parsedUrl = new URL(imageUrl);
    const allowedHosts = ['c10.patreonusercontent.com', 'c8.patreon.com', 'cdn.patreon.com'];
    if (!allowedHosts.some(host => parsedUrl.hostname.endsWith(host))) {
      return new Response('Invalid image URL', { status: 400, headers: corsHeaders });
    }
  } catch (e) {
    return new Response('Invalid image URL', { status: 400, headers: corsHeaders });
  }

  try {
    const response = await fetch(imageUrl);
    const contentType = response.headers.get('Content-Type');
    const imageData = await response.arrayBuffer();

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Failed to proxy image', { status: 500, headers: corsHeaders });
  }
}

/**
 * Processes user data and determines membership type
 */
function processUserData(data, campaignId, creatorId) {
  const user = data.data;
  const memberships = data.included?.filter(item => item.type === 'member') || [];
  
  let membershipType = 'none';
  let membershipData = null;

  // Check if user is the creator
  if (user.id === creatorId) {
    membershipType = 'creator';
  } else if (memberships.length > 0) {
    // Find membership for the specific campaign
    const membership = memberships.find(m => 
      m.relationships?.campaign?.data?.id === campaignId
    );

    if (membership) {
      membershipData = {
        patron_status: membership.attributes.patron_status,
        last_charge_status: membership.attributes.last_charge_status,
        last_charge_date: membership.attributes.last_charge_date,
        lifetime_support_cents: membership.attributes.lifetime_support_cents,
        currently_entitled_amount_cents: membership.attributes.currently_entitled_amount_cents,
        pledge_relationship_start: membership.attributes.pledge_relationship_start
      };

      // Determine membership type based on patron status
      switch (membership.attributes.patron_status) {
        case 'active_patron':
          membershipType = membership.attributes.last_charge_status === 'Paid' 
            ? 'active_patron' 
            : 'declined_patron';
          break;
        case 'declined_patron':
          membershipType = 'declined_patron';
          break;
        case 'former_patron':
          membershipType = 'former_patron';
          break;
        default:
          membershipType = 'free_member';
      }
    }
  }

  return {
    user: {
      id: user.id,
      full_name: user.attributes.full_name,
      image_url: user.attributes.image_url,
      thumb_url: user.attributes.thumb_url
    },
    membership_type: membershipType,
    membership_data: membershipData,
    is_paying_member: ['creator', 'active_patron'].includes(membershipType)
  };
}

/**
 * Generates a random state parameter for OAuth
 */
function generateRandomState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}