# Testing Guide - InvAI v0.9.0 PWA

## Overview
This guide covers comprehensive testing for Sprint 6 PWA & Mobile-First implementation.

---

## Phase 4.1: Local Development Testing

### Prerequisites
```bash
# Ensure you have latest code
cd invai
git pull origin beta

# Install dependencies
npm install

# Check environment
node --version  # Should be v16+
npm --version   # Should be v8+
```

### Start Development Server
```bash
# Start the server
npm run dev

# Expected output:
# Server running on http://localhost:3001
# Database connected
# Migrations complete
```

### Initial Checks
- [ ] Server starts without errors
- [ ] No crash on startup
- [ ] Database file created (`grocery_inventory.db`)
- [ ] No migration errors
- [ ] Port 3001 is accessible

### Console Checks
Open browser console (F12) and verify:
- [ ] No JavaScript errors on page load
- [ ] No 404 errors for resources
- [ ] No CORS errors
- [ ] Service worker registration logs appear

---

## Phase 4.2: Core Functionality Testing

### Authentication Flow
1. **First Run Setup**
   - [ ] Navigate to `http://localhost:3001`
   - [ ] Redirects to `/register.html` (first time)
   - [ ] Register form loads correctly
   - [ ] Password strength meter works
   - [ ] Can create first user account
   - [ ] Redirects to `/login.html` after registration

2. **Login Process**
   - [ ] Login form loads correctly
   - [ ] Can login with created credentials
   - [ ] JWT token stored in localStorage
   - [ ] Redirects to main dashboard (`/`)
   - [ ] User info displayed in header

3. **Session Management**
   - [ ] Logout button works
   - [ ] Token cleared on logout
   - [ ] Redirects to login after logout
   - [ ] Protected pages redirect if not authenticated

### Dashboard Testing
- [ ] Dashboard loads without errors
- [ ] All stat cards display (Products, Items, Value, Low Stock)
- [ ] Expiration alerts section loads
- [ ] Category breakdown displays
- [ ] Recent products section loads
- [ ] Refresh button works

### Inventory Management
1. **Product CRUD**
   - [ ] "Add Product" button opens modal
   - [ ] Product form validation works
   - [ ] Can create new product
   - [ ] Product appears in list
   - [ ] Can edit product
   - [ ] Can delete product
   - [ ] Search/filter works

2. **Batch Management**
   - [ ] Can click product to view details
   - [ ] "Add Batch" button works
   - [ ] Batch form validation works
   - [ ] Can create batch
   - [ ] Batch appears in list
   - [ ] Can adjust batch quantities
   - [ ] Quick actions work

### Settings & Configuration
- [ ] Categories management works
- [ ] Suppliers management works
- [ ] Backup creation works
- [ ] Export to CSV works
- [ ] Update channel selector works

---

## Phase 4.3: Desktop Browser Testing

Test on each browser:

### Chrome (Recommended)
- [ ] All pages load correctly
- [ ] No console errors
- [ ] CSS renders properly
- [ ] Forms work correctly
- [ ] Animations smooth
- [ ] Service worker registers
- [ ] Install prompt appears

### Firefox
- [ ] All pages load correctly
- [ ] No console errors
- [ ] CSS renders properly
- [ ] Forms work correctly
- [ ] No layout issues

### Edge
- [ ] All pages load correctly
- [ ] No console errors
- [ ] CSS renders properly
- [ ] PWA features work

### Safari (Mac)
- [ ] All pages load correctly
- [ ] No console errors
- [ ] CSS renders properly
- [ ] iOS PWA meta tags work

---

## Phase 4.4: Mobile Device Testing

### Testing Setup Options

**Option 1: Local Network**
```bash
# Find your local IP
ifconfig | grep inet  # Mac/Linux
ipconfig              # Windows

# Access from mobile: http://YOUR_IP:3001
```

**Option 2: ngrok (Recommended)**
```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 3001

# Use provided HTTPS URL on mobile
```

**Option 3: Deployed Server**
```bash
# Test on production/staging URL
https://your-server.com
```

### iOS Testing (iPhone/iPad)

#### Safari Mobile
- [ ] All pages load correctly
- [ ] Touch scrolling smooth
- [ ] Tap targets large enough
- [ ] Forms usable
- [ ] Virtual keyboard doesn't break layout
- [ ] No horizontal scroll
- [ ] Bottom navigation accessible

