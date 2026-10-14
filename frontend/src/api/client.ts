import axios, { AxiosInstance } from 'axios';
import type { Trip, Zone, HourlyInsight, ZoneTraffic, PaymentBehavior, SummaryStats, ZoneProfitability } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getTrips(params: {
    start_date?: string;
    end_date?: string;
    pu_zone?: number;
    do_zone?: number;
    passenger_count?: number;
    payment_type?: number;
    min_fare?: number;
    max_fare?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ trips: Trip[]; count: number }> {
    const response = await this.client.get('/trips', { params });
    return response.data;
  }

  async getTrip(tripId: number): Promise<Trip> {
    const response = await this.client.get(`/trips/${tripId}`);
    return response.data;
  }

  async getAnomalies(threshold: number = 0.7, limit: number = 100): Promise<{ anomalies: Trip[] }> {
    const response = await this.client.get('/trips/anomalies', { params: { threshold, limit } });
    return response.data;
  }

  async getTripStats(params: {
    start_date?: string;
    end_date?: string;
    pu_zone?: number;
  }): Promise<any> {
    const response = await this.client.get('/trips/stats', { params });
    return response.data;
  }

  async getZones(): Promise<Zone[]> {
    const response = await this.client.get('/zones');
    return response.data;
  }

  async getZone(zoneId: number): Promise<Zone & { stats?: any }> {
    const response = await this.client.get(`/zones/${zoneId}`);
    return response.data;
  }

  async getZonesByBorough(borough: string): Promise<Zone[]> {
    const response = await this.client.get(`/zones/borough/${borough}`);
    return response.data;
  }

  async getZonesGeoJSON(): Promise<GeoJSON.FeatureCollection> {
    const response = await this.client.get('/zones/geojson');
    return response.data;
  }

  async getHourlyInsights(params: {
    start_date?: string;
    end_date?: string;
    pu_zone?: number;
    min_fare?: number;
    max_fare?: number;
    payment_type?: number;
  }): Promise<HourlyInsight[]> {
    const response = await this.client.get('/insights/hourly', { params });
    return response.data;
  }

  async getZoneTraffic(params: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<ZoneTraffic[]> {
    const response = await this.client.get('/insights/zone-traffic', { params });
    return response.data;
  }

  async getZoneProfitability(params: {
    start_date?: string;
    end_date?: string;
  }): Promise<ZoneProfitability[]> {
    const response = await this.client.get('/insights/profitability', { params });
    return response.data;
  }

  async getPaymentBehavior(params: {
    start_date?: string;
    end_date?: string;
  }): Promise<PaymentBehavior[]> {
    const response = await this.client.get('/insights/payment-behavior', { params });
    return response.data;
  }

  async getSummary(params: {
    start_date?: string;
    end_date?: string;
  }): Promise<SummaryStats> {
    const response = await this.client.get('/insights/summary', { params });
    return response.data;
  }

  async getHealth(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new APIClient();
