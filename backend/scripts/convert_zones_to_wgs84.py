import json
import sys

try:
    from pyproj import Transformer
except ImportError:
    print("Installing pyproj...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyproj", "-q"])
    from pyproj import Transformer

transformer = Transformer.from_proj("EPSG:2263", "EPSG:4326", always_xy=True)

with open('/Users/mac/Desktop/projects/Urban-mobility-analytics/data/raw/taxi_zones.geojson', 'r') as f:
    geojson = json.load(f)

def convert_coords(coords):
    if not coords:
        return coords
    if isinstance(coords[0], (int, float)):
        try:
            lng, lat = transformer.transform(coords[0], coords[1])
            return [lng, lat]
        except:
            return coords
    return [convert_coords(c) for c in coords]

for feature in geojson.get('features', []):
    if feature.get('geometry', {}).get('coordinates'):
        feature['geometry']['coordinates'] = convert_coords(feature['geometry']['coordinates'])

with open('/Users/mac/Desktop/projects/analytical/backend/db/zones.geojson', 'w') as f:
    json.dump(geojson, f)

print(f"✅ Converted {len(geojson['features'])} zones to WGS84")
