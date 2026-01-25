/**
 * Predictions Dashboard JavaScript
 */

const API_BASE = '/api/predictions';
let productsCache = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    loadProducts();
    loadReorderRecommendations();
    loadOptimizationReport();

    // Event listeners
    document.getElementById('product-search').addEventListener('input', debounce(handleProductSearch, 300));
    document.getElementById('refresh-reorder').addEventListener('click', loadReorderRecommendations);
});

// Tab Management
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Load Products for Search
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        if (data.success) {
            productsCache = data.data;
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Product Search Handler
function handleProductSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length < 2) {
        document.getElementById('forecast-results').innerHTML = '';
        return;
    }

    const matches = productsCache.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        (p.sku && p.sku.toLowerCase().includes(searchTerm))
    ).slice(0, 5);

    if (matches.length === 0) {
        document.getElementById('forecast-results').innerHTML = '<p>No products found</p>';
        return;
    }

    displayProductOptions(matches);
}

function displayProductOptions(products) {
    const html = products.map(p => `
        <div class="product-option" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #333;" 
             onclick="loadProductForecast(${p.id}, '${p.name}')">
            <strong>${p.name}</strong>
            <span style="color: #888; margin-left: 10px;">${p.sku || ''}</span>
        </div>
    `).join('');

    document.getElementById('forecast-results').innerHTML = html;
}

