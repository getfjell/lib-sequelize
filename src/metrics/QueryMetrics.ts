import LibLogger from '../logger';

const logger = LibLogger.get('sequelize', 'metrics', 'QueryMetrics');

/**
 * Tracks query execution metrics for Sequelize operations
 */
export class QueryMetrics {
  private totalQueryCount: number = 0;
  private queriesByModel: Map<string, number> = new Map();
  private readonly LOG_INTERVAL: number = 10;

  /**
   * Records a query execution for a given model
   * @param modelName - The name of the Sequelize model the query was executed against
   */
  recordQuery(modelName: string): void {
    this.totalQueryCount++;
    
    // Track queries per model
    const currentCount = this.queriesByModel.get(modelName) || 0;
    this.queriesByModel.set(modelName, currentCount + 1);

    // Log DEBUG message every 10 queries
    if (this.totalQueryCount % this.LOG_INTERVAL === 0) {
      const modelBreakdown = Array.from(this.queriesByModel.entries())
        .map(([model, count]) => `${model}: ${count}`)
        .join(', ');
      
      logger.debug(
        `Query execution count: ${this.totalQueryCount} total queries. ` +
        `Breakdown by model: ${modelBreakdown || 'none'}`
      );
    }
  }

  /**
   * Gets the total number of queries executed
   */
  getTotalQueryCount(): number {
    return this.totalQueryCount;
  }

  /**
   * Gets the number of queries executed for a specific model
   */
  getQueryCountForModel(modelName: string): number {
    return this.queriesByModel.get(modelName) || 0;
  }

  /**
   * Gets a map of all model query counts
   */
  getQueriesByModel(): Map<string, number> {
    return new Map(this.queriesByModel);
  }

  /**
   * Resets all metrics (useful for testing)
   */
  reset(): void {
    this.totalQueryCount = 0;
    this.queriesByModel.clear();
  }
}

// Export a singleton instance
export const queryMetrics = new QueryMetrics();

