// Charts Module
// Visualization using Chart.js (to be added as dependency)

const Charts = {
  categoryChart: null,

  async renderCategoryDistribution() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;

    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();

      // For now, use simple HTML bars until Chart.js is added
      const container = canvas.parentElement;
      const total = data.categoryBreakdown.reduce((sum, cat) => sum + cat.count, 0);

      const html = `
        <div class="chart-bars">
          ${data.categoryBreakdown.map(cat => {
            const percent = (cat.count / total * 100).toFixed(1);
            return `
              <div class="chart-bar">
                <div class="chart-bar-label">${cat.category}</div>
                <div class="chart-bar-container">
                  <div class="chart-bar-fill" style="width: ${percent}%"></div>
                  <span class="chart-bar-value">${cat.count} (${percent}%)</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      container.innerHTML = html;
    } catch (error) {
      console.error('Error rendering category chart:', error);
    }
  },

  async renderExpiryTimeline() {
    const container = document.getElementById('expiryTimeline');
    if (!container) return;

    try {
      const response = await fetch('/api/dashboard/expiration-alerts');
      const data = await response.json();

      const html = `
        <div class="timeline">
          <div class="timeline-section expired">
            <div class="timeline-label">Expired</div>
            <div class="timeline-count">${data.expired.length}</div>
          </div>
          <div class="timeline-section urgent">
            <div class="timeline-label">7 Days</div>
            <div class="timeline-count">${data.urgent.length}</div>
          </div>
          <div class="timeline-section soon">
            <div class="timeline-label">30 Days</div>
            <div class="timeline-count">${data.soon.length}</div>
          </div>
          <div class="timeline-section ok">
            <div class="timeline-label">Safe</div>
            <div class="timeline-count">✓</div>
          </div>
        </div>
      `;

      container.innerHTML = html;
    } catch (error) {
      console.error('Error rendering expiry timeline:', error);
    }
  }
};
