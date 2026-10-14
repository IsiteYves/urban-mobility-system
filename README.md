# Team 1 | New York City Taxi Mobility Analytics Setup

We built an Enterprise-grade fullstack application to analyze NYC taxi mobility patterns. Our application processes 7.6M trips (Jan 2019) to extract 5.4M valid insights.

## Team
- Yves Isite,
- Memory Chungulo
- Viola China
- Esther Konde

## Walkthrough Video
`Link`: [https://youtu.be/C3fjMtyMROg](https://youtu.be/C3fjMtyMROg)

## Setup

**Needed prerequisites:** Python 3.11+, Node.js 18+

### Quick testing (using SQLite for the demo)

```bash
# 1. Install dependencies
pip3 install -r backend/requirements.txt

# 2. Generate & load the 500k sample trips
python3 backend/scripts/generate_sample_data.py
python3 backend/scripts/setup_sqlite.py

# 3. Start backend (Terminal 1)
python3 backend/src/app.py

# 4. Start frontend (Terminal 2)
cd frontend && npm install && npm run dev
```

Dashboard: **http://localhost:3001**

Database: `nyc_taxi.db` auto-created with 500k representative sample trips (realistic patterns, fast setup).

---

### Full Dataset Setup - Option A: for SQLite

Use real 7.6M trip CSV for complete analysis in SQLite:

## 1. Download real data
     Place yellow_tripdata_2019-01.csv in project root
## [Download](https://alueducation.instructure.com/courses/3138/files/581082/download?download_frd=1)

## 2. Load into SQLite
python3 backend/scripts/setup_sqlite.py

## 3. Start servers (same as above)

**The result is**: approximately 5.4M valid trips loaded (71.49% pass validation). Slower queries but no database server needed.

---

### Full Dataset Setup - Option B: with PostgreSQL (+ server setup)

For production or demanding queries:

```bash
# 1. Set PostgreSQL connection
export DATABASE_URL="postgresql://user:pass@localhost/nyc_taxi"

# 2. Download & load real data
# Place yellow_tripdata_2019-01.csv in project root
python3 backend/scripts/setup_sqlite.py  # Auto-detects PostgreSQL via env var

# 3. Start servers (same as above)
```

**Result**: ~5.4M valid trips. Fast queries, requires PostgreSQL server.

---

## Verify

```bash
# Check API health
curl http://localhost:5001/api/health

# Check the database
ls -lh nyc_taxi.db
```
