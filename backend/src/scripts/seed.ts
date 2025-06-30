import 'dotenv/config';
import { query, closeDatabase } from '../utils/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface ReorderSeedData {
  policies: Array<{
    id: string;
    product_id?: string;
    category_id?: string;
    supplier_id?: string;
    min_stock_multiplier: number;
    safety_stock_days: number;
    review_frequency_days: number;
    auto_approve_threshold?: number;
    is_active: boolean;
  }>;
  suggestions: Array<{
    id: string;
    product_id: string;
    supplier_id: string;
    suggested_quantity: number;
    estimated_cost: number;
    urgency: string;
    confidence_score: number;
    reason: string;
    lead_time_days: number;
    status: string;
    expires_at: string;
  }>;
  demandPatterns: Array<{
    id: string;
    product_id: string;
    period_start: string;
    period_end: string;
    avg_daily_demand: number;
    peak_demand: number;
    demand_variance: number;
    seasonality_factor: number;
    trend_factor: number;
  }>;
  history: Array<{
    id: string;
    product_id: string;
    suggested_quantity: number;
    actual_quantity_ordered: number | null;
    suggested_cost: number;
    actual_cost: number | null;
    action_taken: string;
    action_reason: string;
    accuracy_score: number;
    created_at: string;
  }>;
}

const generateReorderPolicies = async (): Promise<ReorderSeedData['policies']> => {
  const policies: ReorderSeedData['policies'] = [];

  // Get some products, categories, and suppliers for policies
  const [productsResult, categoriesResult, suppliersResult] = await Promise.all([
    query('SELECT id FROM products LIMIT 10'),
    query('SELECT id FROM categories LIMIT 5'),
    query('SELECT id FROM suppliers LIMIT 5')
  ]);

  const products = productsResult.rows;
  const categories = categoriesResult.rows;
  const suppliers = suppliersResult.rows;

  // Global default policy
  policies.push({
    id: uuidv4(),
    min_stock_multiplier: 1.5,
    safety_stock_days: 7,
    review_frequency_days: 7,
    auto_approve_threshold: 500,
    is_active: true
  });

  // Category-specific policies
  categories.forEach((category: { id: string }, index: number) => {
    policies.push({
      id: uuidv4(),
      category_id: category.id,
      min_stock_multiplier: 1.2 + (index * 0.1),
      safety_stock_days: 5 + index,
      review_frequency_days: 7,
      auto_approve_threshold: 1000 + (index * 200),
      is_active: true
    });
  });

  // Supplier-specific policies
  suppliers.slice(0, 3).forEach((supplier: { id: string }, index: number) => {
    policies.push({
      id: uuidv4(),
      supplier_id: supplier.id,
      min_stock_multiplier: 1.3 + (index * 0.1),
      safety_stock_days: 10 + index,
      review_frequency_days: 14,
      auto_approve_threshold: 750 + (index * 150),
      is_active: true
    });
  });

  // Product-specific policies
  products.slice(0, 5).forEach((product: { id: string }, index: number) => {
    const policy: ReorderSeedData['policies'][0] = {
      id: uuidv4(),
      product_id: product.id,
      min_stock_multiplier: 2.0 + (index * 0.2),
      safety_stock_days: 14 + index,
      review_frequency_days: 3,
      is_active: true
    };
    
    if (index % 2 === 0) {
      policy.auto_approve_threshold = 300;
    }
    
    policies.push(policy);
  });

  return policies;
};

const generateReorderSuggestions = async (): Promise<ReorderSeedData['suggestions']> => {
  const suggestions: ReorderSeedData['suggestions'] = [];

  // Get low stock products
  const lowStockResult = await query(`
    SELECT 
      p.id as product_id,
      p.name,
      p.price,
      p.quantity,
      p.low_stock_threshold,
      p.supplier_id,
      s.avg_lead_time
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE p.quantity <= p.low_stock_threshold * 1.5
    ORDER BY (p.quantity::float / p.low_stock_threshold) ASC
    LIMIT 20
  `);

  const urgencyLevels = ['critical', 'high', 'medium', 'low'];
  const statusOptions = ['pending', 'approved', 'rejected'];
  const reasons = [
    'Stock level below safety threshold',
    'Predicted stockout in 5 days based on demand forecast',
    'Seasonal demand increase expected',
    'Critical stock level reached',
    'Demand trend is increasing',
    'Lead time considerations require immediate reorder',
    'Safety stock depleted'
  ];

  lowStockResult.rows.forEach((product: any, index: number) => {
    const stockRatio = product.quantity / product.low_stock_threshold;
    const urgency = stockRatio <= 0.3 ? 'critical' : 
                   stockRatio <= 0.6 ? 'high' : 
                   stockRatio <= 0.9 ? 'medium' : 'low';
    
    const suggestedQuantity = Math.max(
      product.low_stock_threshold * 2,
      Math.ceil(product.quantity * 1.5)
    );

    const confidence = Math.max(60, Math.min(95, 85 - (index * 2)));
    const leadTime = product.avg_lead_time || (7 + Math.floor(Math.random() * 14));

    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    const status = index < 15 ? 'pending' : statusOptions[Math.floor(Math.random() * statusOptions.length)];

    suggestions.push({
      id: uuidv4(),
      product_id: product.product_id,
      supplier_id: product.supplier_id,
      suggested_quantity: suggestedQuantity,
      estimated_cost: suggestedQuantity * product.price,
      urgency,
      confidence_score: confidence,
      reason: reason || 'Stock level below safety threshold',
      lead_time_days: leadTime,
      status: status || 'pending',
      expires_at: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString() // 7 days from now
    });
  });

  return suggestions;
};

