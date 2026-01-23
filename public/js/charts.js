/**
 * Charts Module
 * Simple chart visualization using HTML/CSS
 * v0.8.0
 */

const Charts = (() => {
  /**
   * Render simple bar chart
   */
  function renderBarChart(data, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { labelKey = 'label', valueKey = 'value', colorKey = 'color' } = options;
    const maxValue = Math.max(...data.map(d => d[valueKey]));

    container.innerHTML = data.map(item => {
      const percentage = (item[valueKey] / maxValue) * 100;
      const color = item[colorKey] || '#3b82f6';

      return `
        <div class="chart-bar">
          <div class="chart-label">${item[labelKey]}</div>
          <div class="chart-bar-bg">
            <div class="chart-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
          </div>
          <div class="chart-value">${item[valueKey]}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render simple pie chart (donut style)
   */
  function renderPieChart(data, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { labelKey = 'label', valueKey = 'value', colorKey = 'color' } = options;
    const total = data.reduce((sum, d) => sum + d[valueKey], 0);

    container.innerHTML = `
      <div class="pie-chart">
        ${data.map(item => {
          const percentage = ((item[valueKey] / total) * 100).toFixed(1);
          const color = item[colorKey] || '#3b82f6';

          return `
            <div class="pie-segment" style="background: ${color}20; border-left: 4px solid ${color};">
              <div class="pie-label">${item[labelKey]}</div>
              <div class="pie-value">${percentage}%</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return {
    renderBarChart,
    renderPieChart
  };
})();

// Make globally available
if (typeof window !== 'undefined') {
  window.Charts = Charts;
}