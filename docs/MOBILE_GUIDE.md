# Mobile Guide - InvAI

## Overview

InvAI provides a fully optimized mobile experience with touch gestures, barcode scanning, and mobile-first UI.

---

## Mobile Features

### ✅ Touch Optimizations
- **44x44px minimum** touch targets
- Swipe gestures (left/right/up/down)
- Pull-to-refresh
- Long-press actions
- Touch ripple effects
- Haptic feedback

### ✅ Mobile Navigation
- **Bottom navigation bar** (5 sections)
- Floating Action Button (FAB)
- Mobile-friendly header
- Swipe between pages
- Back button handling

### ✅ Barcode Scanner
- **Camera-based scanning**
- QR code support
- Multiple formats (EAN, UPC, Code128)
- Product lookup
- Quick add via scan
- Torch/flash control

### ✅ Camera Integration
- **Photo capture** for products
- Front/back camera switch
- Image compression
- Gallery integration
- Preview before upload

### ✅ Responsive Design
- Stack layouts on mobile
- Mobile-optimized tables
- Collapsible sections
- Adaptive font sizes
- Card-based layouts

---

## Bottom Navigation

The bottom navigation bar provides quick access to main sections:

1. **📊 Dashboard** - Overview and stats
2. **📦 Products** - Product management
3. **📷 Scan** - Barcode scanner
4. **🔍 Search** - Advanced search
5. **☰ More** - Additional pages

---

## Barcode Scanner

### Opening Scanner

**From Bottom Nav:**
- Tap the 📷 Scan button

**From Code:**
```javascript
BarcodeScanner.open((result) => {
  console.log('Scanned:', result.text);
  // Handle barcode
});
```

### Supported Formats

- **EAN-13** - 13-digit barcodes
- **EAN-8** - 8-digit barcodes
- **UPC-A** - 12-digit UPC
- **UPC-E** - 6-digit UPC
- **Code 128** - Alphanumeric
- **Code 39** - Alphanumeric
- **QR Code** - 2D codes

### Scanner Controls

- **🔦 Torch** - Toggle flashlight
- **🔄 Flip** - Switch camera
- **Manual Entry** - Type barcode
- **Close** - Exit scanner

### Workflow

1. Open scanner from bottom nav
2. Point camera at barcode
3. Wait for automatic scan
4. Product lookup performed
5. Navigate to product or create new

---

## Camera Capture

### Taking Photos

**From Product Form:**
```javascript
CameraCapture.open((imageData) => {
  console.log('Photo captured');
  // Save or upload image
});
```

### Features

- **Auto-compression** - Reduces file size
- **Preview** - Review before saving
- **Retake** - Capture again
- **Gallery** - Choose from photos
- **Front/Back** - Switch cameras

### Controls

- **🔴 Capture** - Take photo
- **🔄 Flip** - Switch camera
- **🖼️ Gallery** - Open file picker
- **Cancel** - Close camera

---

## Touch Gestures

### Swipe Actions

**Swipe Left** - Reveal actions
```javascript
new SwipeHandler(element, {
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right')
});
```

**Use Cases:**
- Swipe product cards to delete
- Swipe transactions to edit
- Swipe batches to manage

### Pull to Refresh

**Auto-enabled** on scrollable containers:
```javascript
new PullToRefresh(container, async () => {
  await refreshData();
});
```

### Long Press

**Hold for 500ms** to trigger:
```javascript
new LongPressHandler(element, {
  duration: 500,
  onLongPress: () => console.log('Long pressed')
});
```

---

## Mobile Components

### Floating Action Button (FAB)

**Simple FAB:**
```javascript
new MobileUI.FAB({
  icon: '+',
  onClick: () => addProduct()
});
```

**FAB with Menu:**
```javascript
new MobileUI.FAB({
  icon: '+',
  actions: [
    { icon: '📦', label: 'Add Product', onClick: addProduct },
    { icon: '📷', label: 'Scan', onClick: openScanner },
    { icon: '💸', label: 'Transaction', onClick: addTransaction }
  ]
});
```

