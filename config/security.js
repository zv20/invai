/**
 * Security Configuration
 * 
 * Centralized security settings for:
 * - Session management
 * - Password policies
 * - Account lockout
 * 
 * All settings are configurable via environment variables
 * with sensible defaults for production use.
 */

module.exports = {
    /**
     * Session Management Settings
     */
    session: {
        // Session timeout in minutes (how long session is valid)
        timeout: parseInt(process.env.SESSION_TIMEOUT) || 480, // 8 hours
        
        // Inactivity timeout in minutes (auto-logout after no activity)
        inactivityTimeout: parseInt(process.env.INACTIVITY_TIMEOUT) || 30,
        
        // Maximum concurrent sessions per user
        maxConcurrentSessions: parseInt(process.env.MAX_SESSIONS) || 3,
        
        // Session cleanup interval (minutes)
        cleanupInterval: 15,
        
        // Require fresh login for sensitive operations
        requireReauth: true,
        reauthTimeout: 15 // minutes since last login
    },
    
    /**
     * Password Policy Settings
     */
    password: {
        // Minimum password length
        minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8,
        
        // Complexity requirements
        requireUppercase: process.env.PASSWORD_REQUIRE_UPPER !== 'false',
        requireLowercase: process.env.PASSWORD_REQUIRE_LOWER !== 'false',
        requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
        requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
        
        // Password history (prevent reuse of last N passwords)
        historyCount: parseInt(process.env.PASSWORD_HISTORY_COUNT) || 5,
        
        // Password expiration
        expirationDays: parseInt(process.env.PASSWORD_EXPIRATION_DAYS) || 90,
        warningDays: parseInt(process.env.PASSWORD_WARNING_DAYS) || 14,
        
        // Allow temporary bypass during development
        enforceComplexity: process.env.NODE_ENV === 'production' || process.env.ENFORCE_PASSWORD_COMPLEXITY === 'true'
    },
    
    /**
     * Account Lockout Settings
     */
    lockout: {
        // Enable account lockout
        enabled: process.env.LOCKOUT_ENABLED !== 'false',
        
        // Maximum failed login attempts before lockout
        maxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS) || 5,
        
        // Lockout duration in minutes
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15,
        
        // Reset failed attempt counter after successful login
        resetAfterSuccess: true,
        
        // Track attempts by IP address (in addition to username)
        trackByIp: true
    },
    
    /**
     * Rate Limiting Settings
     */
    rateLimit: {
        // General API rate limit
        api: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // requests per window
        },
        
        // Authentication endpoints (stricter)
        auth: {
            windowMs: 15 * 60 * 1000,
            max: 5 // login attempts per window
        },
        
        // Password reset
        passwordReset: {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 3
        }
    },
    
    /**
     * CSRF Protection Settings
     */
    csrf: {
        // Enable CSRF protection
        enabled: process.env.NODE_ENV === 'production' || process.env.CSRF_ENABLED === 'true',
        
        // Cookie settings
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        }
    },
    
    /**
     * Security Headers Settings (Helmet.js)
     */
    headers: {
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for now
                scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for now
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        
        // HTTP Strict Transport Security
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
        }
    }
};