const generateDemandPatterns = async (): Promise<ReorderSeedData['demandPatterns']> => {
  const patterns: ReorderSeedData['demandPatterns'] = [];

  // Get products with order history
  const productsResult = await query(`
    SELECT DISTINCT p.id
    FROM products p
    INNER JOIN orders o ON p.id = o.product_id
    WHERE o.status = 'completed'
    LIMIT 30
  `);

  const products = productsResult.rows;

  // Generate patterns for the last 12 months
  const now = new Date();
  for (let monthsBack = 0; monthsBack < 12; monthsBack++) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0);

    products.forEach((product: { id: string }, index: number) => {
      // Simulate seasonal patterns
      const month = periodStart.getMonth();
      const seasonalityFactor = 1.0 + Math.sin((month / 12) * 2 * Math.PI) * 0.3;
      
      // Simulate trend
      const trendFactor = 1.0 + (monthsBack * -0.02); // Slight declining trend over time
      
      const baseDemand = 2 + (index % 5); // Base demand varies by product
      const avgDailyDemand = baseDemand * seasonalityFactor * trendFactor;
      const peakDemand = avgDailyDemand * (1.5 + Math.random() * 0.5);
      const variance = avgDailyDemand * (0.2 + Math.random() * 0.3);

      const periodStartStr = periodStart.toISOString().split('T')[0];
      const periodEndStr = periodEnd.toISOString().split('T')[0];

      patterns.push({
        id: uuidv4(),
        product_id: product.id,
        period_start: periodStartStr || '2024-01-01',
        period_end: periodEndStr || '2024-01-31',
        avg_daily_demand: Math.round(avgDailyDemand * 100) / 100,
        peak_demand: Math.round(peakDemand * 100) / 100,
        demand_variance: Math.round(variance * 100) / 100,
        seasonality_factor: Math.round(seasonalityFactor * 100) / 100,
        trend_factor: Math.round(trendFactor * 100) / 100
      });
    });
  }

  return patterns;
};

const generateReorderHistory = async (): Promise<ReorderSeedData['history']> => {
  const history: ReorderSeedData['history'] = [];

  // Get some products for history
  const productsResult = await query('SELECT id FROM products LIMIT 20');
  const products = productsResult.rows;

  const actions = ['approved', 'rejected', 'modified', 'auto_ordered'];
  const reasons = [
    'User approved suggestion',
    'Quantity adjusted based on budget constraints',
    'Alternative supplier selected',
    'Rejected due to overstock concerns',
    'Auto-approved under threshold',
    'Modified quantity based on updated forecast'
  ];

  // Generate history for the last 90 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  for (let i = 0; i < 100; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const suggestedQuantity = 10 + Math.floor(Math.random() * 90);
    const actualQuantity = action === 'approved' ? suggestedQuantity :
                          action === 'modified' ? Math.floor(suggestedQuantity * (0.7 + Math.random() * 0.6)) :
                          action === 'auto_ordered' ? suggestedQuantity : null;
    
    const suggestedCost = suggestedQuantity * (10 + Math.random() * 40);
    const actualCost = actualQuantity ? (actualQuantity / suggestedQuantity) * suggestedCost : null;
    
    // Calculate accuracy score based on action
    let accuracyScore: number;
    if (action === 'approved' || action === 'auto_ordered') {
      accuracyScore = 80 + Math.floor(Math.random() * 20); // 80-100
    } else if (action === 'modified') {
      accuracyScore = 60 + Math.floor(Math.random() * 30); // 60-90
    } else {
      accuracyScore = 30 + Math.floor(Math.random() * 40); // 30-70
    }

    const createdAt = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));

    const actionTaken = action || 'approved';
    const actionReason = reasons[Math.floor(Math.random() * reasons.length)] || 'User approved suggestion';

    history.push({
      id: uuidv4(),
      product_id: product.id,
      suggested_quantity: suggestedQuantity,
      actual_quantity_ordered: actualQuantity,
      suggested_cost: Math.round(suggestedCost * 100) / 100,
      actual_cost: actualCost ? Math.round(actualCost * 100) / 100 : null,
      action_taken: actionTaken,
      action_reason: actionReason,
      accuracy_score: accuracyScore,
      created_at: createdAt.toISOString()
    });
  }

  return history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

