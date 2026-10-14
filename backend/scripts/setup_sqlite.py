#!/usr/bin/env python3
import sqlite3
import csv
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / 'nyc_taxi.db'
# Try real data first, fallback to sample
REAL_CSV = Path(__file__).parent.parent.parent / 'yellow_tripdata_2019-01.csv'
SAMPLE_CSV = Path(__file__).parent.parent.parent / 'yellow_tripdata_2019-01_sample.csv'
CSV_PATH = REAL_CSV if REAL_CSV.exists() else SAMPLE_CSV
ZONES_CSV = Path(__file__).parent.parent.parent / 'taxi_zone_lookup.csv'

def create_tables(conn):
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS trips (
            trip_id INTEGER PRIMARY KEY,
            vendor_id INTEGER,
            pickup_datetime TEXT,
            dropoff_datetime TEXT,
            passenger_count INTEGER,
            trip_distance REAL,
            pu_location_id INTEGER,
            do_location_id INTEGER,
            rate_code_id INTEGER,
            payment_type INTEGER,
            store_and_fwd_flag TEXT,
            fare_amount REAL,
            extra REAL,
            mta_tax REAL,
            tip_amount REAL,
            tolls_amount REAL,
            improvement_surcharge REAL,
            congestion_surcharge REAL,
            total_amount REAL,
            speed_mph REAL,
            fare_per_mile REAL,
            trip_profitability_ratio REAL,
            data_quality_score REAL,
            anomaly_score REAL,
            created_at TEXT,
            processed_at TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS taxi_zones (
            location_id INTEGER PRIMARY KEY,
            borough TEXT,
            zone TEXT,
            service_zone TEXT,
            centroid_lat REAL,
            centroid_lon REAL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS data_quality_log (
            id INTEGER PRIMARY KEY,
            rejection_reason TEXT,
            raw_values TEXT,
            timestamp TEXT
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_trips_datetime ON trips(pickup_datetime)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_trips_pu_zone ON trips(pu_location_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_trips_anomaly ON trips(anomaly_score)')

    conn.commit()

def load_zones(conn, zones_csv):
    cursor = conn.cursor()
    with open(zones_csv, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            cursor.execute('''
                INSERT OR IGNORE INTO taxi_zones
                (location_id, borough, zone, service_zone)
                VALUES (?, ?, ?, ?)
            ''', (
                int(row['LocationID']),
                row['Borough'],
                row['Zone'],
                row['service_zone']
            ))
    conn.commit()

def validate_trip(row):
    try:
        pickup = datetime.strptime(row['tpep_pickup_datetime'], '%Y-%m-%d %H:%M:%S')
        dropoff = datetime.strptime(row['tpep_dropoff_datetime'], '%Y-%m-%d %H:%M:%S')

        if pickup < datetime(2019, 1, 1) or pickup >= datetime(2019, 2, 1):
            return False, 'invalid_date'
        if dropoff < pickup:
            return False, 'dropoff_before_pickup'

        distance = float(row['trip_distance'])
        fare = float(row['fare_amount'])
        total = float(row['total_amount'])

        if distance < 0.01 or distance > 50:
            return False, 'invalid_distance'
        if fare < 0 or total < 0 or total > 500:
            return False, 'invalid_fare'

        vendor = int(row['VendorID'])
        if vendor not in {1, 2}:
            return False, 'invalid_vendor'

        pu_zone = int(row['PULocationID'])
        do_zone = int(row['DOLocationID'])
        if pu_zone < 1 or pu_zone > 265 or do_zone < 1 or do_zone > 265:
            return False, 'invalid_zone'

        passenger = int(row['passenger_count'])
        if passenger < 1 or passenger > 8:
            return False, 'invalid_passenger'

        return True, ''
    except:
        return False, 'parse_error'

def process_trips(conn, csv_path, max_rows=None):
    cursor = conn.cursor()
    valid_count = 0
    rejected_count = 0
    trip_id = 1

    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            if max_rows and idx >= max_rows:
                break

            valid, reason = validate_trip(row)
            if not valid:
                rejected_count += 1
                continue

            try:
                pickup = datetime.strptime(row['tpep_pickup_datetime'], '%Y-%m-%d %H:%M:%S')
                dropoff = datetime.strptime(row['tpep_dropoff_datetime'], '%Y-%m-%d %H:%M:%S')
                duration_hours = (dropoff - pickup).total_seconds() / 3600
                distance = float(row['trip_distance'])
                fare = float(row['fare_amount'])
                tip = float(row.get('tip_amount', 0) or 0)

                speed_mph = min(distance / duration_hours if duration_hours > 0 else 0, 100)
                fare_per_mile = fare / distance if distance > 0.01 else 0
                profitability = (fare + tip) / (1.50 + 0.30 * distance)

                cursor.execute('''
                    INSERT INTO trips (
                        trip_id, vendor_id, pickup_datetime, dropoff_datetime,
                        passenger_count, trip_distance, pu_location_id, do_location_id,
                        rate_code_id, payment_type, store_and_fwd_flag, fare_amount,
                        extra, mta_tax, tip_amount, tolls_amount, improvement_surcharge,
                        congestion_surcharge, total_amount, speed_mph, fare_per_mile,
                        trip_profitability_ratio, data_quality_score, anomaly_score,
                        created_at, processed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    trip_id, int(row['VendorID']), row['tpep_pickup_datetime'],
                    row['tpep_dropoff_datetime'], int(row['passenger_count']),
                    distance, int(row['PULocationID']), int(row['DOLocationID']),
                    int(row['RatecodeID']), int(row['payment_type']),
                    row.get('store_and_fwd_flag', 'N'), fare,
                    float(row.get('extra', 0) or 0), float(row.get('mta_tax', 0) or 0),
                    tip, float(row.get('tolls_amount', 0) or 0),
                    float(row.get('improvement_surcharge', 0) or 0),
                    float(row.get('congestion_surcharge', 0) or 0), float(row['total_amount']),
                    speed_mph, fare_per_mile, profitability, 0.95, 0.0,
                    datetime.now().isoformat(), datetime.now().isoformat()
                ))

                valid_count += 1
                trip_id += 1

                if (idx + 1) % 50000 == 0:
                    print(f"Processed {idx + 1:,} rows - Valid: {valid_count:,}, Rejected: {rejected_count:,}")
                    conn.commit()
            except Exception as e:
                rejected_count += 1

    conn.commit()
    return valid_count, rejected_count

def main():
    if not CSV_PATH.exists():
        print(f"❌ CSV file not found: {CSV_PATH}")
        print("   Download yellow_tripdata_2019-01.csv and place in project root")
        return

    if not ZONES_CSV.exists():
        print(f"❌ Zones CSV not found: {ZONES_CSV}")
        return

    print(f"🗄️  Creating SQLite database: {DB_PATH}")

    if DB_PATH.exists():
        DB_PATH.unlink()
        print("   Removed existing database")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    print("📋 Creating tables...")
    create_tables(conn)

    print("🗺️  Loading zones...")
    load_zones(conn, ZONES_CSV)

    print("📥 Processing trip data...")
    valid, rejected = process_trips(conn, CSV_PATH)

    total = valid + rejected
    acceptance = (valid / total * 100) if total > 0 else 0

    print("\n" + "="*70)
    print(f"✓ Database ready: {DB_PATH}")
    print(f"  Total rows:    {total:,}")
    print(f"  Valid trips:   {valid:,} ({acceptance:.1f}%)")
    print(f"  Rejected:      {rejected:,}")
    print("="*70)

    conn.close()

if __name__ == '__main__':
    main()
