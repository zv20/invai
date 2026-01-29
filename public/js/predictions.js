/**
 * Predictions Dashboard JavaScript - CSP Compliant
 * Fixed for standalone page structure (no tabs)
 */

const API_BASE = '/api/predictions';
let productsCache = [];
let currentReport = 'demand';

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPredictions);
} else {
    initPredictions();
}

function initPredictions() {
    // Check if we're on the predictions page
    if (!document.getElementById('forecast-results')) {
        console.log('Not on predictions page, skipping init');
        return;
    }
    
    console.log('🔮 Initializing Predictions page...');
    
    // Setup report navigation
    initializeReportNav();
    
    // Load initial data
    loadProducts();
    loadReorderRecommendations();
    loadOptimizationReport();
    
    // Setup search
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleProductSearch, 300));
    }
    
    console.log('✓ Predictions initialized');
}

// Report Navigation (replaces tabs)
function initializeReportNav() {
    const navButtons = document.querySelectorAll('[data-report]');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const report = this.dataset.report;
            switchReport(report);
        });
    });
}

function switchReport(reportName) {
    currentReport = reportName;
    
    // Update nav buttons
    document.querySelectorAll('[data-report]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.report === reportName) {
            btn.classList.add('active');
        }
    });
    
    // Update content visibility
    document.querySelectorAll('.report-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`${reportName}-content`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
}

