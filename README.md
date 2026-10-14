# Team 1 NYC Taxi Mobility Analytics Platform

We built an enterprise-grade fullstack app (solution) that assists in analyzing urban mobility patterns in NYC taxi data.

## Team
- Yves Isite
- Memory Chungulo
- Viola China
- Esther Konde

## Setup

### Prerequisites (needed)
- PostgreSQL 14+
- Python 3.11+
- Node.js 18+

### 1. PostgreSQL Database

```bash
# Start PostgreSQL
brew services start postgresql

# Create the database
createdb nyc_taxi

# Load schema
psql -d nyc_taxi < backend/db/schema.sql

# Insert vendors
psql -d nyc_taxi -c "INSERT INTO vendors VALUES (1, 'Creative Mobile Technologies'), (2, 'VeriFone Inc')"

# Load zones from CSV (265 zones)
python3 << 'EOF'
import psycopg2
import csv

conn = psycopg2.connect("dbname=nyc_taxi")
cursor = conn.cursor()

with open('taxi_zone_lookup.csv', 'r') as f:
    for row in csv.DictReader(f):
        cursor.execute(
            "INSERT INTO taxi_zones (location_id, borough, zone, service_zone) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
            (int(row['LocationID']), row['Borough'], row['Zone'], row['service_zone'])
        )

conn.commit()
conn.close()
print("✓ Zones loaded")
EOF
```

### 2. Environment Configuration

```bash
# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://localhost/nyc_taxi
FLASK_ENV=development
FLASK_DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://localhost:5001
NEXT_PUBLIC_API_URL=http://localhost:5001/api
EOF
```

### 3. Data Processing

```bash
# Install Python dependencies
pip3 install -r backend/requirements.txt

# Process trip data (7.6M records → 5.4M valid, ~100 min)
python3 backend/scripts/data_processor.py
```

## Launch

### Backend (Terminal 1)
```bash
python3 backend/src/app.py
```
API runs at `http://localhost:5001/api` (ensure port 5001 is free)

### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
Dashboard: `http://localhost:3000`

## Verify

```bash
# Check database
psql -d nyc_taxi -c "SELECT COUNT(*) FROM trips"

# Check API
curl http://localhost:5001/api/health

# Check the running app
# Open http://localhost:3000 in any of your installed browsers
```
