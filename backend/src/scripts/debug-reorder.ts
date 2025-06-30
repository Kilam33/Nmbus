import 'dotenv/config';
import { query, closeDatabase } from '../utils/database';
import { logger } from '../utils/logger';
import { reorderService } from '../services/reorder.service';

const debugReorderAnalysis = async (): Promise<void> => {
  try {
    logger.info('🔍 Debugging reorder analysis...');
    // 1. List all products and their stock
    const allProducts = await query(`
      SELECT p.id, p.name, p.quantity, p.low_stock_threshold, (p.quantity::float / p.low_stock_threshold) as stock_ratio
      FROM products p
      ORDER BY stock_ratio ASC
    `);
    logger.info(`Total products: ${allProducts.rows.length}`);
    allProducts.rows.forEach((p: any) => {
      logger.info(`${p.name}: ${p.quantity}/${p.low_stock_threshold} (${(p.stock_ratio*100).toFixed(1)}%)`);
    });
    // 2. List low stock products
    const lowStock = await query(`
      SELECT p.id, p.name, p.quantity, p.low_stock_threshold
      FROM products p
      WHERE p.quantity <= p.low_stock_threshold
    `);
    logger.info(`Low stock products: ${lowStock.rows.length}`);
    lowStock.rows.forEach((p: any) => {
      logger.info(`LOW: ${p.name}: ${p.quantity}/${p.low_stock_threshold}`);
    });
    // 3. Check existing suggestions before analysis
    const existingSuggestionsBefore = await query(`
      SELECT COUNT(*) as count FROM reorder_suggestions WHERE status = 'pending'
    `);
    logger.info(`Existing pending suggestions before analysis: ${existingSuggestionsBefore.rows[0].count}`);
    // 4. Trigger reorder analysis
    if (lowStock.rows.length > 0) {
      logger.info('Triggering reorder analysis...');
      const job = await reorderService.startAnalysis({ userId: 'debug', scope: 'all', urgencyOnly: false });
      logger.info(`Analysis job started: ${job.id}`);
      
      // Wait a bit for the analysis to complete
      logger.info('Waiting for analysis to complete...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 5. Check if suggestions were created
      const existingSuggestionsAfter = await query(`
        SELECT COUNT(*) as count FROM reorder_suggestions WHERE status = 'pending'
      `);
      logger.info(`Pending suggestions after analysis: ${existingSuggestionsAfter.rows[0].count}`);
      
      // 6. Show recent suggestions
      const recentSuggestions = await query(`
        SELECT id, product_id, urgency, confidence_score, created_at 
        FROM reorder_suggestions 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      logger.info('Recent suggestions:');
      recentSuggestions.rows.forEach((s: any, i: number) => {
        logger.info(`${i+1}. ID: ${s.id}, Urgency: ${s.urgency}, Confidence: ${s.confidence_score}%, Created: ${s.created_at}`);
      });
    } else {
      logger.info('No low stock products, skipping analysis trigger.');
    }
  } catch (e) {
    logger.error('Error in debug script:', e);
  } finally {
    closeDatabase();
  }
};

if (require.main === module) {
  debugReorderAnalysis();
}

export { debugReorderAnalysis }; 