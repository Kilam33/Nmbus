import { query, transaction } from '@/utils/database';
import { logger } from '@/utils/logger';
import { forecastingAgent } from './forecasting.agent';
import { redisService } from '@/utils/redis';
import { v4 as uuidv4 } from 'uuid';
import { 
  ReorderSuggestion, 
  ReorderFilters, 
  AnalysisJob, 
  SuggestionActionData,
  ReorderPolicy,
  ReorderPolicyFormData,
  ReorderSettings,
  ReorderSettingsFormData
} from '@/types';

class ReorderService {
  async startAnalysis(params: {
    userId: string;
    scope: string;
    targetId?: string;
    urgencyOnly: boolean;
  }): Promise<AnalysisJob> {
    const jobId = uuidv4();
    const estimatedCompletion = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store job status in Redis
    await redisService.set(`reorder:job:${jobId}`, {
      status: 'started',
      userId: params.userId,
      scope: params.scope,
      targetId: params.targetId,
      urgencyOnly: params.urgencyOnly,
      startedAt: new Date().toISOString()
    }, 3600); // 1 hour TTL

    // Start background analysis
    this.runAnalysis(jobId, params).catch(error => {
      logger.error('Reorder analysis failed', { jobId, error: error instanceof Error ? error.message : String(error) });
    });

    return {
      id: jobId,
      estimatedCompletion,
      status: 'started'
    };
  }