// Load Products for Search
async function loadProducts() {
    try {
        const response = await authFetch('/api/products');
        if (!response.ok) {
            console.error('Failed to load products:', response.status);
            return;
        }
        const data = await response.json();
        if (data.success || data.data) {
            productsCache = data.data || data.products || [];
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Product Search Handler
function handleProductSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('forecast-results');
    
    if (!resultsDiv) return;
    
    if (searchTerm.length < 2) {
        resultsDiv.innerHTML = '';
        return;
    }

    const matches = productsCache.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        (p.sku && p.sku.toLowerCase().includes(searchTerm))
    ).slice(0, 5);

    if (matches.length === 0) {
        resultsDiv.innerHTML = '<p>No products found</p>';
        return;
    }

    displayProductOptions(matches);
}

function displayProductOptions(products) {
    const html = products.map(p => `
        <div class="product-option" data-action="loadProductForecast" data-product-id="${p.id}" data-product-name="${escapeHtml(p.name)}">
            <strong>${escapeHtml(p.name)}</strong>
            <span class="product-sku">${escapeHtml(p.sku || '')}</span>
        </div>
    `).join('');

    document.getElementById('forecast-results').innerHTML = html;
}

// Load Product Forecast
async function loadProductForecast(productId, productName) {
    const resultsDiv = document.getElementById('forecast-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = '<div class="loading">Analyzing demand patterns...</div>';

    try {
        const response = await authFetch(`${API_BASE}/demand/${productId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ horizon: 30, lookback: 90 })
        });
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success && data.data) {
            displayForecast(data.data, productName);
        } else {
            resultsDiv.innerHTML = `<p class="error">Error: ${data.error || 'Unknown error'}</p>`;
        }
    } catch (error) {
        console.error('Error loading forecast:', error);
        resultsDiv.innerHTML = '<p class="error">Failed to load forecast. Please try again.</p>';
    }
}

function displayForecast(forecast, productName) {
    const confidenceClass = forecast.confidence >= 70 ? 'high' : 
                           forecast.confidence >= 40 ? 'medium' : 'low';

    const html = `
        <div class="forecast-card">
            <div class="prediction-header">
                <h4>${escapeHtml(productName)}</h4>
                <span class="confidence-badge confidence-${confidenceClass}">
                    ${forecast.confidence}% Confidence
                </span>
            </div>

            <div class="forecast-grid">
                <div class="forecast-metric">
                    <label>30-Day Forecast</label>
                    <div class="value">${forecast.forecast}</div>
                    <small>units</small>
                </div>

                <div class="forecast-metric">
                    <label>Daily Average</label>
                    <div class="value">${forecast.dailyAverage}</div>
                    <small>units/day</small>
                </div>

                <div class="forecast-metric">
                    <label>Trend</label>
                    <div class="value">
                        ${getTrendEmoji(forecast.trend)} ${forecast.trend}
                    </div>
                </div>

                <div class="forecast-metric">
                    <label>Forecast Range</label>
                    <div class="value">
                        ${forecast.confidenceInterval.lower} - ${forecast.confidenceInterval.upper}
                    </div>
                </div>
            </div>

            ${forecast.seasonality?.detected ? `
                <div class="seasonality-notice">
                    <strong>🔄 Seasonality Detected</strong>
                    <p>${forecast.seasonality.period}-day cycle with ${forecast.seasonality.strength}% strength</p>
                </div>
            ` : ''}

            ${forecast.recommendations?.length > 0 ? `
                <div class="recommendations">
                    <strong>💡 Recommendations:</strong>
                    <ul>
                        ${forecast.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="forecast-meta">
                Method: ${forecast.method?.replace(/_/g, ' ') || 'Unknown'} | Historical Average: ${forecast.historicalAverage || 0} units
            </div>
        </div>
    `;

    document.getElementById('forecast-results').innerHTML = html;
}

// Load Reorder Recommendations
async function loadReorderRecommendations() {
    const resultsDiv = document.getElementById('reorder-results');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = '<div class="loading">Calculating reorder points...</div>';

    try {
        const response = await authFetch(`${API_BASE}/reorder-points`);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success && data.data) {
            displayReorderRecommendations(data.data);
        } else {
            resultsDiv.innerHTML = `<p class="error">Error loading recommendations</p>`;
        }
    } catch (error) {
        console.error('Error loading reorder recommendations:', error);
        resultsDiv.innerHTML = '<p class="error">Failed to load recommendations. Please try again.</p>';
    }
}

function displayReorderRecommendations(recommendations) {
    const resultsDiv = document.getElementById('reorder-results');
    if (!resultsDiv) return;

    if (!recommendations || recommendations.length === 0) {
        resultsDiv.innerHTML = '<div class="empty-state">✅ No products need reordering at this time</div>';
        return;
    }

    const html = `
        <p><strong>${recommendations.length}</strong> product(s) need reordering</p>
        <table class="reorder-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Current Stock</th>
                    <th>Reorder Point</th>
                    <th>Order Qty</th>
                    <th>Days Left</th>
                    <th>Risk</th>
                    <th>Urgency</th>
                </tr>
            </thead>
            <tbody>
                ${recommendations.map(r => `
                    <tr>
                        <td><strong>${escapeHtml(r.productName)}</strong></td>
                        <td>${r.currentStock}</td>
                        <td>${r.reorderPoint}</td>
                        <td>${r.optimalOrderQuantity}</td>
                        <td>${r.daysUntilStockout}</td>
                        <td><span class="risk-badge risk-${r.stockoutRisk}">${r.stockoutRisk}</span></td>
                        <td><span class="urgency-badge urgency-${r.urgency}">${r.urgency}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    resultsDiv.innerHTML = html;
}

// Load Optimization Report
async function loadOptimizationReport() {
    const resultsDiv = document.getElementById('optimization-results');
    if (!resultsDiv) return;

    try {
        const response = await authFetch(`${API_BASE}/optimization/report`);
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success && data.data) {
            displayOptimizationReport(data.data);
        } else {
            resultsDiv.innerHTML = `<p class="error">Error loading report</p>`;
        }
    } catch (error) {
        console.error('Error loading optimization report:', error);
        resultsDiv.innerHTML = '<p class="error">Failed to load report. Please try again.</p>';
    }
}

function displayOptimizationReport(report) {
    const html = `
        <div class="forecast-grid">
            <div class="forecast-metric">
                <label>Total Inventory Value</label>
                <div class="value">$${(report.summary?.totalInventoryValue || 0).toFixed(2)}</div>
            </div>
            <div class="forecast-metric">
                <label>Slow-Moving Items</label>
                <div class="value">${report.summary?.slowMovingItems || 0}</div>
            </div>
            <div class="forecast-metric">
                <label>Excess Inventory</label>
                <div class="value">$${(report.summary?.excessInventoryValue || 0).toFixed(2)}</div>
            </div>
            <div class="forecast-metric">
                <label>Potential Savings</label>
                <div class="value">$${(report.summary?.potentialAnnualSavings || 0).toFixed(2)}</div>
                <small>per year</small>
            </div>
        </div>

        ${report.topRecommendations?.length > 0 ? `
            <h4>🎯 Top Recommendations</h4>
            ${report.topRecommendations.map(rec => `
                <div class="optimization-alert priority-${rec.priority}">
                    <strong>${escapeHtml(rec.action)}</strong>
                    <p>${escapeHtml(rec.impact)}</p>
                    <p class="savings"><strong>${escapeHtml(rec.savings)}</strong></p>
                </div>
            `).join('')}
        ` : ''}

        ${report.abc ? `
            <h4>📈 ABC Classification</h4>
            <div class="abc-grid">
                <div class="abc-card class-a">
                    <h3>A</h3>
                    <p><strong>${report.abc.classifications?.A?.count || 0}</strong> products</p>
                    <p>Value: $${(report.abc.classifications?.A?.value || 0).toFixed(2)}</p>
                    <small>High-value items requiring tight control</small>
                </div>
                <div class="abc-card class-b">
                    <h3>B</h3>
                    <p><strong>${report.abc.classifications?.B?.count || 0}</strong> products</p>
                    <p>Value: $${(report.abc.classifications?.B?.value || 0).toFixed(2)}</p>
                    <small>Moderate control and monitoring</small>
                </div>
                <div class="abc-card class-c">
                    <h3>C</h3>
                    <p><strong>${report.abc.classifications?.C?.count || 0}</strong> products</p>
                    <p>Value: $${(report.abc.classifications?.C?.value || 0).toFixed(2)}</p>
                    <small>Simple reorder systems sufficient</small>
                </div>
            </div>
        ` : ''}

        ${report.slowMoving?.length > 0 ? `
            <h4>🐌 Slow-Moving Inventory (Top 10)</h4>
            <table class="reorder-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Stock</th>
                        <th>Value</th>
                        <th>Days Without Movement</th>
                        <th>Recommendation</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.slowMoving.slice(0, 10).map(item => `
                        <tr>
                            <td><strong>${escapeHtml(item.name)}</strong></td>
                            <td>${item.stock_quantity}</td>
                            <td>$${(item.inventory_value || 0).toFixed(2)}</td>
                            <td>${item.daysWithoutMovement || 0}</td>
                            <td>${escapeHtml(item.recommendation || 'N/A')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}
    `;

    document.getElementById('optimization-results').innerHTML = html;
}

// Utility Functions
function getTrendEmoji(trend) {
    const emojis = {
        increasing: '📈',
        decreasing: '📉',
        stable: '➡️',
        unknown: '❓'
    };
    return emojis[trend] || '➡️';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
