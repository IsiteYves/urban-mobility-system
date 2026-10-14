import pandas as pd
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from src.utils.db import Database
from src.config import Config

class TripDataProcessor:
    def __init__(self, db: Database, chunk_size: int = 100000):
        self.db = db
        self.chunk_size = chunk_size
        self.stats = {'total': 0, 'valid': 0, 'rejected': 0, 'by_reason': {}}
        self.zone_ids = set()
        self.vendors = {1, 2}
        self.rate_codes = {1, 2, 3, 4, 5, 99}
        self.payment_types = {1, 2, 3, 4}

    def load_zone_dimensions(self):
        import csv
        csv_path = '/Users/mac/Desktop/projects/analytical/taxi_zone_lookup.csv'
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            self.zone_ids = {int(row['LocationID']) for row in reader}
        print(f"✓ Loaded {len(self.zone_ids)} zones")

    def validate_temporal(self, row: pd.Series) -> tuple[bool, str]:
        try:
            pickup = pd.to_datetime(row['tpep_pickup_datetime'])
            dropoff = pd.to_datetime(row['tpep_dropoff_datetime'])
        except:
            return False, 'temporal_parse_error'

        jan_start = pd.Timestamp('2019-01-01')
        feb_start = pd.Timestamp('2019-02-01')

        if not (jan_start <= pickup < feb_start):
            return False, 'pickup_date_out_of_range'
        if not (jan_start <= dropoff < feb_start):
            return False, 'dropoff_date_out_of_range'
        if dropoff < pickup:
            return False, 'dropoff_before_pickup'

        return True, ''

    def validate_numeric(self, row: pd.Series) -> tuple[bool, str]:
        try:
            distance = float(row['trip_distance'])
            fare = float(row['fare_amount'])
            total = float(row['total_amount'])
            passenger = int(row['passenger_count']) if pd.notna(row['passenger_count']) else 1
        except (ValueError, TypeError):
            return False, 'numeric_conversion_error'

        if distance < 0.01:
            return False, 'zero_distance'
        if distance > 50:
            return False, 'unrealistic_distance'
        if fare < 0:
            return False, 'negative_fare'
        if total < 0:
            return False, 'negative_total'
        if total > 500:
            return False, 'excessive_total'
        if passenger < 1 or passenger > 8:
            return False, 'invalid_passenger_count'

        extra = float(row.get('extra', 0)) or 0
        mta = float(row.get('mta_tax', 0)) or 0
        tolls = float(row.get('tolls_amount', 0)) or 0
        surcharge = float(row.get('improvement_surcharge', 0)) or 0
        congestion = float(row.get('congestion_surcharge', 0)) or 0

        calc_total = fare + extra + mta + tolls + surcharge + congestion
        if abs(calc_total - total) > 0.01:
            return False, 'fare_breakdown_mismatch'

        return True, ''

    def validate_categorical(self, row: pd.Series) -> tuple[bool, str]:
        if int(row['VendorID']) not in self.vendors:
            return False, 'invalid_vendor'
        if int(row.get('RatecodeID', 1)) not in self.rate_codes:
            return False, 'invalid_rate_code'
        if int(row.get('payment_type', 1)) not in self.payment_types:
            return False, 'invalid_payment_type'

        pu = int(row['PULocationID'])
        do = int(row['DOLocationID'])
        if pu not in self.zone_ids or do not in self.zone_ids:
            return False, 'invalid_location_id'

        return True, ''

    def engineer_features(self, row: pd.Series) -> dict:
        pickup = pd.to_datetime(row['tpep_pickup_datetime'])
        dropoff = pd.to_datetime(row['tpep_dropoff_datetime'])
        duration_hours = (dropoff - pickup).total_seconds() / 3600
        distance = float(row['trip_distance'])
        fare = float(row['fare_amount'])
        tip = float(row.get('tip_amount', 0)) or 0

        speed_mph = distance / duration_hours if duration_hours > 0 else 0
        fare_per_mile = fare / distance if distance > 0.01 else 0

        base_cost = 1.50
        operational_cost = base_cost + (0.30 * distance)
        revenue = fare + tip
        profitability = revenue / operational_cost if operational_cost > 0 else 0

        return {
            'speed_mph': round(min(speed_mph, 100), 2),
            'fare_per_mile': round(fare_per_mile, 2),
            'trip_profitability_ratio': round(profitability, 3),
            'duration_minutes': round((dropoff - pickup).total_seconds() / 60, 1)
        }

    def calculate_quality_score(self, row: pd.Series, features: dict) -> int:
        score = 10

        if features['speed_mph'] > 40:
            score -= 2
        if features['speed_mph'] < 1:
            score -= 1
        if features['fare_per_mile'] > 10:
            score -= 1
        if float(row.get('tip_amount', 0)) == 0 and int(row.get('payment_type', 1)) == 1:
            score -= 1

        return max(1, score)

    def process_chunk(self, chunk: pd.DataFrame, start_row: int) -> tuple[list, int]:
        valid_trips = []
        rejected = 0

        with self.db.get_connection() as conn:
            for idx, row in chunk.iterrows():
                source_row = start_row + idx

                valid, reason = self.validate_temporal(row)
                if not valid:
                    self._log_rejection(conn, source_row, reason, row.to_dict())
                    self.stats['by_reason'][reason] = self.stats['by_reason'].get(reason, 0) + 1
                    rejected += 1
                    continue

                valid, reason = self.validate_numeric(row)
                if not valid:
                    self._log_rejection(conn, source_row, reason, row.to_dict())
                    self.stats['by_reason'][reason] = self.stats['by_reason'].get(reason, 0) + 1
                    rejected += 1
                    continue

                valid, reason = self.validate_categorical(row)
                if not valid:
                    self._log_rejection(conn, source_row, reason, row.to_dict())
                    self.stats['by_reason'][reason] = self.stats['by_reason'].get(reason, 0) + 1
                    rejected += 1
                    continue

                features = self.engineer_features(row)
                quality = self.calculate_quality_score(row, features)

                trip = {
                    'vendor_id': int(row['VendorID']),
                    'pickup_datetime': pd.to_datetime(row['tpep_pickup_datetime']),
                    'dropoff_datetime': pd.to_datetime(row['tpep_dropoff_datetime']),
                    'passenger_count': int(row.get('passenger_count', 1)) or 1,
                    'trip_distance': float(row['trip_distance']),
                    'pu_location_id': int(row['PULocationID']),
                    'do_location_id': int(row['DOLocationID']),
                    'rate_code_id': int(row.get('RatecodeID', 1)) or 1,
                    'payment_type': int(row.get('payment_type', 1)) or 1,
                    'store_and_fwd_flag': row.get('store_and_fwd_flag', 'N'),
                    'fare_amount': float(row['fare_amount']),
                    'extra': float(row.get('extra', 0)) or 0,
                    'mta_tax': float(row.get('mta_tax', 0)) or 0,
                    'tip_amount': float(row.get('tip_amount', 0)) or 0,
                    'tolls_amount': float(row.get('tolls_amount', 0)) or 0,
                    'improvement_surcharge': float(row.get('improvement_surcharge', 0)) or 0,
                    'congestion_surcharge': float(row.get('congestion_surcharge', 0)) or 0,
                    'total_amount': float(row['total_amount']),
                    'speed_mph': features['speed_mph'],
                    'fare_per_mile': features['fare_per_mile'],
                    'trip_profitability_ratio': features['trip_profitability_ratio'],
                    'data_quality_score': quality,
                    'anomaly_score': 0
                }
                valid_trips.append(trip)

        return valid_trips, rejected

    def _log_rejection(self, conn, source_row_num: int, reason: str, raw_values: dict):
        self.db.log_rejection(conn, source_row_num, reason, {k: str(v) for k, v in raw_values.items()})

    def process_file(self, filepath: str) -> dict:
        print(f"Starting data processing from {filepath}")
        self.load_zone_dimensions()

        all_trips = []
        chunk_num = 0
        start_row = 1

        for chunk in pd.read_csv(filepath, chunksize=self.chunk_size):
            chunk_num += 1
            valid, rejected = self.process_chunk(chunk, start_row)

            if valid:
                inserted = self.db.batch_insert('trips', valid)
                all_trips.extend(valid)
                self.stats['valid'] += inserted
                print(f"Chunk {chunk_num}: {inserted} inserted, {rejected} rejected")
            else:
                self.stats['rejected'] += rejected
                print(f"Chunk {chunk_num}: {rejected} rejected (no valid rows)")

            self.stats['total'] += len(chunk)
            start_row += len(chunk)

        return self.stats

if __name__ == '__main__':
    db = Database(Config.DATABASE_URL)
    processor = TripDataProcessor(db)

    csv_path = '/Users/mac/Desktop/projects/analytical/yellow_tripdata_2019-01.csv'
    stats = processor.process_file(csv_path)

    print("\n=== Processing Complete ===")
    print(f"Total rows: {stats['total']}")
    print(f"Valid rows: {stats['valid']}")
    print(f"Rejected: {stats['rejected']}")
    print(f"Acceptance rate: {stats['valid'] / stats['total'] * 100:.2f}%")
    print(f"\nRejection reasons:")
    for reason, count in sorted(stats['by_reason'].items(), key=lambda x: x[1], reverse=True):
        print(f"  {reason}: {count}")