  private async runAnalysis(jobId: string, params: any): Promise<void> {
    try {
      await redisService.set(`reorder:job:${jobId}`, { ...params, status: 'running' }, 3600);

      // Get products that need analysis
      const products = await this.getProductsForAnalysis(params);
      
      logger.info(`Starting reorder analysis for ${products.length} products`, { jobId });

      const suggestions: ReorderSuggestion[] = [];

      for (const product of products) {
        try {
          const suggestion = await this.analyzeProduct(product);
          if (suggestion) {
            suggestions.push(suggestion);
          }
        } catch (error) {
          logger.error('Product analysis failed', { 
            productId: product.id, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Save suggestions to database
      await this.saveSuggestions(suggestions);

      // Update job status
      await redisService.set(`reorder:job:${jobId}`, {
        ...params,
        status: 'completed',
        completedAt: new Date().toISOString(),
        suggestionsCount: suggestions.length
      }, 3600);

      logger.info('Reorder analysis completed', { 
        jobId, 
        suggestionsCount: suggestions.length 
      });

    } catch (error) {
      await redisService.set(`reorder:job:${jobId}`, {
        ...params,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        failedAt: new Date().toISOString()
      }, 3600);

      throw error;
    }
  }

  private async getProductsForAnalysis(params: any): Promise<any[]> {
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.scope === 'category' && params.targetId) {
      whereClause += ` AND p.category_id = $${paramIndex}`;
      queryParams.push(params.targetId);
      paramIndex++;
    } else if (params.scope === 'supplier' && params.targetId) {
      whereClause += ` AND p.supplier_id = $${paramIndex}`;
      queryParams.push(params.targetId);
      paramIndex++;
    } else if (params.scope === 'product' && params.targetId) {
      whereClause += ` AND p.id = $${paramIndex}`;
      queryParams.push(params.targetId);
      paramIndex++;
    }

    if (params.urgencyOnly) {
      whereClause += ` AND p.quantity <= p.low_stock_threshold * 1.2`;
    }

    const result = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        s.name as supplier_name,
        s.avg_lead_time,
        s.reliability_score
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ${whereClause}
      ORDER BY (p.quantity::float / p.low_stock_threshold) ASC
    `, queryParams);

    return result.rows;
  }

  private async analyzeProduct(product: any): Promise<ReorderSuggestion | null> {
    // Check if product needs reordering
    const stockRatio = product.quantity / product.low_stock_threshold;
    
    // Get reorder policy for this product
    const policy = await this.getReorderPolicy(product.id, product.category_id, product.supplier_id);
    
    if (stockRatio > policy.min_stock_multiplier) {
      return null; // No reorder needed
    }

    // Get demand forecast
    const forecast = await forecastingAgent.generateForecast(product.id, {
      horizon: 30,
      includeSeasonality: true
    });

    // Calculate suggested quantity
    const suggestedQuantity = await this.calculateOptimalQuantity(product, forecast, policy);
    
    // Sanity checks for suggestedQuantity, estimatedCost, leadTimeDays
    const estimatedCost = suggestedQuantity * product.price;
    const leadTimeDays = product.avg_lead_time || 7;
    if (
      !Number.isFinite(suggestedQuantity) ||
      suggestedQuantity <= 0 ||
      suggestedQuantity > 1000000 ||
      !Number.isFinite(estimatedCost) ||
      estimatedCost < 0 ||
      estimatedCost > 10000000 ||
      !Number.isFinite(leadTimeDays) ||
      leadTimeDays <= 0 ||
      leadTimeDays > 365
    ) {
      logger.error('Sanity check failed for reorder suggestion', {
        productId: product.id,
        suggestedQuantity,
        estimatedCost,
        leadTimeDays,
        forecast,
        product
      });
      return null;
    }

    // Determine urgency
    const urgency = this.determineUrgency(stockRatio, forecast.daysUntilStockout);
    
    // Calculate confidence
    const confidence = await this.calculateConfidence(product.id, forecast);

    // Generate reason
    const reason = this.generateReason(product, forecast, policy);

    // Check if auto-approval should be triggered
    const shouldAutoApprove = await this.shouldAutoApprove(estimatedCost, confidence, policy);

    // Generate UUID properly
    const suggestionId = uuidv4();

    const suggestion: ReorderSuggestion = {
      id: suggestionId,
      product_id: product.id,
      supplier_id: product.supplier_id,
      suggested_quantity: suggestedQuantity,
      estimated_cost: estimatedCost,
      urgency,
      confidence_score: confidence,
      reason,
      lead_time_days: leadTimeDays,
      status: shouldAutoApprove ? 'approved' : 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      created_by_ai: true,
      ai_model_version: '1.0.0',
      product_name: product.name,
      category_name: product.category_name,
      supplier_name: product.supplier_name,
      current_stock: product.quantity,
      min_stock: product.low_stock_threshold
    };

    // If auto-approved, create the order immediately
    if (shouldAutoApprove) {
      try {
        await this.autoApproveSuggestion(suggestion);
        logger.info('Suggestion auto-approved and order created', {
          productId: product.id,
          suggestionId: suggestion.id,
          estimatedCost
        });
      } catch (error) {
        logger.error('Auto-approval failed, setting status to pending', {
          productId: product.id,
          suggestionId: suggestion.id,
          error: error instanceof Error ? error.message : String(error)
        });
        suggestion.status = 'pending';
      }
    }

    return suggestion;
  }

  private async calculateOptimalQuantity(product: any, forecast: any, policy: any): Promise<number> {
    // Base calculation using Economic Order Quantity (EOQ) principles
    const avgDailyDemand = forecast.avgDailyDemand || 1;
    const leadTimeDays = product.avg_lead_time || 7;
    const safetyStockDays = policy.safety_stock_days || 7;
    
    // Lead time demand + safety stock
    const leadTimeDemand = avgDailyDemand * leadTimeDays;
    const safetyStock = avgDailyDemand * safetyStockDays;
    
    // Calculate reorder quantity
    let reorderQuantity = leadTimeDemand + safetyStock;
    
    // Apply policy constraints
    if (policy.preferred_order_quantity) {
      reorderQuantity = policy.preferred_order_quantity;
    } else if (policy.max_order_quantity) {
      reorderQuantity = Math.min(reorderQuantity, policy.max_order_quantity);
    }
    
    // Ensure minimum order
    reorderQuantity = Math.max(reorderQuantity, product.low_stock_threshold);
    
    return Math.ceil(reorderQuantity);
  }

  private determineUrgency(stockRatio: number, daysUntilStockout: number): 'critical' | 'high' | 'medium' | 'low' {
    if (stockRatio <= 0.2 || daysUntilStockout <= 3) return 'critical';
    if (stockRatio <= 0.5 || daysUntilStockout <= 7) return 'high';
    if (stockRatio <= 0.8 || daysUntilStockout <= 14) return 'medium';
    return 'low';
  }

  private async calculateConfidence(productId: string, forecast: any): Promise<number> {
    // Get historical accuracy for this product
    const historicalAccuracy = await this.getHistoricalAccuracy(productId);
    
    // Factor in forecast confidence
    const forecastConfidence = forecast.confidence || 70;
    
    // Data quality assessment
    const dataQuality = await this.assessDataQuality(productId);
    
    // Weighted confidence score
    const confidence = (
      historicalAccuracy * 0.4 +
      forecastConfidence * 0.4 +
      dataQuality * 0.2
    );
    
    return Math.max(50, Math.min(100, Math.round(confidence)));
  }

  private generateReason(product: any, forecast: any, policy: any): string {
    const stockRatio = product.quantity / product.low_stock_threshold;
    const reasons = [];
    
    if (stockRatio <= 0.2) {
      reasons.push('Critical stock level reached');
    } else if (stockRatio <= 0.5) {
      reasons.push('Stock level below safety threshold');
    }
    
    if (forecast.daysUntilStockout <= 7) {
      reasons.push(`Predicted stockout in ${forecast.daysUntilStockout} days`);
    }
    
    if (forecast.trendDirection === 'increasing') {
      reasons.push('Demand trend is increasing');
    }
    
    if (forecast.seasonalityFactor > 1.2) {
      reasons.push('Seasonal demand increase expected');
    }
    
    return reasons.join('. ') || 'Stock level monitoring triggered reorder suggestion';
  }

  async getSuggestions(filters: ReorderFilters): Promise<ReorderSuggestion[]> {
    let whereClause = 'WHERE rs.status = $1';
    const queryParams: any[] = [filters.status || 'pending'];
    let paramIndex = 2;

    if (filters.urgency && filters.urgency !== 'all') {
      whereClause += ` AND rs.urgency = $${paramIndex}`;
      queryParams.push(filters.urgency);
      paramIndex++;
    }

    if (filters.category) {
      whereClause += ` AND p.category_id = $${paramIndex}`;
      queryParams.push(filters.category);
      paramIndex++;
    }

    if (filters.supplier) {
      whereClause += ` AND rs.supplier_id = $${paramIndex}`;
      queryParams.push(filters.supplier);
      paramIndex++;
    }

    if (filters.minConfidence) {
      whereClause += ` AND rs.confidence_score >= $${paramIndex}`;
      queryParams.push(filters.minConfidence);
      paramIndex++;
    }

    const result = await query(`
      SELECT 
        rs.*,
        p.name as product_name,
        p.quantity as current_stock,
        p.low_stock_threshold as min_stock,
        c.name as category_name,
        s.name as supplier_name
      FROM reorder_suggestions rs
      LEFT JOIN products p ON rs.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON rs.supplier_id = s.id
      ${whereClause}
      AND rs.expires_at > NOW()
      ORDER BY 
        CASE rs.urgency 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        rs.confidence_score DESC,
        rs.created_at DESC
    `, queryParams);

    return result.rows;
  }

  async getSuggestionsSummary(filters: ReorderFilters): Promise<any> {
    const result = await query(`
      SELECT 
        COUNT(*) as total_suggestions,
        COUNT(CASE WHEN urgency = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN urgency = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN urgency = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN urgency = 'low' THEN 1 END) as low_count,
        SUM(estimated_cost) as total_estimated_cost,
        AVG(confidence_score) as avg_confidence
      FROM reorder_suggestions 
      WHERE status = 'pending' 
      AND expires_at > NOW()
    `);

    return result.rows[0];
  }

  async processSuggestion(suggestionId: string, params: SuggestionActionData & { userId: string }): Promise<any> {
    return await transaction(async (client) => {
      // Get the suggestion
      const suggestionResult = await client.query(
        'SELECT * FROM reorder_suggestions WHERE id = $1',
        [suggestionId]
      );

      if (suggestionResult.rows.length === 0) {
        throw new Error('Suggestion not found');
      }

      const suggestion = suggestionResult.rows[0];

      if (params.action === 'approve') {
        // Create purchase order
        const order = await this.createPurchaseOrder(client, suggestion, params);
        
        // Update suggestion status
        await client.query(
          'UPDATE reorder_suggestions SET status = $1, updated_at = NOW() WHERE id = $2',
          ['approved', suggestionId]
        );

        // Record in history
        await this.recordSuggestionHistory(client, suggestion, params, order.id);

        return { success: true, orderId: order.id, action: 'approved' };

      } else if (params.action === 'modify') {
        // Update suggestion with modifications
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (params.modifications?.quantity) {
          updates.push(`suggested_quantity = $${paramIndex}`);
          values.push(params.modifications.quantity);
          paramIndex++;
        }

        if (params.modifications?.supplier_id) {
          updates.push(`supplier_id = $${paramIndex}`);
          values.push(params.modifications.supplier_id);
          paramIndex++;
        }

        if (updates.length > 0) {
          updates.push(`updated_at = NOW()`);
          values.push(suggestionId);

          await client.query(
            `UPDATE reorder_suggestions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            values
          );
        }

        // Record in history
        await this.recordSuggestionHistory(client, suggestion, params);

        return { success: true, action: 'modified' };

      } else if (params.action === 'reject') {
        // Update suggestion status
        await client.query(
          'UPDATE reorder_suggestions SET status = $1, updated_at = NOW() WHERE id = $2',
          ['rejected', suggestionId]
        );

        // Record in history
        await this.recordSuggestionHistory(client, suggestion, params);

        return { success: true, action: 'rejected' };
      }

      throw new Error('Invalid action');
    });
  }

  private async createPurchaseOrder(client: any, suggestion: any, params: any): Promise<any> {
    const orderNumber = `AUTO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const result = await client.query(`
      INSERT INTO orders (
        supplier_id, product_id, quantity, status, customer, 
        payment_method, shipping_method, order_number, total, 
        created_at, auto_generated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), true)
      RETURNING *
    `, [
      suggestion.supplier_id,
      suggestion.product_id,
      suggestion.suggested_quantity,
      'pending',
      'NIMBUS Auto-Reorder System',
      'Net 30',
      'Standard',
      orderNumber,
      suggestion.estimated_cost
    ]);

    return result.rows[0];
  }

  private async recordSuggestionHistory(client: any, suggestion: any, params: any, orderId?: string): Promise<void> {
    // Map frontend action values to database action values
    const actionMapping: { [key: string]: string } = {
      'approve': 'approved',
      'reject': 'rejected', 
      'modify': 'modified',
      'auto_ordered': 'auto_ordered'
    };
    
    const dbAction = actionMapping[params.action] || params.action;
    
    await client.query(`
      INSERT INTO reorder_history (
        suggestion_id, product_id, suggested_quantity, actual_quantity_ordered,
        suggested_cost, actual_cost, action_taken, action_reason, user_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      suggestion.id,
      suggestion.product_id,
      suggestion.suggested_quantity,
      params.modifications?.quantity || suggestion.suggested_quantity,
      suggestion.estimated_cost,
      params.modifications?.quantity ? params.modifications.quantity * suggestion.estimated_cost / suggestion.suggested_quantity : suggestion.estimated_cost,
      dbAction,
      params.reason || 'User decision',
      params.userId
    ]);
  }

  private async saveSuggestions(suggestions: ReorderSuggestion[]): Promise<void> {
    if (suggestions.length === 0) return;

    try {
      // Log the first suggestion ID for debugging
      if (suggestions.length > 0) {
        logger.info('Saving suggestions with IDs:', {
          firstId: suggestions[0]!.id,
          totalCount: suggestions.length
        });
      }

      const values = suggestions.map((s, index) => {
        const baseIndex = index * 12;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12})`;
      }).join(', ');

      const params = suggestions.flatMap(s => [
        s.id, s.product_id, s.supplier_id, s.suggested_quantity, s.estimated_cost,
        s.urgency, s.confidence_score, s.reason, s.lead_time_days, s.status,
        s.created_at, s.expires_at
      ]);

      await query(`
        INSERT INTO reorder_suggestions (
          id, product_id, supplier_id, suggested_quantity, estimated_cost,
          urgency, confidence_score, reason, lead_time_days, status,
          created_at, expires_at
        ) VALUES ${values}
        ON CONFLICT (id) DO UPDATE SET
          suggested_quantity = EXCLUDED.suggested_quantity,
          estimated_cost = EXCLUDED.estimated_cost,
          urgency = EXCLUDED.urgency,
          confidence_score = EXCLUDED.confidence_score,
          reason = EXCLUDED.reason,
          updated_at = NOW()
      `, params);

      logger.info(`Successfully saved ${suggestions.length} suggestions`);
    } catch (error) {
      logger.error('Failed to save suggestions', {
        error: error instanceof Error ? error.message : String(error),
        suggestionCount: suggestions.length,
        firstSuggestionId: suggestions[0]?.id || 'unknown'
      });
      throw error;
    }
  }

  private async getReorderPolicy(productId: string, categoryId: string, supplierId: string): Promise<any> {
    // Try to get product-specific policy first
    let result = await query(
      'SELECT * FROM reorder_policies WHERE product_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
      [productId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Try category-specific policy
    result = await query(
      'SELECT * FROM reorder_policies WHERE category_id = $1 AND product_id IS NULL AND is_active = true ORDER BY created_at DESC LIMIT 1',
      [categoryId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Try supplier-specific policy
    result = await query(
      'SELECT * FROM reorder_policies WHERE supplier_id = $1 AND product_id IS NULL AND category_id IS NULL AND is_active = true ORDER BY created_at DESC LIMIT 1',
      [supplierId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Return default policy
    return {
      min_stock_multiplier: 1.5,
      safety_stock_days: 7,
      review_frequency_days: 7,
      auto_approve_threshold: null,
      max_order_quantity: null,
      preferred_order_quantity: null
    };
  }

  private async getHistoricalAccuracy(productId: string): Promise<number> {
    const result = await query(`
      SELECT AVG(accuracy_score) as avg_accuracy
      FROM reorder_history 
      WHERE product_id = $1 
      AND accuracy_score IS NOT NULL
      AND created_at >= NOW() - INTERVAL '90 days'
    `, [productId]);

    return result.rows[0]?.avg_accuracy || 75; // Default to 75% if no history
  }

  private async assessDataQuality(productId: string): Promise<number> {
    const result = await query(`
      SELECT 
        COUNT(*) as order_count,
        COUNT(DISTINCT DATE_TRUNC('month', created_at)) as months_with_data
      FROM orders 
      WHERE product_id = $1 
      AND created_at >= NOW() - INTERVAL '12 months'
      AND status = 'completed'
    `, [productId]);

    const { order_count, months_with_data } = result.rows[0];
    
    // Score based on data availability
    let score = 50; // Base score
    
    if (order_count >= 12) score += 20; // Good order frequency
    if (months_with_data >= 6) score += 20; // Good time coverage
    if (order_count >= 24) score += 10; // Excellent order frequency
    
    return Math.min(100, score);
  }

  async getPolicies(): Promise<ReorderPolicy[]> {
    const result = await query(`
      SELECT 
        rp.*,
        p.name as product_name,
        c.name as category_name,
        s.name as supplier_name
      FROM reorder_policies rp
      LEFT JOIN products p ON rp.product_id = p.id
      LEFT JOIN categories c ON rp.category_id = c.id
      LEFT JOIN suppliers s ON rp.supplier_id = s.id
      WHERE rp.is_active = true
      ORDER BY 
        CASE 
          WHEN rp.product_id IS NOT NULL THEN 1
          WHEN rp.category_id IS NOT NULL THEN 2
          WHEN rp.supplier_id IS NOT NULL THEN 3
          ELSE 4
        END,
        rp.created_at DESC
    `);

    return result.rows;
  }

  async createPolicy(policyData: ReorderPolicyFormData & { createdBy: string }): Promise<ReorderPolicy> {
    const result = await query(`
      INSERT INTO reorder_policies (
        product_id, category_id, supplier_id, min_stock_multiplier,
        max_order_quantity, preferred_order_quantity, safety_stock_days,
        review_frequency_days, auto_approve_threshold, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `, [
      policyData.product_id || null,
      policyData.category_id || null,
      policyData.supplier_id || null,
      policyData.min_stock_multiplier,
      policyData.max_order_quantity || null,
      policyData.preferred_order_quantity || null,
      policyData.safety_stock_days,
      policyData.review_frequency_days,
      policyData.auto_approve_threshold || null,
      policyData.is_active
    ]);

    return result.rows[0];
  }

  async getAutoOrders(filters: any): Promise<any[]> {
    let whereClause = 'WHERE o.auto_generated = true';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }

    if (filters.dateFrom) {
      whereClause += ` AND o.created_at >= $${paramIndex}`;
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      whereClause += ` AND o.created_at <= $${paramIndex}`;
      queryParams.push(filters.dateTo);
      paramIndex++;
    }

    const result = await query(`
      SELECT 
        o.*,
        p.name as product_name,
        s.name as supplier_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `, queryParams);

    return result.rows;
  }

  async getSettings(): Promise<ReorderSettings> {
    const result = await query(`
      SELECT * FROM reorder_settings 
      WHERE id = 'global' 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Return default settings
      return {
        id: 'global',
        auto_reorder_enabled: false,
        analysis_frequency_hours: 24,
        default_confidence_threshold: 70,
        max_auto_approve_amount: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return result.rows[0];
  }

  async updateSettings(settings: ReorderSettingsFormData, userId: string): Promise<ReorderSettings> {
    const result = await query(`
      INSERT INTO reorder_settings (
        id, auto_reorder_enabled, analysis_frequency_hours,
        default_confidence_threshold, max_auto_approve_amount,
        updated_by, updated_at
      ) VALUES ('global', $1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        auto_reorder_enabled = EXCLUDED.auto_reorder_enabled,
        analysis_frequency_hours = EXCLUDED.analysis_frequency_hours,
        default_confidence_threshold = EXCLUDED.default_confidence_threshold,
        max_auto_approve_amount = EXCLUDED.max_auto_approve_amount,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `, [
      settings.auto_reorder_enabled,
      settings.analysis_frequency_hours,
      settings.default_confidence_threshold,
      settings.max_auto_approve_amount,
      userId
    ]);

    return result.rows[0];
  }

  private async shouldAutoApprove(estimatedCost: number, confidence: number, policy: any): Promise<boolean> {
    // Get global settings
    const settings = await this.getSettings();
    
    if (!settings.auto_reorder_enabled) {
      return false;
    }

    // Check if cost is within auto-approve threshold
    const maxAutoApproveAmount = settings.max_auto_approve_amount || 1000;
    if (estimatedCost > maxAutoApproveAmount) {
      return false;
    }

    // Check if confidence meets threshold
    const confidenceThreshold = settings.default_confidence_threshold || 70;
    if (confidence < confidenceThreshold) {
      return false;
    }

    // Check policy-specific auto-approve threshold
    if (policy.auto_approve_threshold && estimatedCost > policy.auto_approve_threshold) {
      return false;
    }

    return true;
  }

  private async autoApproveSuggestion(suggestion: ReorderSuggestion): Promise<void> {
    return await transaction(async (client) => {
      // Create purchase order
      const order = await this.createPurchaseOrder(client, suggestion, {
        action: 'approve',
        reason: 'Auto-approved based on threshold criteria',
        userId: 'system'
      });
      
      // Update suggestion status
      await client.query(
        'UPDATE reorder_suggestions SET status = $1, updated_at = NOW() WHERE id = $2',
        ['approved', suggestion.id]
      );

      // Record in history
      await this.recordSuggestionHistory(client, suggestion, {
        action: 'auto_ordered',
        reason: 'Auto-approved based on threshold criteria',
        userId: 'system'
      }, order.id);

      logger.info('Auto-approval completed', {
        suggestionId: suggestion.id,
        orderId: order.id,
        estimatedCost: suggestion.estimated_cost
      });
    });
  }
}

export const reorderService = new ReorderService();