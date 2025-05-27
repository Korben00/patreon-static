/**
 * Patreon Static - Client-side authentication library for static sites
 * 
 * This library handles Patreon OAuth authentication flow and user session management
 * for static websites without requiring a backend server.
 * 
 * Author: Korben (https://korben.info)
 * License: MIT
 */

(function() {
  'use strict';

  // Default configuration
  const defaultConfig = {
    workerUrl: '', // e.g., 'https://your-worker.workers.dev'
    clientId: '', // Your Patreon client ID
    campaignId: '', // Your Patreon campaign ID
    creatorId: '', // Your Patreon creator ID
    redirectUri: window.location.origin + '/patreon-callback',
    storageKey: 'patreon_auth',
    loginButtonSelector: '[data-patreon-login]',
    onLogin: null,
    onLogout: null,
    onError: null,
    autoRemoveAds: true,
    adSelectors: ['.ad', '.advertisement', '.pub', '[data-ad]'],
    debug: false
  };

  class PatreonStatic {
    constructor(config = {}) {
      this.config = { ...defaultConfig, ...config };
      this.userData = null;
      this.initialized = false;
      
      // Validate required configuration
      if (!this.config.workerUrl || !this.config.clientId) {
        throw new Error('PatreonStatic: workerUrl and clientId are required');
      }
      
      // Check for placeholder values
      if (this.config.clientId.includes('your-') || this.config.workerUrl.includes('your-worker')) {
        throw new Error('PatreonStatic: Please replace placeholder values with your actual configuration');
      }
      
      // Validate redirect URI
      this.config.redirectUri = this.validateRedirectUri(this.config.redirectUri);

      this.init();
    }

    /**
     * Initialize the library
     */
    async init() {
      if (this.initialized) return;
      
      this.log('Initializing PatreonStatic...');
      
      // Check for stored authentication
      this.loadStoredAuth();
      
      // Setup login buttons
      this.setupLoginButtons();
      
      // Handle OAuth callback if on callback page
      if (this.isCallbackPage()) {
        await this.handleCallback();
      }
      
      // Update UI based on auth status
      this.updateUI();
      
      this.initialized = true;
      this.log('PatreonStatic initialized');
    }

    /**
     * Setup login button click handlers
     */
    setupLoginButtons() {
      const buttons = document.querySelectorAll(this.config.loginButtonSelector);
      buttons.forEach(button => {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.isAuthenticated()) {
            this.showUserMenu(button);
          } else {
            this.login();
          }
        });
      });
    }

    /**
     * Start the login flow
     */
    login() {
      this.log('Starting login flow...');
      const state = this.generateState();
      sessionStorage.setItem('patreon_oauth_state', state);
      
      const authUrl = `${this.config.workerUrl}/?state=${state}&redirect_uri=${encodeURIComponent(this.config.redirectUri)}&client_id=${encodeURIComponent(this.config.clientId)}`;
      window.location.href = authUrl;
    }

    /**
     * Logout the user
     */
    logout() {
      this.log('Logging out user...');
      this.userData = null;
      localStorage.removeItem(this.config.storageKey);
      
      if (this.config.onLogout) {
        this.config.onLogout();
      }
      
      this.updateUI();
      this.restoreAds();
    }

    /**
     * Handle OAuth callback
     */
    async handleCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      if (error) {
        this.handleError(`OAuth error: ${error}`);
        return;
      }

      if (!code) {
        this.handleError('No authorization code received');
        return;
      }

      // Verify state
      const storedState = sessionStorage.getItem('patreon_oauth_state');
      if (state !== storedState) {
        this.handleError('Invalid state parameter');
        return;
      }

      try {
        // Exchange code for token
        const tokenData = await this.exchangeCodeForToken(code);
        
        // Get user identity
        const userData = await this.getUserIdentity(tokenData.access_token);
        
        // Store authentication data
        this.userData = {
          ...userData,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: Date.now() + (tokenData.expires_in * 1000)
        };
        
        this.saveAuth();
        
        if (this.config.onLogin) {
          this.config.onLogin(this.userData);
        }
        
        // Redirect to home or specified page
        const returnUrl = sessionStorage.getItem('patreon_return_url') || '/';
        sessionStorage.removeItem('patreon_return_url');
        sessionStorage.removeItem('patreon_oauth_state');
        
        window.location.href = returnUrl;
      } catch (error) {
        this.handleError(`Authentication failed: ${error.message}`);
      }
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(`${this.config.workerUrl}/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code,
            redirect_uri: this.config.redirectUri
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Token exchange failed');
        }

        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    }

    /**
     * Get user identity from Patreon
     */
    async getUserIdentity(accessToken) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        const response = await fetch(`${this.config.workerUrl}/identity`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Failed to get user identity');
        }

        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        throw error;
      }
    }

    /**
     * Update UI based on authentication status
     */
    updateUI() {
      const buttons = document.querySelectorAll(this.config.loginButtonSelector);
      
      buttons.forEach(button => {
        if (this.isAuthenticated()) {
          this.updateButtonForAuthenticatedUser(button);
        } else {
          this.updateButtonForUnauthenticatedUser(button);
        }
      });

      // Handle ads if configured
      if (this.config.autoRemoveAds && this.isPayingMember()) {
        this.removeAds();
      }
    }

    /**
     * Update button for authenticated user
     */
    updateButtonForAuthenticatedUser(button) {
      const user = this.userData.user;
      const emoji = this.getMembershipEmoji();
      
      button.innerHTML = `${emoji} Hello ${user.full_name.split(' ')[0]}`;
      button.classList.add('patreon-authenticated');
      
      // Add user avatar if available
      if (user.thumb_url) {
        const avatar = document.createElement('img');
        avatar.src = `${this.config.workerUrl}/proxy-image?url=${encodeURIComponent(user.thumb_url)}`;
        avatar.classList.add('patreon-avatar');
        button.prepend(avatar);
      }
    }

    /**
     * Update button for unauthenticated user
     */
    updateButtonForUnauthenticatedUser(button) {
      button.innerHTML = button.getAttribute('data-patreon-login-text') || 'Login with Patreon';
      button.classList.remove('patreon-authenticated');
    }

    /**
     * Show user menu dropdown
     */
    showUserMenu(button) {
      // Remove existing menu
      const existingMenu = document.querySelector('.patreon-user-menu');
      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      const menu = document.createElement('div');
      menu.className = 'patreon-user-menu';
      
      const imageUrl = this.userData.user.image_url || this.userData.user.thumb_url;
      const imageSrc = imageUrl ? `${this.config.workerUrl}/proxy-image?url=${encodeURIComponent(imageUrl)}` : '';
      
      menu.innerHTML = `
        <div class="patreon-menu-header">
          ${imageSrc ? `<img src="${imageSrc}" alt="Avatar" onerror="this.style.display='none'">` : ''}
          <div>
            <div class="patreon-menu-name">${this.userData.user.full_name}</div>
            <div class="patreon-menu-status">${this.getMembershipLabel()}</div>
          </div>
        </div>
        <div class="patreon-menu-divider"></div>
        <button class="patreon-menu-item patreon-logout-btn">Logout</button>
      `;

      // Position menu below button
      const rect = button.getBoundingClientRect();
      menu.style.position = 'absolute';
      menu.style.top = `${rect.bottom + 5}px`;
      menu.style.right = `${window.innerWidth - rect.right}px`;
      
      document.body.appendChild(menu);
      
      // Add logout button handler
      const logoutBtn = menu.querySelector('.patreon-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          this.logout();
          menu.remove();
        });
      }

      // Close menu when clicking outside
      setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
          if (!menu.contains(e.target) && e.target !== button) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
          }
        });
      }, 100);
    }

    /**
     * Remove ads from the page
     */
    removeAds() {
      this.log('Removing ads for paying member...');
      
      this.config.adSelectors.forEach(selector => {
        const ads = document.querySelectorAll(selector);
        ads.forEach(ad => {
          ad.style.display = 'none';
          ad.setAttribute('data-patreon-removed', 'true');
        });
      });

      // Watch for dynamically added ads
      if (!this.adObserver) {
        this.adObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) { // Element node
                this.config.adSelectors.forEach(selector => {
                  if (node.matches && node.matches(selector)) {
                    node.style.display = 'none';
                    node.setAttribute('data-patreon-removed', 'true');
                  }
                  
                  // Check children
                  const childAds = node.querySelectorAll(selector);
                  childAds.forEach(ad => {
                    ad.style.display = 'none';
                    ad.setAttribute('data-patreon-removed', 'true');
                  });
                });
              }
            });
          });
        });

        this.adObserver.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    }

    /**
     * Restore ads (when user logs out)
     */
    restoreAds() {
      this.log('Restoring ads...');
      
      const removedAds = document.querySelectorAll('[data-patreon-removed="true"]');
      removedAds.forEach(ad => {
        ad.style.display = '';
        ad.removeAttribute('data-patreon-removed');
      });

      // Stop observing
      if (this.adObserver) {
        this.adObserver.disconnect();
        this.adObserver = null;
      }
    }

    /**
     * Get membership emoji based on type
     */
    getMembershipEmoji() {
      const emojiMap = {
        'creator': '👑',
        'active_patron': '⭐',
        'declined_patron': '⚠️',
        'former_patron': '💔',
        'free_member': '👤',
        'none': '👤'
      };
      
      return emojiMap[this.userData.membership_type] || '👤';
    }

    /**
     * Get membership label
     */
    getMembershipLabel() {
      const labelMap = {
        'creator': 'Creator',
        'active_patron': 'Active Patron',
        'declined_patron': 'Payment Declined',
        'former_patron': 'Former Patron',
        'free_member': 'Free Member',
        'none': 'Not a Member'
      };
      
      return labelMap[this.userData.membership_type] || 'Member';
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
      return this.userData !== null && 
             this.userData.expires_at !== undefined &&
             this.userData.expires_at > Date.now();
    }

    /**
     * Check if user is a paying member
     */
    isPayingMember() {
      return this.userData && this.userData.is_paying_member;
    }

    /**
     * Check if current page is the OAuth callback page
     */
    isCallbackPage() {
      return window.location.pathname === new URL(this.config.redirectUri).pathname;
    }

    /**
     * Save authentication data to localStorage
     */
    saveAuth() {
      if (this.userData) {
        localStorage.setItem(this.config.storageKey, JSON.stringify(this.userData));
      }
    }

    /**
     * Load stored authentication data
     */
    loadStoredAuth() {
      try {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.expires_at > Date.now()) {
            this.userData = data;
            this.log('Loaded stored authentication');
          } else {
            // Token expired, clear it
            localStorage.removeItem(this.config.storageKey);
            this.log('Stored token expired');
          }
        }
      } catch (error) {
        this.log('Error loading stored auth:', error);
        localStorage.removeItem(this.config.storageKey);
      }
    }

    /**
     * Generate random state for OAuth
     */
    generateState() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Handle errors
     */
    handleError(message) {
      console.error('PatreonStatic:', message);
      if (this.config.onError) {
        this.config.onError(message);
      }
    }
    
    /**
     * Validate redirect URI
     */
    validateRedirectUri(uri) {
      try {
        const url = new URL(uri);
        if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
          console.warn('PatreonStatic: Redirect URI should use HTTPS in production');
        }
        return uri;
      } catch (e) {
        throw new Error('PatreonStatic: Invalid redirect URI provided');
      }
    }

    /**
     * Debug logging
     */
    log(...args) {
      if (this.config.debug) {
        console.log('PatreonStatic:', ...args);
      }
    }
  }

  // Export for use
  window.PatreonStatic = PatreonStatic;
})();