### Bottom Sheet

**Create:**
```html
<div class="bottom-sheet-backdrop"></div>
<div class="bottom-sheet" id="my-sheet">
  <div class="bottom-sheet-handle"></div>
  <div class="bottom-sheet-content">
    <!-- Content here -->
  </div>
</div>
```

**Control:**
```javascript
const sheet = new TouchGestures.BottomSheet('my-sheet');
sheet.open();
sheet.close();
```

### Mobile Toast

**Show notification:**
```javascript
MobileUI.showToast('Product saved!', 3000);
```

### Mobile Confirm

**Confirmation dialog:**
```javascript
MobileUI.showMobileConfirm(
  'Delete Product',
  'Are you sure?',
  () => deleteProduct()
);
```

---

## Responsive Tables

### Auto-Stack on Mobile

Tables automatically stack on screens < 480px:

```html
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Stock</th>
      <th>Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td data-label="Name">Product A</td>
      <td data-label="Stock">100</td>
      <td data-label="Price">$10</td>
    </tr>
  </tbody>
</table>
```

The `data-label` attribute is shown as the label on mobile.

---

## Mobile Forms

### Best Practices

1. **16px font size** - Prevents iOS zoom
2. **Large inputs** - 44px minimum height
3. **Clear labels** - Above inputs
4. **Touch-friendly** - Ample spacing
5. **Minimal fields** - Only essentials

### Example

```html
<div class="form-group">
  <label>Product Name</label>
  <input type="text" 
         style="font-size: 16px; padding: 12px;"
         placeholder="Enter name">
</div>
```

---

## Performance

### Optimizations

- **Reduced animations** on mobile
- **Lazy loading** for images
- **Touch scrolling** optimized
- **Minimal repaints** during scroll
- **Hardware acceleration** for animations

### Best Practices

1. Use `transform` instead of `left/top`
2. Use `will-change` for animations
3. Debounce scroll events
4. Use passive event listeners
5. Reduce DOM manipulations

---

## Browser Compatibility

### Mobile Safari (iOS)

✅ PWA installable (iOS 16.4+)
✅ Camera access
✅ Barcode scanning (with library)
✅ Touch gestures
✅ Service workers
⚠️ Limited push notifications

### Chrome (Android)

✅ Full PWA support
✅ Camera access
✅ Barcode scanning
✅ Touch gestures
✅ Push notifications
✅ Background sync

### Samsung Internet

✅ PWA support
✅ Camera access
✅ Most features work

---

## Testing

### Chrome DevTools

1. Open DevTools (F12)
2. Click device toolbar icon
3. Select mobile device
4. Test touch events

### Real Device Testing

**Connect via USB:**
```bash
# Android
chrome://inspect

# iOS (Safari)
Develop → [Device] → [Page]
```

---

## Integration

### Add to HTML

```html
<!-- Mobile CSS -->
<link rel="stylesheet" href="/css/mobile.css">

<!-- Mobile Scripts -->
<script src="/js/touch-gestures.js"></script>
<script src="/js/mobile-components.js"></script>
<script src="/js/mobile-navigation.js"></script>
<script src="/js/barcode-scanner.js"></script>
<script src="/js/camera-capture.js"></script>
```

### Initialize

```javascript
// Auto-initializes on mobile
// Or manually:
if (window.innerWidth <= 768) {
  MobileNavigation.init();
  TouchGestures.init();
}
```

---

## Troubleshooting

### Camera Not Working

- **Check permissions** in browser settings
- **Use HTTPS** (required for camera)
- **Try different browser** (Safari vs Chrome)
- **Check console** for errors

### Barcode Scanner Not Detecting

- **Good lighting** is essential
- **Hold steady** for 1-2 seconds
- **Clean lens** if blurry
- **Try manual entry** as fallback

### Touch Gestures Not Working

- **Check** `touch-action` CSS
- **Ensure** element has event listeners
- **Test** on real device (not simulator)
- **Check console** for errors

---

**Last Updated**: January 25, 2026  
**Sprint 6 Phase 2**: Mobile UI Complete ✅
