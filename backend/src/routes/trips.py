from flask import Blueprint, jsonify, current_app
import json
from pathlib import Path

zones_bp = Blueprint('zones', __name__)

GEOJSON_PATH = Path(__file__).parent.parent.parent / 'db' / 'zones.geojson'

@zones_bp.route('/zones', methods=['GET'])
def get_zones():
    try:
        db = current_app.db
        query = """
            SELECT location_id, borough, zone, service_zone,
                   centroid_lat, centroid_lon
            FROM taxi_zones
            ORDER BY borough, zone
        """
        zones = db.fetch_all(query)

        return jsonify([dict(z) for z in zones]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@zones_bp.route('/zones/geojson', methods=['GET'])
def get_zones_geojson():
    try:
        if GEOJSON_PATH.exists():
            with open(GEOJSON_PATH, 'r') as f:
                geojson = json.load(f)
            return jsonify(geojson), 200
        else:
            return jsonify({'error': 'GeoJSON not available'}), 404

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@zones_bp.route('/zones/<int:zone_id>', methods=['GET'])
def get_zone(zone_id):
    try:
        db = current_app.db
        query = """
            SELECT location_id, borough, zone, service_zone,
                   centroid_lat, centroid_lon
            FROM taxi_zones
            WHERE location_id = %s
        """
        zone = db.fetch_one(query, (zone_id,))

        if not zone:
            return jsonify({'error': 'Zone not found'}), 404

        trip_stats = db.fetch_one("""
            SELECT
                COUNT(*) as total_pickups,
                AVG(fare_amount) as avg_fare,
                AVG(trip_distance) as avg_distance
            FROM trips
            WHERE pu_location_id = %s
        """, (zone_id,))

        return jsonify({
            **dict(zone),
            'stats': dict(trip_stats) if trip_stats else None
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@zones_bp.route('/zones/borough/<borough>', methods=['GET'])
def get_zones_by_borough(borough):
    try:
        db = current_app.db
        query = """
            SELECT location_id, zone, service_zone, centroid_lat, centroid_lon
            FROM taxi_zones
            WHERE borough = %s
            ORDER BY zone
        """
        zones = db.fetch_all(query, (borough,))

        return jsonify([dict(z) for z in zones]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
