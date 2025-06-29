import 'dotenv/config';
import { query, closeDatabase } from '../utils/database';
import { logger } from '../utils/logger';

const testDatabaseConnection = async (): Promise<void> => {
  try {
    logger.info('Testing database connection...');
    
    // Test basic connection
    const result = await query('SELECT 1 as test, NOW() as current_time');
    logger.info('✅ Database connection successful');
    logger.info(`Current time: ${result.rows[0].current_time}`);
    
    // Test if we can create a temporary table
    await query('CREATE TEMP TABLE test_table (id SERIAL, name TEXT)');
    await query('INSERT INTO test_table (name) VALUES ($1)', ['test']);
    const testResult = await query('SELECT * FROM test_table');
    logger.info('✅ Database write/read operations successful');
    logger.info(`Test record: ${JSON.stringify(testResult.rows[0])}`);
    
    // Check database version
    const versionResult = await query('SELECT version()');
    logger.info(`Database version: ${versionResult.rows[0].version.split(',')[0]}`);
    
    logger.info('🎉 Database connection test completed successfully!');
    
  } catch (error) {
    logger.error('❌ Database connection test failed');
    if (error instanceof Error) {
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
      
      // Check for common Supabase connection issues
      if (error.message.includes('ECONNREFUSED')) {
        logger.error('🔍 This looks like a connection refused error. Check:');
        logger.error('   - DB_HOST is correct (should be db.your-project-ref.supabase.co)');
        logger.error('   - DB_PORT is 5432');
        logger.error('   - DB_SSL is set to true');
      } else if (error.message.includes('authentication')) {
        logger.error('🔍 This looks like an authentication error. Check:');
        logger.error('   - DB_USER is "postgres"');
        logger.error('   - DB_PASSWORD is correct');
        logger.error('   - DB_NAME is "postgres"');
      } else if (error.message.includes('SSL')) {
        logger.error('🔍 This looks like an SSL error. Make sure DB_SSL=true');
      }
    } else {
      logger.error('Unknown error type:', error);
    }
    throw error;
  }
};

// Run the test
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      logger.info('Test completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Test failed:', error);
      process.exit(1);
    })
    .finally(() => {
      closeDatabase();
    });
}

export { testDatabaseConnection }; 