// Load Product Forecast
async function loadProductForecast(productId, productName) {
    const resultsDiv = document.getElementById('forecast-results');
    resultsDiv.innerHTML = '<div class="loading">Analyzing demand patterns...</div>';

    try {
        const response = await fetch(`${API_BASE}/demand/${productId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ horizon: 30, lookback: 90 })
        });
        const data = await response.json();

        if (data.success) {
            displayForecast(data.data, productName);
        } else {
            resultsDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error loading forecast:', error);
        resultsDiv.innerHTML = '<p class="error">Failed to load forecast</p>';
    }
}

function displayForecast(forecast, productName) {
    const confidenceClass = forecast.confidence >= 70 ? 'high' : 
                           forecast.confidence >= 40 ? 'medium' : 'low';

    const html = `
        <div style="margin-top: 20px;">
            <div class="prediction-header">
                <h4>${productName}</h4>
                <span class="confidence-badge confidence-${confidenceClass}">
                    ${forecast.confidence}% Confidence
                </span>
            </div>

            <div class="forecast-grid">
                <div class="forecast-metric">
                    <label>30-Day Forecast</label>
                    <div class="value">${forecast.forecast}</div>
                    <small style="color: #888;">units</small>
                </div>

                <div class="forecast-metric">
                    <label>Daily Average</label>
                    <div class="value">${forecast.dailyAverage}</div>
                    <small style="color: #888;">units/day</small>
                </div>

                <div class="forecast-metric">
                    <label>Trend</label>
                    <div class="value" style="font-size: 18px;">
                        ${getTrendEmoji(forecast.trend)} ${forecast.trend}
                    </div>
                </div>

                <div class="forecast-metric">
                    <label>Forecast Range</label>
                    <div class="value" style="font-size: 16px;">
                        ${forecast.confidenceInterval.lower} - ${forecast.confidenceInterval.upper}
                    </div>
                </div>
            </div>

            ${forecast.seasonality.detected ? `
                <div style="background: #252525; padding: 15px; border-radius: 6px; margin-top: 15px;">
                    <strong>🔄 Seasonality Detected</strong>
                    <p style="color: #888; margin: 5px 0;">
                        ${forecast.seasonality.period}-day cycle with ${forecast.seasonality.strength}% strength
                    </p>
                </div>
            ` : ''}

            ${forecast.recommendations.length > 0 ? `
                <div style="margin-top: 15px;">
                    <strong>💡 Recommendations:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        ${forecast.recommendations.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333; color: #888; font-size: 12px;">
                Method: ${forecast.method.replace(/_/g, ' ')} | Historical Average: ${forecast.historicalAverage} units
            </div>
        </div>
    `;

    document.getElementById('forecast-results').innerHTML = html;
}

// Load Reorder Recommendations
async function loadReorderRecommendations() {
    const resultsDiv = document.getElementById('reorder-results');
    resultsDiv.innerHTML = '<div class="loading">Calculating reorder points...</div>';

    try {
        const response = await fetch(`${API_BASE}/reorder-points`);
        const data = await response.json();

        if (data.success) {
            displayReorderRecommendations(data.data);
        } else {
            resultsDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error loading reorder recommendations:', error);
        resultsDiv.innerHTML = '<p class="error">Failed to load recommendations</p>';
    }
}

function displayReorderRecommendations(recommendations) {
    const resultsDiv = document.getElementById('reorder-results');

    if (recommendations.length === 0) {
        resultsDiv.innerHTML = '<p>✅ No products need reordering at this time</p>';
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
                        <td><strong>${r.productName}</strong></td>
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

    try {
        const response = await fetch(`${API_BASE}/optimization/report`);
        const data = await response.json();

        if (data.success) {
            displayOptimizationReport(data.data);
        } else {
            resultsDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error loading optimization report:', error);
        resultsDiv.innerHTML = '<p class="error">Failed to load report</p>';
    }
}

function displayOptimizationReport(report) {
    const html = `
        <div class="forecast-grid" style="margin-bottom: 30px;">
            <div class="forecast-metric">
                <label>Total Inventory Value</label>
                <div class="value">$${report.summary.totalInventoryValue.toFixed(2)}</div>
            </div>
            <div class="forecast-metric">
                <label>Slow-Moving Items</label>
                <div class="value">${report.summary.slowMovingItems}</div>
            </div>
            <div class="forecast-metric">
                <label>Excess Inventory</label>
                <div class="value">$${report.summary.excessInventoryValue.toFixed(2)}</div>
            </div>
            <div class="forecast-metric">
                <label>Potential Savings</label>
                <div class="value" style="color: #4CAF50;">$${report.summary.potentialAnnualSavings.toFixed(2)}</div>
                <small style="color: #888;">per year</small>
            </div>
        </div>

        ${report.topRecommendations.length > 0 ? `
            <h4>🎯 Top Recommendations</h4>
            ${report.topRecommendations.map(rec => `
                <div class="optimization-alert priority-${rec.priority}">
                    <strong>${rec.action}</strong>
                    <p style="margin: 5px 0; color: #888;">${rec.impact}</p>
                    <p style="margin: 5px 0; color: #4CAF50;"><strong>${rec.savings}</strong></p>
                </div>
            `).join('')}
        ` : ''}

        <h4 style="margin-top: 30px;">📈 ABC Classification</h4>
        <div class="abc-grid">
            <div class="abc-card class-a">
                <h3>A</h3>
                <p><strong>${report.abc.classifications.A.count}</strong> products</p>
                <p style="color: #888;">Value: $${report.abc.classifications.A.value.toFixed(2)}</p>
                <small>High-value items requiring tight control</small>
            </div>
            <div class="abc-card class-b">
                <h3>B</h3>
                <p><strong>${report.abc.classifications.B.count}</strong> products</p>
                <p style="color: #888;">Value: $${report.abc.classifications.B.value.toFixed(2)}</p>
                <small>Moderate control and monitoring</small>
            </div>
            <div class="abc-card class-c">
                <h3>C</h3>
                <p><strong>${report.abc.classifications.C.count}</strong> products</p>
                <p style="color: #888;">Value: $${report.abc.classifications.C.value.toFixed(2)}</p>
                <small>Simple reorder systems sufficient</small>
            </div>
        </div>

        ${report.slowMoving.length > 0 ? `
            <h4 style="margin-top: 30px;">🐌 Slow-Moving Inventory (Top 10)</h4>
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
                            <td><strong>${item.name}</strong></td>
                            <td>${item.stock_quantity}</td>
                            <td>$${item.inventory_value.toFixed(2)}</td>
                            <td>${item.daysWithoutMovement}</td>
                            <td style="font-size: 12px; color: #888;">${item.recommendation}</td>
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
