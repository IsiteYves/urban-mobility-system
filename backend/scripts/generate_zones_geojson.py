import json
import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.utils.db import Database
from src.config import Config

def generate_geojson_from_db():
    db = Database(Config.DATABASE_URL)

    # Fetch all zones with centroids
    zones = db.fetch_all("""
        SELECT location_id, zone, borough, service_zone,
               centroid_lat, centroid_lon
        FROM taxi_zones
        ORDER BY location_id
    """)

    features = []
    for zone in zones:
        z = dict(zone)
        # Create point features from centroids
        feature = {
            "type": "Feature",
            "properties": {
                "LocationID": z['location_id'],
                "Zone": z['zone'],
                "Borough": z['borough'],
                "service_zone": z['service_zone']
            },
            "geometry": {
                "type": "Point",
                "coordinates": [float(z['centroid_lon'] or 0), float(z['centroid_lat'] or 0)]
            }
        }
        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    # Save to backend/db/zones.geojson
    output_path = Path(__file__).parent.parent.parent / 'backend' / 'db' / 'zones.geojson'
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(geojson, f, indent=2)

    print(f"✓ Generated GeoJSON with {len(features)} zone points at {output_path}")

if __name__ == '__main__':
    generate_geojson_from_db()
