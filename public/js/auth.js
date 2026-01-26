/**
 * Authentication Helper for InvAI Frontend
 * 
 * This script checks if the user is authenticated before allowing access to protected pages.
 * Include this at the top of any page that requires authentication.
 * 
 * Usage: Add this script tag to your HTML:
 * <script src="/js/auth.js"></script>
 */

(function() {
  'use strict';

  // Get the current page
  const currentPage = window.location.pathname;
  
  // Pages that don't require authentication
  const publicPages = ['/login.html', '/login'];
  
  // Check if current page is public
  const isPublicPage = publicPages.some(page => currentPage.endsWith(page));
  
  // If it's a public page, no need to check auth
  if (isPublicPage) {
    return;
  }

  /**
   * Check if user has a valid authentication token
   */
  function checkAuth() {
    const token = localStorage.getItem('auth_token');
    
    // No token found - redirect to login
    if (!token) {
      console.log('No auth token found, redirecting to login...');
      window.location.href = '/login.html';
      return;
    }
    
    // Verify token with server
    fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Invalid token');
      }
      return response.json();
    })
    .then(data => {
      // Extract user object from response (API returns { success: true, user: {...} })
      const user = data.user || data;
      
      // Token is valid, store user info
      localStorage.setItem('user', JSON.stringify(user));
      console.log('Authenticated as:', user.username);
      
      // Dispatch custom event that other scripts can listen to
      window.dispatchEvent(new CustomEvent('userAuthenticated', { detail: user }));
    })
    .catch(error => {
      console.error('Authentication failed:', error);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Redirect to login
      window.location.href = '/login.html';
    });
  }

  /**
   * Get the current user from localStorage
   */
  window.getCurrentUser = function() {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  };

  /**
   * Get the auth token
   */
  window.getAuthToken = function() {
    return localStorage.getItem('auth_token');
  };

  /**
   * Logout function
   */
  window.logout = function() {
    const token = localStorage.getItem('auth_token');
    
    // Call logout API
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(() => {
        console.log('Logged out successfully');
      })
      .catch(error => {
        console.error('Logout error:', error);
      })
      .finally(() => {
        // Clear local storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        // Redirect to login
        window.location.href = '/login.html';
      });
    } else {
      // Just redirect if no token
      window.location.href = '/login.html';
    }
  };

  /**
   * Make authenticated API request
   */
  window.authFetch = function(url, options = {}) {
    const token = getAuthToken();
    
    if (!token) {
      return Promise.reject(new Error('No authentication token'));
    }
    
    // Add authorization header
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${token}`;
    
    return fetch(url, options)
      .then(response => {
        // If unauthorized, redirect to login
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login.html';
          throw new Error('Unauthorized');
        }
        return response;
      });
  };

  // Check authentication when page loads
  checkAuth();

})();
