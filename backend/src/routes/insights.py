from flask import Blueprint, request, jsonify, current_app

insights_bp = Blueprint('insights', __name__)


@insights_bp.route('/insights/hourly', methods=['GET'])
def get_hourly_insights():
    try:
        start_date = request.args.get('start_date','2019-01-01')
        end_date =request.args.get('end_date','2019-01-31')
        pu_zone=request.args.get('pu_zone',type=int)
        min_fare =request.args.get('min_fare',type = float)
        max_fare = request.args.get('max_fare',type=float)
        payment_type = request.args.get('payment_type',type = int)
        where_clauses = ["pickup_datetime >= %s"," pickup_datetime < %s"]
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
            where_clause = 'AND'.join (where_clauses)
            query = f"""
                SELECT
                    DATE_TRUNC('hour',pickup_datetime)::timestamp as hour
                    COUNT(*) as trip_count
                    AVG(fare_amount) as avg_fare
                    AVG(tip_amount)as avg_tip
                    AVG(speed_mph)as avg_speed
                     AVG(trip_distance) as avg distance
                FROM  trips
                WHERE{where_clause}
                GROUP BY hour
                ORDER BY hour ACS
            """

            db = current_app.db
            data = db.fetch_all(query,tuple(params))  
            return jsonify([dict(d) for d in data]),200  
        
    except Exception as e:
         return jsonify({'error': str(e)}), 500 
         
@insights_bp.route('/insights/profitability',methods =['GET'])
def get_zone_profitability():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')

        query = """
            SELECT
                pu_location_id AS zone_id,
                tz.zone AS zone_name,
                tz.borough,
                AVG(trip_profitability_ratio) AS avg_profitability,
                COUNT(*) AS trip_count,
                AVG(fare_amount) AS avg_fare,
                AVG(trip_distance) AS avg_distance
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
                COUNT(*) AS trip_count,
                AVG(tip_amount) AS avg_tip,
                SUM(tip_amount) / NULLIF(SUM(fare_amount), 0) AS tip_ratio,
                AVG(fare_amount) AS avg_fare
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

@insights_bp.route('/insights/summary', methods=['GET'])
def get_summary():
    try:
        start_date = request.args.get('start_date', '2019-01-01')
        end_date = request.args.get('end_date', '2019-01-31')

        db = current_app.db

        total_trips = db.fetch_one(
            "SELECT COUNT(*) AS count FROM trips WHERE pickup_datetime >= %s AND pickup_datetime < %s",
            (start_date, end_date)
        )

        avg_stats = db.fetch_one(
            """
            SELECT
                AVG(fare_amount) AS avg_fare,
                AVG(tip_amount) AS avg_tip,
                AVG(trip_distance) AS avg_distance,
                AVG(speed_mph) AS avg_speed,
                AVG(data_quality_score) AS avg_quality
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
    
          


