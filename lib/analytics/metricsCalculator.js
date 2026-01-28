/**
 * Metrics Calculator - Sprint 5 Phase 1
 * 
 * Statistical calculations for inventory metrics
 */

class MetricsCalculator {
  /**
   * Calculate inventory turnover ratio
   * Higher is better (inventory moves faster)
   */
  static inventoryTurnover(costOfGoodsSold, averageInventoryValue) {
    if (averageInventoryValue === 0) return 0;
    return costOfGoodsSold / averageInventoryValue;
  }

  /**
   * Calculate days inventory outstanding (DIO)
   * Also called "days on hand"
   */
  static daysInventoryOutstanding(averageInventory, costOfGoodsSold, days = 365) {
    if (costOfGoodsSold === 0) return 0;
    return (averageInventory / costOfGoodsSold) * days;
  }

  /**
   * Calculate stockout rate
   */
  static stockoutRate(stockoutDays, totalDays) {
    if (totalDays === 0) return 0;
    return (stockoutDays / totalDays) * 100;
  }

  /**
   * Calculate fill rate
   */
  static fillRate(ordersF illed, totalOrders) {
    if (totalOrders === 0) return 0;
    return (ordersFilled / totalOrders) * 100;
  }

  /**
   * Calculate carrying cost percentage
   * Typical range: 20-30% of inventory value per year
   */
  static carryingCost(inventoryValue, carryingCostRate = 0.25) {
    return inventoryValue * carryingCostRate;
  }

  /**
   * Calculate economic order quantity (EOQ)
   * Optimal order quantity to minimize costs
   */
  static economicOrderQuantity(annualDemand, orderCost, holdingCostPerUnit) {
    if (holdingCostPerUnit === 0) return 0;
    return Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
  }

  /**
   * Calculate reorder point
   * When to reorder based on lead time and safety stock
   */
  static reorderPoint(averageDailyUsage, leadTimeDays, safetyStock = 0) {
    return (averageDailyUsage * leadTimeDays) + safetyStock;
  }

  /**
   * Calculate safety stock
   * Buffer to prevent stockouts
   */
  static safetyStock(maxDailyUsage, avgDailyUsage, maxLeadTime, avgLeadTime) {
    return (maxDailyUsage * maxLeadTime) - (avgDailyUsage * avgLeadTime);
  }

  /**
   * Calculate gross margin
   */
  static grossMargin(revenue, costOfGoodsSold) {
    if (revenue === 0) return 0;
    return ((revenue - costOfGoodsSold) / revenue) * 100;
  }

  /**
   * Calculate inventory accuracy
   */
  static inventoryAccuracy(actualCount, systemCount) {
    if (systemCount === 0) return 0;
    const variance = Math.abs(actualCount - systemCount);
    return ((systemCount - variance) / systemCount) * 100;
  }

  /**
   * Calculate ABC classification score
   * A items: top 80% of value, B: next 15%, C: remaining 5%
   */
  static abcClassification(itemValue, totalValue) {
    const percentage = (itemValue / totalValue) * 100;
    
    if (percentage >= 80) return 'A';
    if (percentage >= 15) return 'B';
    return 'C';
  }

  /**
   * Calculate service level
   * Probability of not having a stockout
   */
  static serviceLevel(demand, standardDeviation, zScore = 1.65) {
    // z-score of 1.65 = 95% service level
    return demand + (zScore * standardDeviation);
  }

  /**
   * Calculate shrinkage rate
   * Loss due to theft, damage, etc.
   */
  static shrinkageRate(expectedInventory, actualInventory) {
    if (expectedInventory === 0) return 0;
    return ((expectedInventory - actualInventory) / expectedInventory) * 100;
  }

  /**
   * Calculate dead stock percentage
   * Inventory with no movement in X days
   */
  static deadStockPercentage(deadStockValue, totalInventoryValue) {
    if (totalInventoryValue === 0) return 0;
    return (deadStockValue / totalInventoryValue) * 100;
  }

  /**
   * Calculate inventory valuation
   */
  static inventoryValuation(quantity, unitCost) {
    return quantity * unitCost;
  }

  /**
   * Calculate average inventory
   */
  static averageInventory(beginningInventory, endingInventory) {
    return (beginningInventory + endingInventory) / 2;
  }

  /**
   * Calculate compound annual growth rate (CAGR)
   */
  static cagr(beginningValue, endingValue, years) {
    if (beginningValue === 0 || years === 0) return 0;
    return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
  }
}

module.exports = MetricsCalculator;