#### PWA Installation (iOS)
1. [ ] Open in Safari
2. [ ] Tap Share button
3. [ ] Tap "Add to Home Screen"
4. [ ] App icon appears
5. [ ] App name correct
6. [ ] Launch from home screen
7. [ ] Runs in standalone mode
8. [ ] No Safari UI visible
9. [ ] Splash screen appears
10. [ ] App behaves like native

### Android Testing

#### Chrome Mobile
- [ ] All pages load correctly
- [ ] Touch scrolling smooth
- [ ] Tap targets adequate
- [ ] Forms usable
- [ ] Keyboard handles well
- [ ] No layout issues

#### PWA Installation (Android)
1. [ ] Open in Chrome
2. [ ] "Add to Home Screen" banner appears
3. [ ] Tap "Install" button
4. [ ] App icon appears on home screen
5. [ ] Launch from home screen
6. [ ] Runs in standalone mode
7. [ ] Splash screen appears
8. [ ] App behaves like native

---

## Phase 4.5: PWA Functionality Testing

### Manifest Validation
```bash
# Check manifest
curl http://localhost:3001/manifest.json
```

Verify:
- [ ] Manifest loads (200 status)
- [ ] Valid JSON format
- [ ] name: "InvAI - Inventory Management"
- [ ] short_name: "InvAI"
- [ ] start_url: "/"
- [ ] display: "standalone"
- [ ] Icons present (192x192, 512x512)

### Service Worker

**Chrome DevTools Check:**
1. Open DevTools (F12)
2. Go to Application tab
3. Check Service Workers section

Verify:
- [ ] Service worker registered
- [ ] Status: "activated and running"
- [ ] No errors in registration
- [ ] Scope: `/`

**Test Offline Mode:**
1. [ ] Load app while online
2. [ ] Open DevTools > Network tab
3. [ ] Enable "Offline" mode
4. [ ] Refresh page
5. [ ] App still loads
6. [ ] Cached pages accessible
7. [ ] Offline indicator shows (if implemented)

### Cache Management

In DevTools > Application > Cache Storage:
- [ ] Cache exists (`invai-cache-v1` or similar)
- [ ] HTML files cached
- [ ] CSS files cached
- [ ] JS files cached
- [ ] Images/icons cached

### Install Prompt

**Desktop (Chrome):**
- [ ] Visit site for first time
- [ ] Wait 30 seconds
- [ ] Install prompt appears in address bar
- [ ] Click install
- [ ] App installs
- [ ] Desktop icon created
- [ ] App launches in window

**Mobile:**
- [ ] Banner appears automatically
- [ ] "Add to Home Screen" option available
- [ ] Installation completes
- [ ] Icon appears on home screen

---

## Phase 4.6: Feature Testing

### Barcode Scanner

**Desktop (Webcam):**
- [ ] Scanner button visible
- [ ] Click opens camera modal
- [ ] Camera permission requested
- [ ] Camera stream appears
- [ ] Can scan barcode
- [ ] Barcode value captured
- [ ] Modal closes after scan

**Mobile:**
- [ ] Scanner button visible
- [ ] Opens rear camera by default
- [ ] Camera switches to front work
- [ ] Barcode detection works
- [ ] Vibration feedback (if supported)
- [ ] Results populate form

### Camera Capture
- [ ] Camera button visible (where applicable)
- [ ] Opens camera
- [ ] Can take photo
- [ ] Photo preview shows
- [ ] Can retake photo
- [ ] Photo uploads/saves

### Touch Gestures

**Swipe:**
- [ ] Swipe left/right works on product cards
- [ ] Swipe reveals actions
- [ ] Smooth animation

**Pull-to-Refresh:**
- [ ] Pull down on dashboard
- [ ] Loading indicator appears
- [ ] Data refreshes
- [ ] Indicator disappears

**Pinch-to-Zoom:**
- [ ] Disabled on form inputs (prevents accidental zoom)
- [ ] Enabled on images (if applicable)

### Mobile Navigation

**Bottom Navigation Bar:**
- [ ] Appears on mobile (<768px)
- [ ] Fixed to bottom
- [ ] All tabs visible
- [ ] Active tab highlighted
- [ ] Tap switches tabs
- [ ] Smooth transitions

