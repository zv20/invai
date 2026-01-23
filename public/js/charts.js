/**
 * Charts Module
 * Simple chart rendering for dashboard and reports
 * v0.8.0
 */

// Render simple bar chart
function renderBarChart(container, data, options = {}) {
  if (!container || !data) return;
  
  const maxValue = Math.max(...data.map(d => d.value));
  const height = options.height || 200;
  
  container.innerHTML = `
    <div class="bar-chart" style="height: ${height}px;">
      ${data.map(item => `
        <div class="bar-item">
          <div class="bar-container">
            <div class="bar-fill" 
                 style="height: ${(item.value / maxValue) * 100}%; background: ${item.color || '#667eea'};" 
                 title="${item.label}: ${item.value}">
            </div>
          </div>
          <div class="bar-label">${item.label}</div>
          <div class="bar-value">${item.value}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// Render simple pie chart
function renderPieChart(container, data, options = {}) {
  if (!container || !data) return;
  
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = options.colors || ['#667eea', '#f56565', '#48bb78', '#ed8936', '#38b2ac'];
  
  let cumulativePercent = 0;
  
  const segments = data.map((item, i) => {
    const percent = (item.value / total) * 100;
    const rotation = (cumulativePercent / 100) * 360;
    cumulativePercent += percent;
    
    return {
      ...item,
      percent,
      rotation,
      color: item.color || colors[i % colors.length]
    };
  });
  
  container.innerHTML = `
    <div class="pie-chart-container">
      <div class="pie-chart">
        <svg viewBox="0 0 100 100">
          ${segments.map((seg, i) => {
            const angle = (seg.percent / 100) * 360;
            const largeArc = angle > 180 ? 1 : 0;
            const startX = 50 + 50 * Math.cos((seg.rotation - 90) * Math.PI / 180);
            const startY = 50 + 50 * Math.sin((seg.rotation - 90) * Math.PI / 180);
            const endX = 50 + 50 * Math.cos((seg.rotation + angle - 90) * Math.PI / 180);
            const endY = 50 + 50 * Math.sin((seg.rotation + angle - 90) * Math.PI / 180);
            
            return `
              <path d="M 50 50 L ${startX} ${startY} A 50 50 0 ${largeArc} 1 ${endX} ${endY} Z"
                    fill="${seg.color}"
                    stroke="white"
                    stroke-width="1"/>
            `;
          }).join('')}
        </svg>
      </div>
      <div class="pie-legend">
        ${segments.map(seg => `
          <div class="legend-item">
            <span class="legend-color" style="background: ${seg.color};"></span>
            <span class="legend-label">${seg.label}</span>
            <span class="legend-value">${seg.percent.toFixed(1)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Render line chart (simple sparkline)
function renderSparkline(container, data, options = {}) {
  if (!container || !data || data.length === 0) return;
  
  const width = options.width || container.offsetWidth || 100;
  const height = options.height || 40;
  const color = options.color || '#667eea';
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  container.innerHTML = `
    <svg width="${width}" height="${height}" class="sparkline">
      <polyline points="${points}" 
                fill="none" 
                stroke="${color}" 
                stroke-width="2"/>
    </svg>
  `;
}