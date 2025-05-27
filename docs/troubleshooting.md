# Troubleshooting Guide

Common issues and their solutions when using Patreon Static.

## Configuration Errors

### "workerUrl and clientId are required"

**Problem:** Missing required configuration
```javascript
// This will throw an error
const patreonStatic = new PatreonStatic({});
```

**Solution:** Provide required fields
```javascript
const patreonStatic = new PatreonStatic({
  workerUrl: 'https://your-worker.workers.dev',
  clientId: 'your-actual-client-id'
});
```

### "Please replace placeholder values"

**Problem:** Using example values
```javascript
// Placeholder values detected
const patreonStatic = new PatreonStatic({
  workerUrl: 'https://your-worker.workers.dev',
  clientId: 'your-client-id'
});
```

**Solution:** Use your actual credentials from Patreon

## OAuth Errors

### "Invalid client_id"

**Causes:**
1. Wrong client ID
2. Client ID from different Patreon app
3. Typo in configuration

**Solutions:**
1. Copy exact client ID from Patreon dashboard
2. Check you're using the right app
3. Remove any extra spaces

### "Invalid redirect_uri"

**Problem:** Redirect URI doesn't match exactly

**Common mistakes:**
- Missing protocol: `example.com/callback` vs `https://example.com/callback`
- Trailing slash: `/callback` vs `/callback/`
- Wrong domain: `www.example.com` vs `example.com`
- Wrong path: `/patreon-callback` vs `/callback`

**Solution:** 
1. Check Patreon app settings
2. Ensure exact match including protocol
3. Update both Patreon and your code

### "Invalid grant"

**Causes:**
1. Authorization code already used
2. Code expired (10 minutes)
3. Code from different client

**Solutions:**
1. Don't reuse authorization codes
2. Complete auth flow quickly
3. Check client ID matches

## CORS Errors

### "Access to fetch blocked by CORS policy"

**Problem:** Worker not configured for your domain

**Solution:** Update worker's ALLOWED_ORIGINS
```toml
# wrangler.toml
[vars]
ALLOWED_ORIGINS = "https://yourdomain.com,http://localhost:8000"
```

Then redeploy:
```bash
wrangler deploy
```

## Network Errors

### "Request timeout - please try again"

**Causes:**
1. Slow network connection
2. Worker not responding
3. Patreon API issues

**Solutions:**
1. Check network connection
2. Check worker logs: `wrangler tail`
3. Try again later

### "Failed to fetch"

**Causes:**
1. Worker URL incorrect
2. Worker not deployed
3. Network connectivity

**Debug steps:**
1. Test worker directly: `curl https://your-worker.workers.dev/`
2. Check browser console for errors
3. Verify worker is deployed

## Authentication Issues

### User stays logged out after refresh

**Causes:**
1. localStorage disabled
2. Browser privacy mode
3. Cookie blocking extensions

**Solutions:**
1. Check localStorage is available:
   ```javascript
   try {
     localStorage.setItem('test', '1');
     localStorage.removeItem('test');
   } catch (e) {
     console.error('localStorage not available');
   }
   ```
2. Try in regular browser mode
3. Disable privacy extensions temporarily

### Token expired immediately

**Causes:**
1. System clock incorrect
2. Timezone issues

**Solutions:**
1. Check system time is correct
2. Verify timezone settings

## UI Issues

### Login button not working

**Debug steps:**
1. Check console for errors
2. Verify button has correct attribute:
   ```html
   <button data-patreon-login>Login</button>
   ```
3. Ensure PatreonStatic is initialized
4. Check if placeholder error is thrown

### Ads not hiding for patrons

**Checklist:**
1. User is actually a paying patron
2. `autoRemoveAds` is true (default)
3. Ad selectors match your HTML:
   ```javascript
   adSelectors: ['.your-ad-class', '#your-ad-id']
   ```
4. Check console for errors

### User menu not showing

**Common issues:**
1. CSS not loaded
2. Click handler not attached
3. User data missing

**Debug:**
```javascript
// Check if user data exists
console.log(patreonStatic.userData);

// Check if authenticated
console.log(patreonStatic.isAuthenticated());
```

## Worker Issues

### "Missing required configuration"

**Problem:** Worker environment variables not set

**Solution:** Set required secrets
```bash
wrangler secret put PATREON_CLIENT_ID
wrangler secret put PATREON_CLIENT_SECRET
```

And variables in wrangler.toml:
```toml
[vars]
PATREON_CAMPAIGN_ID = "your-campaign-id"
PATREON_CREATOR_ID = "your-creator-id"
```

### Worker logs show errors

View worker logs:
```bash
wrangler tail
```

Common errors:
- 401: Invalid access token
- 403: Forbidden (check scopes)
- 429: Rate limited
- 500: Internal error

## Debug Mode

Enable debug mode for detailed logging:
```javascript
const patreonStatic = new PatreonStatic({
  // ... your config
  debug: true
});
```

This will log:
- Initialization steps
- Authentication flow
- API calls
- Errors with context

## Browser-Specific Issues

### Safari/iOS Issues

1. **Third-party cookie blocking**
   - Solution: Use same domain for worker and site

2. **Private relay interference**
   - Solution: Test with private relay disabled

### Firefox Enhanced Tracking Protection

May block some features. Solutions:
1. Add site to exceptions
2. Use same domain for all resources

## Getting Help

If these solutions don't work:

1. **Enable debug mode** and check console
2. **Collect information:**
   - Browser and version
   - Error messages
   - Console logs
   - Network tab screenshots
3. **Create an issue** with details
4. **Contact:** korben@korben.info

## Common Fixes Summary

1. **Clear and retry:**
   ```javascript
   localStorage.removeItem('patreon_auth');
   location.reload();
   ```

2. **Verify configuration:**
   ```javascript
   console.log(patreonStatic.config);
   ```

3. **Test worker:**
   ```bash
   curl -I https://your-worker.workers.dev/
   ```

4. **Check Patreon status:**
   Visit [status.patreon.com](https://status.patreon.com)