/**
 * Chart Generator - Sprint 5 Phase 1
 * 
 * Generates Chart.js compatible data structures
 */

class ChartGenerator {
  /**
   * Generate turnover chart data (bar chart)
   */
  static turnoverChart(data, limit = 10) {
    const topProducts = data
      .sort((a, b) => b.turnoverRatio - a.turnoverRatio)
      .slice(0, limit);

    return {
      type: 'bar',
      data: {
        labels: topProducts.map(p => p.productName),
        datasets: [{
          label: 'Turnover Ratio',
          data: topProducts.map(p => p.turnoverRatio),
          backgroundColor: topProducts.map(p => this.getPerformanceColor(p.performance)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Inventory Turnover Ratio (Top 10)' },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Turnover Ratio' } }
        }
      }
    };
  }

  /**
   * Generate stock trend chart (line chart)
   */
  static stockTrendChart(data) {
    return {
      type: 'line',
      data: {
        labels: data.map(d => new Date(d.date).toLocaleDateString()),
        datasets: [
          {
            label: 'Stock Added',
            data: data.map(d => d.totalAdditions),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.3
          },
          {
            label: 'Stock Depleted',
            data: data.map(d => d.totalDepletions),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Stock Level Trends (Last 30 Days)' },
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Quantity' } }
        }
      }
    };
  }

  /**
   * Generate category value chart (doughnut chart)
   */
  static categoryValueChart(data) {
    return {
      type: 'doughnut',
      data: {
        labels: data.map(c => c.category),
        datasets: [{
          data: data.map(c => c.total_value),
          backgroundColor: this.generateColors(data.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Inventory Value by Category' },
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: $${value.toFixed(2)}`;
              }
            }
          }
        }
      }
    };
  }

  /**
   * Generate expiration timeline chart (bar chart)
   */
  static expirationTimelineChart(data) {
    return {
      type: 'bar',
      data: {
        labels: data.map(d => new Date(d.expiry_date).toLocaleDateString()),
        datasets: [{
          label: 'Expiring Items',
          data: data.map(d => d.total_items),
          backgroundColor: data.map(d => this.getUrgencyColor(d.urgency)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Expiration Timeline (Next 90 Days)' },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Items' } }
        }
      }
    };
  }

  /**
   * Generate usage pattern chart (bar chart)
   */
  static usagePatternChart(data) {
    return {
      type: 'bar',
      data: {
        labels: data.map(d => d.day_of_week),
        datasets: [{
          label: 'Items Used',
          data: data.map(d => d.total_quantity),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Usage Patterns by Day of Week' },
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Quantity' } }
        }
      }
    };
  }

  /**
   * Generate velocity chart (horizontal bar)
   */
  static velocityChart(data, limit = 15) {
    const topProducts = data.slice(0, limit);

    return {
      type: 'horizontalBar',
      data: {
        labels: topProducts.map(p => p.name),
        datasets: [{
          label: 'Units Moved',
          data: topProducts.map(p => p.units_moved),
          backgroundColor: topProducts.map(p => this.getVelocityColor(p.velocity)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          title: { display: true, text: 'Product Velocity (Top 15)' },
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true, title: { display: true, text: 'Units Moved (30 Days)' } }
        }
      }
    };
  }

  /**
   * Helper: Get color based on performance
   */
  static getPerformanceColor(performance) {
    const colors = {
      excellent: 'rgba(34, 197, 94, 0.6)',   // Green
      good: 'rgba(59, 130, 246, 0.6)',       // Blue
      fair: 'rgba(251, 191, 36, 0.6)',       // Yellow
      poor: 'rgba(239, 68, 68, 0.6)'         // Red
    };
    return colors[performance] || colors.fair;
  }

  /**
   * Helper: Get color based on urgency
   */
  static getUrgencyColor(urgency) {
    const colors = {
      critical: 'rgba(239, 68, 68, 0.8)',    // Red
      warning: 'rgba(251, 191, 36, 0.8)',    // Yellow
      normal: 'rgba(34, 197, 94, 0.8)'       // Green
    };
    return colors[urgency] || colors.normal;
  }

  /**
   * Helper: Get color based on velocity
   */
  static getVelocityColor(velocity) {
    const colors = {
      fast: 'rgba(34, 197, 94, 0.6)',        // Green
      medium: 'rgba(59, 130, 246, 0.6)',     // Blue
      slow: 'rgba(239, 68, 68, 0.6)'         // Red
    };
    return colors[velocity] || colors.medium;
  }

  /**
   * Generate an array of colors
   */
  static generateColors(count) {
    const baseColors = [
      'rgba(255, 99, 132, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)',
      'rgba(199, 199, 199, 0.6)',
      'rgba(83, 102, 255, 0.6)',
      'rgba(40, 159, 64, 0.6)',
      'rgba(210, 199, 199, 0.6)'
    ];

    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }
}

module.exports = ChartGenerator;