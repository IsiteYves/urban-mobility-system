# Team 1 NYC Taxi Mobility Analytics Platform

We built an enterprise-grade fullstack app (solution) that assists in analyzing urban mobility patterns in NYC taxi data.

## Team
- Yves Isite
- Memory Chungulo
- Viola China
- Esther Konde

## Walkthrough Video
`Link`: [https://youtu.be/C3fjMtyMROg](https://youtu.be/C3fjMtyMROg)

## Setup

### Prerequisites (needed)
- PostgreSQL 14+
- Python 3.11+
- Node.js 18+

### Data Files Required
Then, download and place these files in project root:

1. **yellow_tripdata_2019-01.csv** (7.6M trips, ~687MB)
   - [Download here](https://alueducation.instructure.com/courses/3138/files/581082/download?download_frd=1)
   - Save as: `yellow_tripdata_2019-01.csv` (in project root)
   - Contains: Raw taxi trip data (pickup/dropoff times, locations, fares, passengers)
   
2. **taxi_zone_lookup.csv** (included in repository)
   - Already present in root directory

### 1. PostgreSQL Database

```bash
# Start PostgreSQL
brew services start postgresql

# Create the database
createdb nyc_taxi

# Load the database schema
psql -d nyc_taxi < backend/db/schema.sql

# Insert vendors
psql -d nyc_taxi -c "INSERT INTO vendors VALUES (1, 'Creative Mobile Technologies'), (2, 'VeriFone Inc')"

# Load zones from taxi_zone_lookup.csv (265 zones)
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
# Install Python dependencies of this project
pip3 install -r backend/requirements.txt

# Process trip data: validates, cleans, engineers features, loads to database
# The input is: yellow_tripdata_2019-01.csv (7.6M records)
# The output: 5.4M valid trips in database (71.49% pass validation)
# Runtime: ~100 minutes | RAM: ~800MB
python3 backend/scripts/data_processor.py
```

**What this does**: It chunks CSV, validates temporal/numeric/categorical data, engineers 3 features (speed_mph, fare_per_mile, profitability_ratio), detects anomalies, batch inserts to PostgreSQL. Rejects records with fare mismatches, invalid zones, out-of-range dates.

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
# After data processing is completed:
psql -d nyc_taxi -c "SELECT COUNT(*) FROM trips"
# What to expect: ~5.4M records (if processing finished)

# Check API health
curl http://localhost:5001/api/health

# Check the dashboard at http://localhost:3000 in any of your PC's browsers
# It should show: around 5.4M trips, stat cards with fares/speed, hourly chart
```
