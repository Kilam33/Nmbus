require('dotenv/config');

console.log('=== Environment Variables Check ===');
console.log('DB_HOST:', process.env.DB_HOST || 'not set');
console.log('DB_PORT:', process.env.DB_PORT || 'not set');
console.log('DB_NAME:', process.env.DB_NAME || 'not set');
console.log('DB_USER:', process.env.DB_USER || 'not set');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[SET]' : 'not set');
console.log('DB_SSL:', process.env.DB_SSL || 'not set');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '[SET]' : 'not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '[SET]' : 'not set');
console.log('==================================='); 