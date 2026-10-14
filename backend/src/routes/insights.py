from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, timedelta

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/insights/hourly', methods=['GET'])
def get_hourly_insights():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')
        pu_zone = request.args.get('pu_zone', type=int)
        min_fare = request.args.get('min_fare', type=float)
        max_fare = request.args.get('max_fare', type=float)
        payment_type = request.args.get('payment_type', type=int)

        where_clauses = ["pickup_datetime >= %s", "pickup_datetime < %s"]
        params = [start_date, end_date]

        if pu_zone:
            where_clauses.append("pu_location_id = %s")
            params.append(pu_zone)
        if min_fare is not None:
            where_clauses.append("fare_amount >= %s")
            params.append(min_fare)
        if max_fare is not None:
            where_clauses.append("fare_amount <= %s")
            params.append(max_fare)
        if payment_type:
            where_clauses.append("payment_type = %s")
            params.append(payment_type)

        where_clause = " AND ".join(where_clauses)

        db = current_app.db
        if db.is_sqlite:
            query = f"""
                SELECT
                    datetime(substr(pickup_datetime, 1, 13) || ':00:00') as hour,
                    COUNT(*) as trip_count,
                    AVG(fare_amount) as avg_fare,
                    AVG(tip_amount) as avg_tip,
                    AVG(speed_mph) as avg_speed,
                    AVG(trip_distance) as avg_distance
                FROM trips
                WHERE {where_clause}
                GROUP BY datetime(substr(pickup_datetime, 1, 13) || ':00:00')
                ORDER BY hour ASC
            """
        else:
            query = f"""
                SELECT
                    DATE_TRUNC('hour', pickup_datetime)::timestamp as hour,
                    COUNT(*) as trip_count,
                    AVG(fare_amount) as avg_fare,
                    AVG(tip_amount) as avg_tip,
                    AVG(speed_mph) as avg_speed,
                    AVG(trip_distance) as avg_distance
                FROM trips
                WHERE {where_clause}
                GROUP BY DATE_TRUNC('hour', pickup_datetime)
                ORDER BY hour ASC
            """

        data = db.fetch_all(query, tuple(params))

        return jsonify([dict(d) for d in data]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@insights_bp.route('/insights/zone-traffic', methods=['GET'])
def get_zone_traffic():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')
        limit = request.args.get('limit', 20, type=int)

        query = """
            SELECT
                pu_location_id as zone_id,
                tz.zone as zone_name,
                tz.borough,
                COUNT(*) as pickups,
                AVG(fare_amount) as avg_fare,
                AVG(speed_mph) as avg_speed,
                SUM(tip_amount) / NULLIF(SUM(fare_amount), 0) as tip_ratio
            FROM trips t
            JOIN taxi_zones tz ON t.pu_location_id = tz.location_id
            WHERE t.pickup_datetime >= %s AND t.pickup_datetime < %s
            GROUP BY pu_location_id, tz.zone, tz.borough
            ORDER BY pickups DESC
            LIMIT %s
        """

        db = current_app.db
        data = db.fetch_all(query, (start_date, end_date, limit))

        return jsonify([dict(d) for d in data]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@insights_bp.route('/insights/profitability', methods=['GET'])
def get_zone_profitability():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')

        query = """
            SELECT
                pu_location_id as zone_id,
                tz.zone as zone_name,
                tz.borough,
                AVG(trip_profitability_ratio) as avg_profitability,
                COUNT(*) as trip_count,
                AVG(fare_amount) as avg_fare,
                AVG(trip_distance) as avg_distance
            FROM trips t
            JOIN taxi_zones tz ON t.pu_location_id = tz.location_id
            WHERE t.pickup_datetime >= %s AND t.pickup_datetime < %s
                AND t.trip_profitability_ratio > 0
            GROUP BY pu_location_id, tz.zone, tz.borough
            ORDER BY avg_profitability DESC
        """

        db = current_app.db
        data = db.fetch_all(query, (start_date, end_date))

        return jsonify([dict(d) for d in data]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@insights_bp.route('/insights/payment-behavior', methods=['GET'])
def get_payment_behavior():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')

        payment_types = {
            1: 'Credit Card',
            2: 'Cash',
            3: 'No Charge',
            4: 'Dispute'
        }

        query = """
            SELECT
                payment_type,
                COUNT(*) as trip_count,
                AVG(tip_amount) as avg_tip,
                SUM(tip_amount) / NULLIF(SUM(fare_amount), 0) as tip_ratio,
                AVG(fare_amount) as avg_fare
            FROM trips
            WHERE pickup_datetime >= %s AND pickup_datetime < %s
            GROUP BY payment_type
            ORDER BY payment_type
        """

        db = current_app.db
        data = db.fetch_all(query, (start_date, end_date))

        result = []
        for row in data:
            row_dict = dict(row)
            row_dict['payment_type_name'] = payment_types.get(row_dict['payment_type'], 'Unknown')
            result.append(row_dict)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@insights_bp.route('/insights/zone-metrics', methods=['GET'])
def get_zone_metrics():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')
        pu_zone = request.args.get('pu_zone', type=int)
        min_fare = request.args.get('min_fare', type=float)
        max_fare = request.args.get('max_fare', type=float)
        payment_type = request.args.get('payment_type', type=int)

        where_clauses = ["t.pickup_datetime >= %s", "t.pickup_datetime < %s"]
        params = [start_date, end_date]

        if pu_zone:
            where_clauses.append("t.pu_location_id = %s")
            params.append(pu_zone)
        if min_fare is not None:
            where_clauses.append("t.fare_amount >= %s")
            params.append(min_fare)
        if max_fare is not None:
            where_clauses.append("t.fare_amount <= %s")
            params.append(max_fare)
        if payment_type:
            where_clauses.append("t.payment_type = %s")
            params.append(payment_type)

        where_clause = " AND ".join(where_clauses)

        db = current_app.db
        query = f"""
            SELECT
                tz.location_id,
                tz.zone,
                tz.borough,
                COUNT(*) as trip_count,
                AVG(t.speed_mph) as avg_speed,
                AVG(t.fare_amount / NULLIF(t.trip_distance, 0)) as avg_fare_per_mile,
                AVG(CASE WHEN t.payment_type = 1 THEN t.tip_amount / NULLIF(t.fare_amount, 0) ELSE 0 END) as tip_ratio
            FROM trips t
            JOIN taxi_zones tz ON t.pu_location_id = tz.location_id
            WHERE {where_clause}
            GROUP BY tz.location_id, tz.zone, tz.borough
            ORDER BY tz.location_id
        """

        zones = db.fetch_all(query, tuple(params))

        result = {}
        for zone in zones:
            z = dict(zone)
            result[z['location_id']] = {
                'zone': z['zone'],
                'borough': z['borough'],
                'trip_count': z['trip_count'],
                'avg_speed': float(z['avg_speed'] or 0),
                'avg_fare_per_mile': float(z['avg_fare_per_mile'] or 0),
                'tip_ratio': float(z['tip_ratio'] or 0)
            }

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@insights_bp.route('/insights/heatmap-data', methods=['GET'])
def get_heatmap_data():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')

        db = current_app.db
        if db.is_sqlite:
            query = """
                SELECT
                    CAST(strftime('%w', pickup_datetime) AS INTEGER) as day,
                    CAST(strftime('%H', pickup_datetime) AS INTEGER) as hour,
                    COUNT(*) as trip_count,
                    AVG(speed_mph) as avg_speed
                FROM trips
                WHERE pickup_datetime >= ? AND pickup_datetime < ?
                GROUP BY day, hour
                ORDER BY day, hour
            """
        else:
            query = """
                SELECT
                    EXTRACT(DOW FROM pickup_datetime)::int as day,
                    EXTRACT(HOUR FROM pickup_datetime)::int as hour,
                    COUNT(*) as trip_count,
                    AVG(speed_mph) as avg_speed
                FROM trips
                WHERE pickup_datetime >= %s AND pickup_datetime < %s
                GROUP BY day, hour
                ORDER BY day, hour
            """

        data = db.fetch_all(query, (start_date, end_date))
        return jsonify([dict(d) for d in data]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@insights_bp.route('/insights/top-routes', methods=['GET'])
def get_top_routes():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')
        limit = request.args.get('limit', 10, type=int)

        db = current_app.db
        query = """
            SELECT
                t.pu_location_id,
                t.do_location_id,
                z1.zone as from_zone,
                z2.zone as to_zone,
                COUNT(*) as trips,
                ROUND(AVG(t.speed_mph)::numeric, 1) as avg_speed,
                ROUND(AVG(t.fare_amount)::numeric, 2) as avg_fare
            FROM trips t
            JOIN taxi_zones z1 ON t.pu_location_id = z1.location_id
            JOIN taxi_zones z2 ON t.do_location_id = z2.location_id
            WHERE t.pickup_datetime >= %s AND t.pickup_datetime < %s
            GROUP BY t.pu_location_id, t.do_location_id, z1.zone, z2.zone
            ORDER BY trips DESC
            LIMIT %s
        """

        data = db.fetch_all(query, (start_date, end_date, limit))
        return jsonify([dict(d) for d in data]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@insights_bp.route('/insights/summary', methods=['GET'])
def get_summary():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')

        db = current_app.db

        total_trips = db.fetch_one(
            "SELECT COUNT(*) as count FROM trips WHERE pickup_datetime >= %s AND pickup_datetime < %s",
            (start_date, end_date)
        )

        avg_stats = db.fetch_one(
            """
            SELECT
                AVG(fare_amount) as avg_fare,
                AVG(tip_amount) as avg_tip,
                AVG(trip_distance) as avg_distance,
                AVG(speed_mph) as avg_speed,
                AVG(data_quality_score) as avg_quality
            FROM trips
            WHERE pickup_datetime >= %s AND pickup_datetime < %s
            """,
            (start_date, end_date)
        )

        anomaly_count = db.fetch_one(
            "SELECT COUNT(*) as count FROM trips WHERE pickup_datetime >= %s AND pickup_datetime < %s AND anomaly_score > 0.7",
            (start_date, end_date)
        )

        return jsonify({
            'total_trips': dict(total_trips) if total_trips else {},
            'avg_stats': dict(avg_stats) if avg_stats else {},
            'anomalies': dict(anomaly_count) if anomaly_count else {}
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@insights_bp.route('/insights/fare-by-distance', methods=['GET'])
def get_fare_by_distance():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')

        db = current_app.db
        query = """
            SELECT
                distance_bin,
                COUNT(*) as trip_count,
                AVG(fare_per_mile) as avg_fare_per_mile,
                AVG(trip_distance) as avg_distance,
                AVG(fare_amount) as avg_fare
            FROM (
                SELECT
                    CASE
                        WHEN trip_distance < 1 THEN '0-1'
                        WHEN trip_distance < 3 THEN '1-3'
                        WHEN trip_distance < 5 THEN '3-5'
                        WHEN trip_distance < 10 THEN '5-10'
                        WHEN trip_distance < 20 THEN '10-20'
                        ELSE '20+'
                    END as distance_bin,
                    trip_distance,
                    fare_amount / NULLIF(trip_distance, 0) as fare_per_mile,
                    fare_amount
                FROM trips
                WHERE pickup_datetime >= %s AND pickup_datetime < %s
                    AND trip_distance > 0 AND fare_amount > 0
            ) subq
            GROUP BY distance_bin
            ORDER BY
                CASE distance_bin
                    WHEN '0-1' THEN 1
                    WHEN '1-3' THEN 2
                    WHEN '3-5' THEN 3
                    WHEN '5-10' THEN 4
                    WHEN '10-20' THEN 5
                    WHEN '20+' THEN 6
                END
        """

        data = db.fetch_all(query, (start_date, end_date))
        result = []
        for row in data:
            row_dict = dict(row)
            result.append({
                'distance_bin': row_dict['distance_bin'],
                'trip_count': row_dict['trip_count'],
                'avg_fare_per_mile': float(row_dict['avg_fare_per_mile'] or 0),
                'avg_distance': float(row_dict['avg_distance'] or 0),
                'avg_fare': float(row_dict['avg_fare'] or 0)
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
