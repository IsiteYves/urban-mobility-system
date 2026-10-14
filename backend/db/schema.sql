CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE vendors (
  vendor_id SMALLINT PRIMARY KEY,
  vendor_name VARCHAR(50) NOT NULL
);

CREATE TABLE taxi_zones (
  location_id SMALLINT PRIMARY KEY,
  borough VARCHAR(50) NOT NULL,
  zone VARCHAR(255) NOT NULL,
  service_zone VARCHAR(50),
  geometry GEOMETRY(POLYGON, 4326),
  centroid_lat DECIMAL(10, 8),
  centroid_lon DECIMAL(11, 8),
  CONSTRAINT valid_geometry CHECK (ST_IsValid(geometry))
);

CREATE INDEX idx_taxi_zones_borough ON taxi_zones(borough);
CREATE INDEX idx_taxi_zones_service_zone ON taxi_zones(service_zone);
CREATE INDEX idx_taxi_zones_geometry ON taxi_zones USING GIST(geometry);

CREATE TABLE data_quality_log (
  id SERIAL PRIMARY KEY,
  source_row_num BIGINT,
  rejection_reason VARCHAR(50),
  raw_values JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quality_log_reason ON data_quality_log(rejection_reason);

CREATE TABLE trips (
  trip_id BIGSERIAL PRIMARY KEY,
  vendor_id SMALLINT REFERENCES vendors(vendor_id),
  pickup_datetime TIMESTAMP NOT NULL,
  dropoff_datetime TIMESTAMP NOT NULL,
  passenger_count SMALLINT,
  trip_distance DECIMAL(10, 2),
  pu_location_id SMALLINT REFERENCES taxi_zones(location_id),
  do_location_id SMALLINT REFERENCES taxi_zones(location_id),
  rate_code_id SMALLINT,
  payment_type SMALLINT,
  store_and_fwd_flag CHAR(1),
  fare_amount DECIMAL(12, 2),
  extra DECIMAL(12, 2),
  mta_tax DECIMAL(12, 2),
  tip_amount DECIMAL(12, 2),
  tolls_amount DECIMAL(12, 2),
  improvement_surcharge DECIMAL(12, 2),
  congestion_surcharge DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  speed_mph DECIMAL(8, 2),
  fare_per_mile DECIMAL(8, 2),
  trip_profitability_ratio DECIMAL(8, 3),
  data_quality_score SMALLINT,
  anomaly_score DECIMAL(5, 3),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_times CHECK (dropoff_datetime >= pickup_datetime),
  CONSTRAINT valid_distance CHECK (trip_distance >= 0),
  CONSTRAINT valid_amount CHECK (total_amount >= 0)
);

CREATE INDEX idx_trips_pickup_datetime ON trips(pickup_datetime);
CREATE INDEX idx_trips_dropoff_datetime ON trips(dropoff_datetime);
CREATE INDEX idx_trips_pu_location ON trips(pu_location_id);
CREATE INDEX idx_trips_do_location ON trips(do_location_id);
CREATE INDEX idx_trips_payment_type ON trips(payment_type);
CREATE INDEX idx_trips_passenger_count ON trips(passenger_count);
CREATE INDEX idx_trips_anomaly_score ON trips(anomaly_score);
CREATE INDEX idx_trips_pickup_location_time ON trips(pickup_datetime, pu_location_id);

CREATE TABLE trip_summaries (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL,
  hour SMALLINT,
  pu_location_id SMALLINT REFERENCES taxi_zones(location_id),
  do_location_id SMALLINT REFERENCES taxi_zones(location_id),
  trip_count BIGINT,
  avg_fare DECIMAL(10, 2),
  avg_distance DECIMAL(10, 2),
  avg_speed DECIMAL(8, 2),
  median_tip_pct DECIMAL(5, 2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(summary_date, hour, pu_location_id, do_location_id)
);
