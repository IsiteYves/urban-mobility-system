#!/usr/bin/env python3
"""Generate realistic sample trip data for quick demo"""
import random
from datetime import datetime, timedelta
import csv

OUTPUT_PATH = '/Users/mac/Desktop/projects/analytical/yellow_tripdata_2019-01_sample.csv'

# Sample data generator
def generate_sample_trips(num_trips=500000):
    """Generate realistic NYC taxi trip samples"""
    fieldnames = [
        'VendorID', 'tpep_pickup_datetime', 'tpep_dropoff_datetime',
        'passenger_count', 'trip_distance', 'RatecodeID', 'store_and_fwd_flag',
        'PULocationID', 'DOLocationID', 'payment_type', 'fare_amount',
        'extra', 'mta_tax', 'tip_amount', 'tolls_amount',
        'improvement_surcharge', 'congestion_surcharge', 'total_amount'
    ]

    with open(OUTPUT_PATH, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        base_date = datetime(2019, 1, 1)

        for i in range(num_trips):
            # Random time within January 2019
            days_offset = random.randint(0, 30)
            hours_offset = random.randint(0, 23)
            minutes_offset = random.randint(0, 59)

            pickup = base_date + timedelta(days=days_offset, hours=hours_offset, minutes=minutes_offset)
            # Duration: 5-60 minutes
            duration_minutes = random.randint(5, 60)
            dropoff = pickup + timedelta(minutes=duration_minutes)

            # Distance: 0.5-15 miles (realistic for NYC)
            distance = round(random.uniform(0.5, 15), 2)

            # Fare calculation (rough)
            base_fare = 2.50
            per_mile = 2.50
            fare = round(base_fare + (per_mile * distance), 2)

            # Charges
            extra = round(random.choice([0, 0.50, 1.00]), 2)
            mta_tax = 0.50
            tip_pct = random.choice([0, 0.15, 0.18, 0.20])
            tip = round(fare * tip_pct, 2)
            tolls = 0
            surcharge = 0.30
            congestion = 0 if random.random() > 0.1 else 2.75

            total = fare + extra + mta_tax + tip + tolls + surcharge + congestion

            writer.writerow({
                'VendorID': random.choice([1, 2]),
                'tpep_pickup_datetime': pickup.strftime('%Y-%m-%d %H:%M:%S'),
                'tpep_dropoff_datetime': dropoff.strftime('%Y-%m-%d %H:%M:%S'),
                'passenger_count': random.randint(1, 5),
                'trip_distance': distance,
                'RatecodeID': random.choice([1, 1, 1, 2, 3, 5]),  # Mostly standard rate
                'store_and_fwd_flag': 'N',
                'PULocationID': random.randint(1, 265),
                'DOLocationID': random.randint(1, 265),
                'payment_type': random.choice([1, 1, 1, 2]),  # Mostly card
                'fare_amount': fare,
                'extra': extra,
                'mta_tax': mta_tax,
                'tip_amount': tip,
                'tolls_amount': tolls,
                'improvement_surcharge': surcharge,
                'congestion_surcharge': congestion,
                'total_amount': round(total, 2)
            })

            if (i + 1) % 10000 == 0:
                print(f"Generated {i + 1:,} sample trips...")

    print(f"\n✓ Sample data generated: {OUTPUT_PATH}")

if __name__ == '__main__':
    print("Generating 500,000 sample NYC taxi trips...")
    generate_sample_trips(500000)
