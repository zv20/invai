/* ==========================================================================
   Barcode Scanner
   QR code and barcode scanning functionality
   ========================================================================== */

let html5QrcodeScanner = null;
let isScanning = false;

/* ==========================================================================
   Scanner Modal Management
   ========================================================================== */

function openScanner() {
    document.getElementById('scannerModal').classList.add('active');
    document.getElementById('scannerResult').classList.remove('show');
    if (!isScanning) startScanner();
}

function closeScanner() {
    const modal = document.getElementById('scannerModal');
    modal.classList.remove('active');
    if (html5QrcodeScanner && isScanning) {
        html5QrcodeScanner.stop().then(() => {
            isScanning = false;
            document.getElementById('reader').innerHTML = '';
        }).catch(err => {
            console.error('Error stopping scanner:', err);
            isScanning = false;
            document.getElementById('reader').innerHTML = '';
        });
    }
}

/* ==========================================================================
   Scanner Functionality
   ========================================================================== */

function startScanner() {
    isScanning = true;
    html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanError)
        .catch(err => {
            console.error('Unable to start scanning', err);
            alert('Unable to access camera. Please check permissions.');
            closeScanner();
        });
}

function onScanSuccess(decodedText) {
    document.getElementById('scannedCode').textContent = decodedText;
    document.getElementById('scannerResult').classList.add('show');
    document.getElementById('productSearch').value = decodedText;
    loadProducts();
    setTimeout(() => closeScanner(), 1500);
}

function onScanError(errorMessage) {
    // Silently ignore scan errors (normal when no barcode in view)
}