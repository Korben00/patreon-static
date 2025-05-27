# Security Best Practices

This guide covers important security considerations when implementing Patreon Static.

## Configuration Security

### 1. Never Expose Secrets

**❌ Never do this:**
```javascript
// NEVER put your client secret in frontend code!
const clientSecret = 'your-secret-here'; // WRONG!
```

**✅ Do this instead:**
- Store `PATREON_CLIENT_SECRET` only in Cloudflare Worker environment variables
- Use wrangler secrets: `wrangler secret put PATREON_CLIENT_SECRET`

### 2. Validate Configuration

The library automatically checks for placeholder values:
```javascript
// This will throw an error
new PatreonStatic({
  workerUrl: 'https://your-worker.workers.dev', // Placeholder detected!
  clientId: 'your-client-id' // Placeholder detected!
});
```

### 3. Use HTTPS in Production

- Always use HTTPS for your website
- Always use HTTPS for redirect URIs
- The library warns if non-HTTPS URLs are used (except localhost)

## CORS Security

### 1. Restrict Allowed Origins

In your worker configuration:
```toml
[vars]
# Good - specific origins
ALLOWED_ORIGINS = "https://yourdomain.com,https://www.yourdomain.com"

# Bad - allows any origin
ALLOWED_ORIGINS = "*"
```

### 2. Worker CORS Validation

The worker validates origins against the whitelist:
```javascript
// Automatically handles CORS based on ALLOWED_ORIGINS
const allowedOrigins = env.ALLOWED_ORIGINS.split(',');
const origin = request.headers.get('Origin');
if (!allowedOrigins.includes(origin)) {
  // Request blocked
}
```

## OAuth Security

### 1. State Parameter

The library uses cryptographically secure random state:
```javascript
// Uses crypto.getRandomValues() instead of Math.random()
const array = new Uint8Array(32);
crypto.getRandomValues(array);
```

### 2. Token Storage

Tokens are stored in localStorage with expiration:
- Automatically cleared when expired
- Consider using sessionStorage for sensitive applications
- Never log or expose tokens

### 3. Redirect URI Validation

- Must match exactly in Patreon settings
- Validated to be a proper URL
- HTTPS required in production

## Image Proxy Security

The worker only proxies images from Patreon's CDN:
```javascript
const allowedHosts = [
  'c10.patreonusercontent.com',
  'c8.patreon.com', 
  'cdn.patreon.com'
];
```

This prevents the proxy from being abused to fetch arbitrary URLs.

## Network Security

### 1. Request Timeouts

All network requests have 30-second timeouts:
```javascript
const controller = new AbortController();
setTimeout(() => controller.abort(), 30000);
```

### 2. Error Handling

- Never expose internal errors to users
- Log errors securely
- Provide generic error messages

## Production Checklist

Before going to production:

- [ ] Remove all localhost URLs from Patreon app
- [ ] Set proper ALLOWED_ORIGINS in worker
- [ ] Enable HTTPS on your domain
- [ ] Rotate any accidentally exposed secrets
- [ ] Set up error monitoring
- [ ] Review all environment variables
- [ ] Test with different user types
- [ ] Implement rate limiting (see below)

## Rate Limiting

Consider implementing rate limiting in your worker:

```javascript
// Example using Cloudflare's rate limiting
export default {
  async fetch(request, env, ctx) {
    const ip = request.headers.get('CF-Connecting-IP');
    
    // Simple in-memory rate limit (better to use KV or Durable Objects)
    const key = `rate_limit_${ip}`;
    const count = await env.RATE_LIMIT.get(key) || 0;
    
    if (count > 10) { // 10 requests per minute
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    await env.RATE_LIMIT.put(key, count + 1, { expirationTtl: 60 });
    
    // Continue with normal processing
  }
}
```

## Monitoring

Set up monitoring for:

1. **Failed authentication attempts**
   - Multiple failures from same IP
   - Invalid client IDs
   - Suspicious patterns

2. **Unusual usage patterns**
   - Excessive API calls
   - Requests from unexpected origins
   - Token refresh anomalies

3. **Security events**
   - CORS violations
   - Invalid redirect attempts
   - Malformed requests

## Incident Response

If you suspect a security issue:

1. **Immediate actions:**
   - Rotate your client secret in Patreon
   - Update worker environment variables
   - Review access logs

2. **Investigation:**
   - Check Cloudflare analytics
   - Review error logs
   - Identify affected users

3. **Communication:**
   - Notify affected users if needed
   - Document the incident
   - Update security measures

## Reporting Security Issues

If you find a security vulnerability:

1. **Do NOT create a public issue**
2. Email details to: korben@korben.info
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We'll respond within 48 hours and work on a fix.

## Additional Resources

- [OWASP OAuth Security](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [Patreon API Security](https://docs.patreon.com/#api-security)