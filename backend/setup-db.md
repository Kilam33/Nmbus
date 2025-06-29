# Database Setup Guide

## Option 1: Use Supabase Database (Recommended)

If you want to use Supabase for both authentication and database:

1. **Update your `.env` file** with Supabase database credentials:
```env
# Database (Supabase)
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-db-password
DB_SSL=true
```

2. **Get your Supabase database credentials**:
   - Go to your Supabase project dashboard
   - Navigate to Settings > Database
   - Copy the connection string or individual credentials

3. **Run the seed script**:
```bash
npm run db:seed
```

## Option 2: Install Local PostgreSQL

### Windows (using Chocolatey)
```bash
# Install PostgreSQL
choco install postgresql

# Start PostgreSQL service
net start postgresql-x64-15

# Create database
createdb -U postgres nimbus
```

### Windows (using Installer)
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with default settings
3. Open pgAdmin or command line
4. Create a database named `nimbus`

### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create database
createdb nimbus
```

### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb nimbus
```

## Option 3: Use Docker for Database Only

If you have Docker installed:

```bash
# Start PostgreSQL and Redis containers
docker-compose up postgres redis -d

# Wait a few seconds for containers to start
sleep 5

# Run the seed script
npm run db:seed
```

## Verify Setup

After setting up the database, run:

```bash
# Test database connection
npm run db:seed

# Start the backend server
npm run dev
```

## Troubleshooting

### Connection Refused Error
- Make sure PostgreSQL is running
- Check if the port 5432 is available
- Verify database credentials in `.env`

### Permission Denied Error
- Check if the database user has proper permissions
- Ensure the database exists

### SSL Connection Error
- For local development, set `DB_SSL=false` in `.env`
- For Supabase, ensure `DB_SSL=true`

## Database Schema

The seed script will create:
- `categories` table with 10 sample categories
- `suppliers` table with 8 sample suppliers
- `products` table with 50 sample products
- `orders` table with 2000 sample orders

All tables include proper indexes and foreign key relationships. 