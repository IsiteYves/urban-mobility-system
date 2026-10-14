#!/usr/bin/env python3
"""
Demo data processor - works without pandas
Shows data cleaning, validation, and feature engineering
"""

import csv
from datetime import datetime
from collections import defaultdict
from io import StringIO

class DemoProcessor:
    def __init__(self):
        self.stats = {'total': 0, 'valid': 0, 'by_reason': defaultdict(int)}
        self.zone_ids = set(range(1, 264))
        self.valid_trips = []

    def parse_datetime(self, dt_str):
        try:
            return datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
        except:
            return None

    def validate_trip(self, row):
        try:
            pickup = self.parse_datetime(row['tpep_pickup_datetime'])
            dropoff = self.parse_datetime(row['tpep_dropoff_datetime'])

            if not pickup or not dropoff:
                return False, 'temporal_parse_error'

            jan_start = datetime(2019, 1, 1)
            feb_start = datetime(2019, 2, 1)

            if not (jan_start <= pickup < feb_start):
                return False, 'pickup_date_out_of_range'
            if not (jan_start <= dropoff < feb_start):
                return False, 'dropoff_date_out_of_range'
            if dropoff < pickup:
                return False, 'dropoff_before_pickup'

            distance = float(row['trip_distance'])
            fare = float(row['fare_amount'])
            total = float(row['total_amount'])

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

            pu = int(row['PULocationID'])
            do = int(row['DOLocationID'])
            if pu not in self.zone_ids or do not in self.zone_ids:
                return False, 'invalid_location_id'

            vendor = int(row['VendorID'])
            if vendor not in {1, 2}:
                return False, 'invalid_vendor'

            return True, ''

        except Exception as e:
            return False, f'error_{type(e).__name__}'

    def engineer_features(self, row):
        pickup = self.parse_datetime(row['tpep_pickup_datetime'])
        dropoff = self.parse_datetime(row['tpep_dropoff_datetime'])
        duration_hours = (dropoff - pickup).total_seconds() / 3600
        distance = float(row['trip_distance'])
        fare = float(row['fare_amount'])
        tip = float(row.get('tip_amount', 0) or 0)

        speed_mph = distance / duration_hours if duration_hours > 0 else 0
        fare_per_mile = fare / distance if distance > 0.01 else 0

        operational_cost = 1.50 + (0.30 * distance)
        revenue = fare + tip
        profitability = revenue / operational_cost if operational_cost > 0 else 0

        return {
            'speed_mph': round(min(speed_mph, 100), 2),
            'fare_per_mile': round(fare_per_mile, 2),
            'profitability': round(profitability, 3),
        }

    def process_file(self, filepath, max_rows=100000):
        print(f"Processing up to {max_rows:,} rows from {filepath}\n")

        with open(filepath, 'r') as f:
            reader = csv.DictReader(f)

            for idx, row in enumerate(reader):
                if idx >= max_rows:
                    break

                self.stats['total'] += 1

                valid, reason = self.validate_trip(row)
                if not valid:
                    self.stats['by_reason'][reason] += 1
                    if idx % 10000 == 0:
                        print(f"Row {idx:,}: valid={self.stats['valid']:,}, rejected={idx - self.stats['valid']:,}")
                    continue

                features = self.engineer_features(row)
                self.valid_trips.append(features)
                self.stats['valid'] += 1

                if (idx + 1) % 10000 == 0:
                    print(f"Row {idx + 1:,}: valid={self.stats['valid']:,}, rejected={idx + 1 - self.stats['valid']:,}")

        return self.valid_trips

def print_report(processor):
    print("\n" + "="*70)
    print(" DATA PROCESSING REPORT")
    print("="*70)
    print(f"Total rows processed: {processor.stats['total']:,}")
    print(f"Valid rows: {processor.stats['valid']:,}")
    print(f"Rejected: {processor.stats['total'] - processor.stats['valid']:,}")

    if processor.stats['total'] > 0:
        acceptance_rate = processor.stats['valid'] / processor.stats['total'] * 100
        print(f"Acceptance rate: {acceptance_rate:.1f}%\n")

    print("Rejection Reasons (Top 10):")
    sorted_reasons = sorted(processor.stats['by_reason'].items(), key=lambda x: x[1], reverse=True)
    for reason, count in sorted_reasons[:10]:
        pct = (count / processor.stats['total'] * 100) if processor.stats['total'] > 0 else 0
        print(f"  {reason:.<40} {count:>8,}  ({pct:>5.1f}%)")

    if processor.valid_trips:
        print("\nFeature Statistics:")
        speeds = [t['speed_mph'] for t in processor.valid_trips]
        fares = [t['fare_per_mile'] for t in processor.valid_trips]
        profs = [t['profitability'] for t in processor.valid_trips]

        print(f"  Speed (mph):")
        print(f"    Average: {sum(speeds)/len(speeds):.2f}")
        print(f"    Range: {min(speeds):.2f} – {max(speeds):.2f}")

        print(f"  Fare per Mile:")
        print(f"    Average: ${sum(fares)/len(fares):.2f}")
        print(f"    Range: ${min(fares):.2f} – ${max(fares):.2f}")

        print(f"  Profitability Ratio:")
        print(f"    Average: {sum(profs)/len(profs):.3f}x")
        print(f"    Range: {min(profs):.3f}x – {max(profs):.3f}x")

    print("\n" + "="*70)
    print(f"✓ Processing complete: {len(processor.valid_trips):,} valid trips validated")
    print("="*70)

if __name__ == '__main__':
    csv_path = '/Users/mac/Desktop/projects/analytical/yellow_tripdata_2019-01.csv'
    processor = DemoProcessor()
    processor.process_file(csv_path, max_rows=100000)
    print_report(processor)
