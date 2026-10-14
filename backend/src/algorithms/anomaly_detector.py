from typing import Dict, List, Tuple
import math

class GridAnomalyDetector:
    def __init__(self, grid_size: int = 10):
        self.grid_size = grid_size
        self.grid_cells: Dict[Tuple[int, int], List[dict]] = {}
        self.cell_stats: Dict[Tuple[int, int], dict] = {}

        self.nyc_bounds = {
            'lat_min': 40.5774,
            'lat_max': 40.9176,
            'lon_min': -74.2591,
            'lon_max': -73.7004
        }

    def _get_grid_cell(self, lat: float, lon: float) -> Tuple[int, int]:
        lat_range = self.nyc_bounds['lat_max'] - self.nyc_bounds['lat_min']
        lon_range = self.nyc_bounds['lon_max'] - self.nyc_bounds['lon_min']

        cell_x = min(self.grid_size - 1,
                     int((lat - self.nyc_bounds['lat_min']) / lat_range * self.grid_size))
        cell_y = min(self.grid_size - 1,
                     int((lon - self.nyc_bounds['lon_min']) / lon_range * self.grid_size))

        return (cell_x, cell_y)

    def _percentile(self, arr: List[float], p: float) -> float:
        if not arr:
            return 0
        sorted_arr = sorted(arr)
        idx = (p / 100.0) * (len(sorted_arr) - 1)
        lower = int(idx)
        upper = lower + 1

        if upper >= len(sorted_arr):
            return sorted_arr[lower]

        weight = idx - lower
        return sorted_arr[lower] * (1 - weight) + sorted_arr[upper] * weight

    def _calculate_cell_stats(self, trips: List[dict]) -> dict:
        if not trips:
            return {'median_speed': 0, 'median_fare_per_mile': 0, 'q1_speed': 0, 'q3_speed': 0}

        speeds = [t['speed_mph'] for t in trips if t['speed_mph'] > 0]
        fares = [t['fare_per_mile'] for t in trips if t['fare_per_mile'] > 0]

        if not speeds or not fares:
            return {'median_speed': 0, 'median_fare_per_mile': 0, 'q1_speed': 0, 'q3_speed': 0}

        return {
            'median_speed': self._percentile(speeds, 50),
            'median_fare_per_mile': self._percentile(fares, 50),
            'q1_speed': self._percentile(speeds, 25),
            'q3_speed': self._percentile(speeds, 75),
            'q1_fare': self._percentile(fares, 25),
            'q3_fare': self._percentile(fares, 75),
            'trip_count': len(trips)
        }

    def prepare_grid(self, trips: List[dict]):
        for trip in trips:
            cell = self._get_grid_cell(trip['pu_lat'], trip['pu_lon'])
            if cell not in self.grid_cells:
                self.grid_cells[cell] = []
            self.grid_cells[cell].append(trip)

        for cell, cell_trips in self.grid_cells.items():
            self.cell_stats[cell] = self._calculate_cell_stats(cell_trips)

    def detect_anomalies(self, trips: List[dict], iqr_threshold: float = 1.5) -> List[dict]:
        self.prepare_grid(trips)

        anomalies = []

        for trip in trips:
            cell = self._get_grid_cell(trip['pu_lat'], trip['pu_lon'])
            stats = self.cell_stats.get(cell, {})

            if not stats or stats.get('trip_count', 0) < 5:
                trip['anomaly_score'] = 0
                continue

            score = self._compute_anomaly_score(trip, stats, iqr_threshold)
            trip['anomaly_score'] = round(score, 3)

            if score > 0.7:
                anomalies.append(trip)

        return anomalies

    def _compute_anomaly_score(self, trip: dict, stats: dict, iqr_threshold: float) -> float:
        speed = trip['speed_mph']
        fare = trip['fare_per_mile']

        q1_speed = stats['q1_speed']
        q3_speed = stats['q3_speed']
        iqr_speed = q3_speed - q1_speed

        q1_fare = stats['q1_fare']
        q3_fare = stats['q3_fare']
        iqr_fare = q3_fare - q1_fare

        lower_speed = q1_speed - iqr_threshold * iqr_speed
        upper_speed = q3_speed + iqr_threshold * iqr_speed
        lower_fare = q1_fare - iqr_threshold * iqr_fare
        upper_fare = q3_fare + iqr_threshold * iqr_fare

        speed_deviation = 0
        if speed < lower_speed:
            speed_deviation = abs(speed - lower_speed) / (iqr_speed + 1e-6)
        elif speed > upper_speed:
            speed_deviation = abs(speed - upper_speed) / (iqr_speed + 1e-6)

        fare_deviation = 0
        if fare < lower_fare:
            fare_deviation = abs(fare - lower_fare) / (iqr_fare + 1e-6)
        elif fare > upper_fare:
            fare_deviation = abs(fare - upper_fare) / (iqr_fare + 1e-6)

        normalized_speed = min(speed_deviation / 3, 1.0)
        normalized_fare = min(fare_deviation / 3, 1.0)

        combined_score = (normalized_speed + normalized_fare) / 2

        return min(combined_score, 1.0)

class AnomalyDetectionService:
    def __init__(self, db):
        self.db = db

    def fetch_trips_for_anomaly_detection(self) -> List[dict]:
        query = """
            SELECT
                trip_id, speed_mph, fare_per_mile,
                ST_Y(ST_PointFromText('POINT(' || t.lon || ' ' || t.lat || ')', 4326)) as pu_lat,
                ST_X(ST_PointFromText('POINT(' || t.lon || ' ' || t.lat || ')', 4326)) as pu_lon
            FROM (
                SELECT t.trip_id, t.speed_mph, t.fare_per_mile,
                       ST_Y(tz.geometry::geometry) as lat,
                       ST_X(tz.geometry::geometry) as lon
                FROM trips t
                JOIN taxi_zones tz ON t.pu_location_id = tz.location_id
                WHERE t.anomaly_score = 0
                LIMIT 100000
            ) t
        """
        return self.db.fetch_all(query)

    def detect_and_store_anomalies(self):
        trips = self.fetch_trips_for_anomaly_detection()
        detector = GridAnomalyDetector()
        anomalies = detector.detect_anomalies(trips)

        if anomalies:
            query = """
                UPDATE trips SET anomaly_score = %s
                WHERE trip_id = %s
            """
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                for anomaly in anomalies:
                    cursor.execute(query, (anomaly['anomaly_score'], anomaly['trip_id']))

        return len(anomalies)
