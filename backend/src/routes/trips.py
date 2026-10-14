from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from urllib.parse import quote

trips_bp = Blueprint('trips', __name__)

@trips_bp.route('/trips', methods=['GET'])
def get_trips():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')
        pu_zone = request.args.get('pu_zone')
        do_zone = request.args.get('do_zone')
        passenger_count = request.args.get('passenger_count', type=int)
        payment_type = request.args.get('payment_type', type=int)
        min_fare = request.args.get('min_fare', type=float)
        max_fare = request.args.get('max_fare', type=float)
        limit = request.args.get('limit', 1000, type=int)
        offset = request.args.get('offset', 0, type=int)

        if limit > 10000:
            limit = 10000
        if offset < 0:
            offset = 0

        query = """
            SELECT
                trip_id, vendor_id, pickup_datetime, dropoff_datetime,
                passenger_count, trip_distance, pu_location_id, do_location_id,
                rate_code_id, payment_type, fare_amount, tip_amount, total_amount,
                speed_mph, fare_per_mile, trip_profitability_ratio,
                data_quality_score, anomaly_score
            FROM trips
            WHERE pickup_datetime >= %s AND pickup_datetime < %s
        """
        params = [start_date, end_date]

        if pu_zone:
            query += " AND pu_location_id = %s"
            params.append(int(pu_zone))

        if do_zone:
            query += " AND do_location_id = %s"
            params.append(int(do_zone))

        if passenger_count:
            query += " AND passenger_count = %s"
            params.append(passenger_count)

        if payment_type:
            query += " AND payment_type = %s"
            params.append(payment_type)

        if min_fare:
            query += " AND fare_amount >= %s"
            params.append(min_fare)

        if max_fare:
            query += " AND fare_amount <= %s"
            params.append(max_fare)

        query += " ORDER BY pickup_datetime DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        db = current_app.db
        trips = db.fetch_all(query, tuple(params))

        return jsonify({
            'trips': [dict(t) for t in trips],
            'count': len(trips),
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trips_bp.route('/trips/<int:trip_id>', methods=['GET'])
def get_trip(trip_id):
    try:
        query = "SELECT * FROM trips WHERE trip_id = %s"
        db = current_app.db
        trip = db.fetch_one(query, (trip_id,))

        if not trip:
            return jsonify({'error': 'Trip not found'}), 404

        return jsonify(dict(trip)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trips_bp.route('/trips/anomalies', methods=['GET'])
def get_anomalies():
    try:
        threshold = request.args.get('threshold', 0.7, type=float)
        limit = request.args.get('limit', 100, type=int)

        query = """
            SELECT
                trip_id, pickup_datetime, dropoff_datetime,
                trip_distance, fare_amount, speed_mph, fare_per_mile,
                anomaly_score
            FROM trips
            WHERE anomaly_score > %s
            ORDER BY anomaly_score DESC
            LIMIT %s
        """

        db = current_app.db
        anomalies = db.fetch_all(query, (threshold, limit))

        return jsonify({
            'anomalies': [dict(a) for a in anomalies],
            'count': len(anomalies)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trips_bp.route('/trips/stats', methods=['GET'])
def get_trip_stats():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')
        pu_zone = request.args.get('pu_zone', type=int)

        query = """
            SELECT
                COUNT(*) as trip_count,
                AVG(fare_amount) as avg_fare,
                AVG(trip_distance) as avg_distance,
                AVG(speed_mph) as avg_speed,
                AVG(tip_amount) as avg_tip,
                MAX(total_amount) as max_fare,
                MIN(total_amount) as min_fare
            FROM trips
            WHERE pickup_datetime >= %s AND pickup_datetime < %s
        """
        params = [start_date, end_date]

        if pu_zone:
            query += " AND pu_location_id = %s"
            params.append(pu_zone)

        db = current_app.db
        stats = db.fetch_one(query, tuple(params))

        return jsonify(dict(stats) if stats else {}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