const seedReorderData = async (): Promise<void> => {
  try {
    logger.info('Starting reorder data seeding...');

    // Check if reorder data already exists
    const existingPolicies = await query('SELECT COUNT(*) FROM reorder_policies');
    if (parseInt(existingPolicies.rows[0].count) > 0) {
      logger.info('Reorder data already exists. Skipping seed.');
      return;
    }

    // Generate seed data
    logger.info('Generating reorder seed data...');
    const [policies, suggestions, demandPatterns, history] = await Promise.all([
      generateReorderPolicies(),
      generateReorderSuggestions(),
      generateDemandPatterns(),
      generateReorderHistory()
    ]);

    logger.info(`Generated:
      - ${policies.length} reorder policies
      - ${suggestions.length} reorder suggestions
      - ${demandPatterns.length} demand patterns
      - ${history.length} history records`);

    // Insert reorder policies
    logger.info('Inserting reorder policies...');
    for (const policy of policies) {
      await query(`
        INSERT INTO reorder_policies (
          id, product_id, category_id, supplier_id, min_stock_multiplier,
          safety_stock_days, review_frequency_days, auto_approve_threshold, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        policy.id, policy.product_id || null, policy.category_id || null,
        policy.supplier_id || null, policy.min_stock_multiplier,
        policy.safety_stock_days, policy.review_frequency_days,
        policy.auto_approve_threshold || null, policy.is_active
      ]);
    }

    // Insert reorder suggestions
    logger.info('Inserting reorder suggestions...');
    for (const suggestion of suggestions) {
      await query(`
        INSERT INTO reorder_suggestions (
          id, product_id, supplier_id, suggested_quantity, estimated_cost,
          urgency, confidence_score, reason, lead_time_days, status, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
      `, [
        suggestion.id, suggestion.product_id, suggestion.supplier_id,
        suggestion.suggested_quantity, suggestion.estimated_cost, suggestion.urgency,
        suggestion.confidence_score, suggestion.reason, suggestion.lead_time_days,
        suggestion.status, suggestion.expires_at
      ]);
    }

    // Insert demand patterns
    logger.info('Inserting demand patterns...');
    for (const pattern of demandPatterns) {
      await query(`
        INSERT INTO demand_patterns (
          id, product_id, period_start, period_end, avg_daily_demand,
          peak_demand, demand_variance, seasonality_factor, trend_factor, calculated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        pattern.id, pattern.product_id, pattern.period_start, pattern.period_end,
        pattern.avg_daily_demand, pattern.peak_demand, pattern.demand_variance,
        pattern.seasonality_factor, pattern.trend_factor
      ]);
    }

    // Insert reorder history
    logger.info('Inserting reorder history...');
    for (const record of history) {
      await query(`
        INSERT INTO reorder_history (
          id, product_id, suggested_quantity, actual_quantity_ordered,
          suggested_cost, actual_cost, action_taken, action_reason, accuracy_score, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        record.id, record.product_id, record.suggested_quantity,
        record.actual_quantity_ordered, record.suggested_cost, record.actual_cost,
        record.action_taken, record.action_reason, record.accuracy_score, record.created_at
      ]);
    }

    // Insert some forecast accuracy data
    logger.info('Inserting forecast accuracy data...');
    const productsForAccuracy = await query('SELECT id FROM products LIMIT 10');
    
    for (const product of productsForAccuracy.rows) {
      for (let daysBack = 1; daysBack <= 30; daysBack++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() - daysBack);
        
        const forecastedDemand = 1 + Math.random() * 5;
        const actualDemand = forecastedDemand * (0.8 + Math.random() * 0.4); // ±20% variance
        const accuracy = Math.max(50, Math.min(100, 100 - Math.abs(forecastedDemand - actualDemand) / forecastedDemand * 100));

        await query(`
          INSERT INTO forecast_accuracy (
            product_id, forecast_date, forecasted_demand, actual_demand, accuracy_score, model_version, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (product_id, forecast_date, model_version) DO NOTHING
        `, [
          product.id, forecastDate.toISOString().split('T')[0],
          Math.round(forecastedDemand * 100) / 100,
          Math.round(actualDemand * 100) / 100,
          Math.round(accuracy),
          'v1.0' // model_version - shortened to fit VARCHAR(20)
        ]);
      }
    }

    // Insert reorder settings
    logger.info('Inserting reorder settings...');
    await query(`
      INSERT INTO reorder_settings (
        id, auto_reorder_enabled, analysis_frequency_hours, default_confidence_threshold,
        max_auto_approve_amount, notification_email, slack_webhook_url, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [
      uuidv4(),
      true, // auto_reorder_enabled
      24,   // analysis_frequency_hours (daily)
      75,   // default_confidence_threshold
      1000, // max_auto_approve_amount
      'admin@nimbus', // notification_email - shortened to fit VARCHAR(20)
      null, // slack_webhook_url
    ]);

    logger.info('Reorder data seeding completed successfully!');
    logger.info('The reorder system is now ready with realistic test data.');

  } catch (error) {
    logger.error('Reorder data seeding failed:', error);
    throw error;
  }
};

// Run the seeder
if (require.main === module) {
  seedReorderData()
    .then(() => {
      logger.info('Reorder seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Reorder seed script failed:', error);
      process.exit(1);
    })
    .finally(() => {
      closeDatabase();
    });
}

export { seedReorderData };