**Hamburger Menu:**
- [ ] Menu icon visible
- [ ] Tap opens sidebar
- [ ] Overlay appears
- [ ] Sidebar slides in
- [ ] Can close with X
- [ ] Can close with overlay tap
- [ ] Can swipe to close

### Responsive Design

**Breakpoints:**
- [ ] Desktop (>1024px): Multi-column layout
- [ ] Tablet (768-1024px): Adaptive layout
- [ ] Mobile (<768px): Single column

**Elements:**
- [ ] Tables become scrollable/cards on mobile
- [ ] Forms stack vertically
- [ ] Buttons full-width on mobile
- [ ] Text readable without zoom
- [ ] Images scale appropriately

---

## Phase 4.7: Performance Testing

### Load Time
- [ ] Initial load < 3 seconds (good connection)
- [ ] Cached load < 1 second
- [ ] Time to Interactive < 5 seconds

### Lighthouse Audit

**Run in Chrome DevTools:**
1. Open DevTools
2. Go to Lighthouse tab
3. Select categories: Performance, PWA, Accessibility
4. Click "Generate report"

**Target Scores:**
- [ ] Performance: >80
- [ ] PWA: >90
- [ ] Accessibility: >80
- [ ] Best Practices: >80

### Memory Usage
- [ ] No memory leaks on navigation
- [ ] Heap size stable
- [ ] No excessive DOM nodes

---

## Phase 4.8: Accessibility Testing

### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Tab order logical
- [ ] Enter key submits forms
- [ ] Escape closes modals
- [ ] Keyboard shortcuts work

### Screen Reader
- [ ] Alt text on images
- [ ] ARIA labels present
- [ ] Form labels associated
- [ ] Error messages readable

### Contrast
- [ ] Text readable in light mode
- [ ] Text readable in dark mode
- [ ] Focus indicators visible

---

## Phase 4.9: Cross-Device Testing Matrix

| Device | Browser | Resolution | Status | Notes |
|--------|---------|------------|--------|-------|
| Desktop | Chrome | 1920x1080 | [ ] | |
| Desktop | Firefox | 1920x1080 | [ ] | |
| Desktop | Edge | 1920x1080 | [ ] | |
| MacBook | Safari | 1440x900 | [ ] | |
| iPhone 14 | Safari | 390x844 | [ ] | |
| iPhone SE | Safari | 375x667 | [ ] | |
| iPad Pro | Safari | 1024x1366 | [ ] | |
| Pixel 7 | Chrome | 412x915 | [ ] | |
| Galaxy S22 | Chrome | 360x800 | [ ] | |
| Tablet | Chrome | 768x1024 | [ ] | |

---

## Bug Reporting

When you find a bug, document it in `BUG_TRACKER.md`:

```markdown
### Bug #X: [Short Description]
**Severity:** Critical/High/Medium/Low
**Status:** Open/In Progress/Fixed/Closed

**Environment:**
- Device: [e.g., iPhone 14]
- OS: [e.g., iOS 17.2]
- Browser: [e.g., Safari]
- Version: [e.g., v0.9.0-beta]

**Steps to Reproduce:**
1. Go to...
2. Click on...
3. See error...

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[If applicable]

**Console Errors:**
```
[Paste console output]
```

**Fix Status:**
- [ ] Bug reproduced
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Fix tested
- [ ] Fix deployed
```

---

## Success Criteria

Phase 4 is complete when:
- [ ] All local tests pass
- [ ] Desktop browsers verified (Chrome, Firefox, Edge, Safari)
- [ ] Mobile devices verified (iOS, Android)
- [ ] PWA installs successfully
- [ ] Offline mode works
- [ ] All features tested
- [ ] Critical bugs fixed
- [ ] Lighthouse scores meet targets
- [ ] Documentation complete

---

## Next Steps After Testing

1. **Fix Critical Bugs** (Severity: Critical/High)
2. **Update Documentation** (README, API docs)
3. **Create Release Notes** (v0.9.0)
4. **Version Bump** (package.json)
5. **Merge to Main** (beta → main)
6. **Deploy to Production**
7. **Tag Release** (v0.9.0)

---

## Support

If you encounter issues:
1. Check console for errors
2. Review `BUG_TRACKER.md`
3. Check GitHub Issues
4. Contact development team

**Testing started:** [Date]
**Testing completed:** [Date]
**Tester:** [Name]
**Version:** v0.9.0-beta
