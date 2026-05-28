export type DisasterType =
  | 'earthquake'
  | 'flood'
  | 'wildfire'
  | 'tsunami'
  | 'cyclone'
  | 'volcano'
  | 'landslide'
  | 'tornado'
  | 'blizzard'
  | 'drought'
  | 'heatwave'
  | 'storm_surge'
  | 'structural_collapse'
  | 'industrial_hazard';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'active' | 'monitoring' | 'contained' | 'resolved' | 'false_alarm';
export type VerificationStatus = 'pending' | 'in_progress' | 'verified' | 'rejected';
export type CredibilityClassification = 'highly_reliable' | 'likely_true' | 'needs_verification' | 'suspicious';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Incident {
  id?: string;
  _id?: string;
  title: string;
  type: DisasterType;
  severity: SeverityLevel;
  status: IncidentStatus;
  location: GeoPoint;
  dangerZone?: GeoPolygon;
  description?: string;
  credibilityScore?: number;
  source: string;
  sourceId?: string;
  magnitude?: number;
  depth?: number;
  tsunamiFlag?: boolean;
  brightness?: number;
  confidence?: number;
  affectedPopulation?: number;
  spreadPrediction?: {
    direction?: string;
    speed?: number;
    estimatedArea?: number;
    confidence?: number;
  };
  mediaUrls?: string[];
  verifiedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CitizenReport {
  id?: string;
  _id?: string;
  userId?: string;
  incidentId?: string;
  type: DisasterType;
  severity: SeverityLevel;
  location: GeoPoint;
  address?: string;
  description: string;
  mediaUrls?: string[];
  emergencyContact?: string;
  isSOS: boolean;
  verificationStatus: VerificationStatus;
  credibilityScore?: number;
  credibilityClassification?: CredibilityClassification;
  aiAnalysisResults?: {
    imageAnalysis?: Record<string, unknown>;
    contentAnalysis?: string;
    flags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface RescueTeam {
  id?: string;
  _id?: string;
  name: string;
  status: 'available' | 'deployed' | 'returning' | 'offline';
  currentLocation: GeoPoint;
  assignedIncident?: string;
  membersCount: number;
  vehicleType: string;
  specialization: string[];
  contactInfo: string;
  lastUpdate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shelter {
  id?: string;
  _id?: string;
  name: string;
  location: GeoPoint;
  address: string;
  capacity: number;
  currentOccupancy: number;
  status: 'open' | 'full' | 'closed' | 'emergency_only';
  amenities: string[];
  contactInfo: string;
  disasterTypes: DisasterType[];
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id?: string;
  _id?: string;
  type: DisasterType;
  severity: SeverityLevel;
  title: string;
  message: string;
  source: string;
  affectedArea?: GeoPolygon;
  affectedRegion?: string;
  instructions?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentalData {
  id?: string;
  _id?: string;
  location: GeoPoint;
  locationName?: string;
  temperature: number;
  rainfall: number;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  pressure?: number;
  visibility?: number;
  uvIndex?: number;
  airQualityIndex?: number;
  weatherCode?: number;
  weatherDescription?: string;
  recordedAt: string;
}
