export interface Trip {
  trip_id: number;
  vendor_id: number;
  pickup_datetime: string;
  dropoff_datetime: string;
  passenger_count: number;
  trip_distance: number;
  pu_location_id: number;
  do_location_id: number;
  rate_code_id: number;
  payment_type: number;
  fare_amount: number;
  tip_amount: number;
  total_amount: number;
  speed_mph: number;
  fare_per_mile: number;
  trip_profitability_ratio: number;
  data_quality_score: number;
  anomaly_score: number;
}

export interface Zone {
  location_id: number;
  borough: string;
  zone: string;
  service_zone: string;
  centroid_lat: number;
  centroid_lon: number;
}

export interface ZoneTraffic extends Zone {
  pickups: number;
  avg_fare: number;
  avg_speed: number;
  tip_ratio: number;
}

export interface ZoneProfitability {
  zone_id: number;
  zone_name: string;
  borough: string;
  avg_profitability: number;
  trip_count: number;
  avg_fare: number;
  avg_distance: number;
}

export interface HourlyInsight {
  hour: string;
  trip_count: number;
  avg_fare: number;
  avg_tip: number;
  avg_speed: number;
  avg_distance: number;
}

export interface PaymentBehavior {
  payment_type: number;
  payment_type_name: string;
  trip_count: number;
  avg_tip: number;
  tip_ratio: number;
  avg_fare: number;
}

export interface SummaryStats {
  total_trips: {
    count: number;
  };
  avg_stats: {
    avg_fare: number;
    avg_tip: number;
    avg_distance: number;
    avg_speed: number;
    avg_quality: number;
  };
  anomalies: {
    count: number;
  };
}

export interface FilterState {
  startDate: string;
  endDate: string;
  puZone?: number;
  doZone?: number;
  passengerCount?: number;
  paymentType?: number;
  minFare?: number;
  maxFare?: number;
}
