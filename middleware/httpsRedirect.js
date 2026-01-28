/**
 * HTTPS Redirect Middleware
 * Enforces HTTPS in production environments
 */

/**
 * Redirect HTTP to HTTPS in production
 * Checks both req.secure and x-forwarded-proto header (for proxies)
 */
function httpsRedirect(req, res, next) {
  // Only enforce in production
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Check if request is already secure
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  
  if (!isSecure) {
    // Redirect to HTTPS version
    const httpsUrl = `https://${req.get('host')}${req.url}`;
    
    console.log(`Redirecting to HTTPS: ${req.url}`);
    
    return res.redirect(301, httpsUrl);
  }
  
  next();
}

/**
 * Add HSTS header for browsers
 * Tells browsers to always use HTTPS
 */
function enforceHSTS(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    // Strict-Transport-Security header
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  next();
}

module.exports = httpsRedirect;
module.exports.enforceHSTS = enforceHSTS;
