/**
 * Password Expiration Warning System
 * Checks password status and displays warning banner
 * v0.8.4a - Sprint 3 Phase 2
 */

(function() {
    'use strict';

    // Check password status on page load
    async function checkPasswordStatus() {
        try {
            // Only check if user is authenticated
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const response = await fetch('/api/auth/password-status', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // If endpoint doesn't exist or errors, silently fail
                return;
            }

            const data = await response.json();
            
            // Show warning if password is expiring soon or expired
            if (data.warning || data.expired) {
                showPasswordWarning(data);
            }
        } catch (error) {
            // Silently fail - don't disrupt user experience
            console.debug('Password status check:', error.message);
        }
    }

    // Show password expiration warning banner
    function showPasswordWarning(statusData) {
        // Check if banner already exists
        let banner = document.getElementById('passwordExpirationBanner');
        
        if (!banner) {
            // Create banner
            banner = document.createElement('div');
            banner.id = 'passwordExpirationBanner';
            banner.className = 'password-warning-banner';
            
            // Insert after update banner or at top of container
            const updateBanner = document.getElementById('updateBanner');
            if (updateBanner) {
                updateBanner.insertAdjacentElement('afterend', banner);
            } else {
                const container = document.querySelector('.container');
                if (container) {
                    container.insertAdjacentElement('afterbegin', banner);
                }
            }
        }

        // Determine message and styling
        const isExpired = statusData.expired;
        const daysRemaining = statusData.daysUntilExpiry;
        
        let message, icon, className;
        
        if (isExpired) {
            icon = '❌';
            message = 'Your password has expired! You must change it now.';
            className = 'password-warning-banner error';
        } else if (daysRemaining === 0) {
            icon = '⚠️';
            message = 'Your password expires today! Please change it immediately.';
            className = 'password-warning-banner urgent';
        } else if (daysRemaining === 1) {
            icon = '⚠️';
            message = 'Your password expires tomorrow! Please change it soon.';
            className = 'password-warning-banner urgent';
        } else {
            icon = '🔔';
            message = `Your password will expire in ${daysRemaining} days. Please change it soon.`;
            className = 'password-warning-banner warning';
        }

        banner.className = className;
        banner.innerHTML = `
            <div class="password-warning-content">
                <span class="password-warning-icon">${icon}</span>
                <span class="password-warning-message">${message}</span>
                <button onclick="openChangePasswordModal()" class="password-warning-btn">Change Password</button>
                ${!isExpired ? '<button onclick="dismissPasswordWarning()" class="password-warning-dismiss">✕</button>' : ''}
            </div>
        `;

        banner.style.display = 'block';
    }

    // Dismiss password warning (for non-expired only)
    window.dismissPasswordWarning = function() {
        const banner = document.getElementById('passwordExpirationBanner');
        if (banner) {
            banner.style.display = 'none';
            // Store dismissal in session storage (only for current session)
            sessionStorage.setItem('passwordWarningDismissed', 'true');
        }
    };

    // Open change password modal
    window.openChangePasswordModal = function() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('changePasswordModal');
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'changePasswordModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>🔒 Change Password</h2>
                        <button class="close-modal" onclick="closeChangePasswordModal()">✕ Close</button>
                    </div>
                    <form id="changePasswordForm" onsubmit="handleChangePassword(event)">
                        <div class="form-row">
                            <div style="grid-column: 1 / -1;">
                                <label>Current Password *</label>
                                <input type="password" id="currentPassword" required autocomplete="current-password">
                            </div>
                        </div>
                        <div class="form-row">
                            <div style="grid-column: 1 / -1;">
                                <label>New Password *</label>
                                <input type="password" id="newPassword" required minlength="8" autocomplete="new-password">
                                <div class="help-text">Must be at least 8 characters with uppercase, lowercase, number, and special character</div>
                            </div>
                        </div>
                        <div class="form-row">
                            <div style="grid-column: 1 / -1;">
                                <label>Confirm New Password *</label>
                                <input type="password" id="confirmPassword" required minlength="8" autocomplete="new-password">
                            </div>
                        </div>
                        <div id="changePasswordError" class="error-message" style="display: none; color: #dc2626; margin-top: 10px;"></div>
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button type="submit" style="flex: 1;" id="changePasswordBtn">Change Password</button>
                            <button type="button" onclick="closeChangePasswordModal()" style="background: #6b7280; flex: 1;">Cancel</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.style.display = 'block';
        document.getElementById('currentPassword').focus();
    };

    // Close change password modal
    window.closeChangePasswordModal = function() {
        const modal = document.getElementById('changePasswordModal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('changePasswordForm').reset();
            const errorDiv = document.getElementById('changePasswordError');
            if (errorDiv) errorDiv.style.display = 'none';
        }
    };

    // Handle password change submission
    window.handleChangePassword = async function(event) {
        event.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const errorDiv = document.getElementById('changePasswordError');
        const submitBtn = document.getElementById('changePasswordBtn');

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            errorDiv.textContent = 'New passwords do not match';
            errorDiv.style.display = 'block';
            return;
        }

        // Validate password complexity
        if (newPassword.length < 8) {
            errorDiv.textContent = 'Password must be at least 8 characters';
            errorDiv.style.display = 'block';
            return;
        }

        try {
            errorDiv.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Changing...';

            const token = localStorage.getItem('auth_token');
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || data.error || 'Failed to change password');
            }

            // Success
            alert('✅ Password changed successfully!');
            closeChangePasswordModal();
            
            // Hide warning banner
            const banner = document.getElementById('passwordExpirationBanner');
            if (banner) banner.style.display = 'none';
            
            // Re-check password status
            setTimeout(checkPasswordStatus, 1000);

        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
        }
    };

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkPasswordStatus);
    } else {
        checkPasswordStatus();
    }

    // Re-check every hour
    setInterval(checkPasswordStatus, 60 * 60 * 1000);

})();