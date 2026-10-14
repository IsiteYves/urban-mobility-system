import sys
import os
import json
import zipfile
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    import fiona
    from fiona.transform import transform
    from shapely.geometry import mapping, shape
    from shapely.ops import unary_union
    import pyproj
except ImportError:
    print("Error: fiona and shapely required. Install with: pip install fiona shapely")
    sys.exit(1)

from src.utils.db import Database
from src.config import Config

def extract_and_convert_shapefile(zip_path: str, output_dir: str):
    print(f"Extracting shapefile from {zip_path}")

    extract_path = Path(output_dir) / 'taxi_zones_extracted'
    extract_path.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)

    shp_path = extract_path / 'taxi_zones.shp'
    if not shp_path.exists():
        raise FileNotFoundError(f"taxi_zones.shp not found in extracted files")

    return str(shp_path)

def shapefile_to_geojson(shp_path: str, output_path: str):
    print(f"Converting {shp_path} to GeoJSON")

    features = []
    zone_lookup = {}

    with fiona.open(shp_path) as src:
        crs = src.crs
        print(f"CRS: {crs}")

        for feature in src:
            props = feature['properties']
            location_id = props.get('LocationID')
            geom = feature['geometry']

            if not isinstance(geom, dict):
                geom = mapping(shape(geom))

            feature_dict = {
                'type': 'Feature',
                'properties': {
                    'LocationID': location_id,
                    'Zone': props.get('Zone'),
                    'Borough': props.get('Borough'),
                    'service_zone': props.get('service_zone')
                },
                'geometry': geom
            }

            features.append(feature_dict)
            zone_lookup[location_id] = feature_dict['properties']

    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }

    with open(output_path, 'w') as f:
        json.dump(geojson, f, indent=2)

    print(f"✓ Saved GeoJSON to {output_path}")
    return geojson, zone_lookup

def load_zones_to_database(shp_path: str, zone_lookup_csv: str):
    print(f"Loading zones into database")

    db = Database(Config.DATABASE_URL)

    zone_data = {}
    import pandas as pd
    zones_df = pd.read_csv(zone_lookup_csv)
    for _, row in zones_df.iterrows():
        zone_data[int(row['LocationID'])] = {
            'borough': row['Borough'],
            'zone': row['Zone'],
            'service_zone': row['service_zone']
        }

    with fiona.open(shp_path) as src:
        rows = []
        for feature in src:
            props = feature['properties']
            location_id = props.get('LocationID')

            if location_id not in zone_data:
                print(f"Warning: LocationID {location_id} not in lookup")
                continue

            info = zone_data[location_id]
            geometry = shape(feature['geometry'])

            proj_from = pyproj.Proj(init='EPSG:2263')
            proj_to = pyproj.Proj(init='EPSG:4326')
            transformer = pyproj.Transformer.from_proj(proj_from, proj_to)

            from shapely.geometry import Polygon, MultiPolygon
            if geometry.geom_type == 'MultiPolygon':
                polys = []
                for poly in geometry.geoms:
                    coords = list(poly.exterior.coords)
                    transformed = [transformer.transform(x, y) for x, y in coords]
                    polys.append(Polygon(transformed))
                geometry = MultiPolygon(polys)
            else:
                coords = list(geometry.exterior.coords)
                transformed = [transformer.transform(x, y) for x, y in coords]
                geometry = Polygon(transformed)

            centroid = geometry.centroid

            row = {
                'location_id': location_id,
                'borough': info['borough'],
                'zone': info['zone'],
                'service_zone': info['service_zone'],
                'geometry': f"SRID=4326;{geometry.wkt}",
                'centroid_lat': centroid.y,
                'centroid_lon': centroid.x
            }
            rows.append(row)

        print(f"Inserting {len(rows)} zones")

        query = """
            INSERT INTO taxi_zones (location_id, borough, zone, service_zone, geometry, centroid_lat, centroid_lon)
            VALUES (%s, %s, %s, %s, ST_GeomFromText(%s, 4326), %s, %s)
            ON CONFLICT (location_id) DO UPDATE SET
                geometry = EXCLUDED.geometry,
                centroid_lat = EXCLUDED.centroid_lat,
                centroid_lon = EXCLUDED.centroid_lon
        """

        with db.get_connection() as conn:
            cursor = conn.cursor()
            for row in rows:
                cursor.execute(query, (
                    row['location_id'],
                    row['borough'],
                    row['zone'],
                    row['service_zone'],
                    row['geometry'],
                    row['centroid_lat'],
                    row['centroid_lon']
                ))

        print(f"✓ Loaded {len(rows)} zones into database")

if __name__ == '__main__':
    zip_path = '/Users/mac/Desktop/projects/analytical/taxi_zones.zip'
    output_dir = '/Users/mac/Desktop/projects/analytical/backend/db'
    zone_csv = '/Users/mac/Desktop/projects/analytical/taxi_zone_lookup.csv'

    shp_path = extract_and_convert_shapefile(zip_path, output_dir)
    output_geojson = os.path.join(output_dir, 'zones.geojson')

    geojson, lookup = shapefile_to_geojson(shp_path, output_geojson)
    print(f"✓ Created GeoJSON with {len(geojson['features'])} features")

    load_zones_to_database(shp_path, zone_csv)
    print("\n=== Shapefile conversion complete ===")
