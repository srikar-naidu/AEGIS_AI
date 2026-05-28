import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// Shared Types
// ============================================

export const DISASTER_TYPES = [
  'earthquake',
  'flood',
  'wildfire',
  'tsunami',
  'cyclone',
  'volcano',
  'landslide',
  'tornado',
  'blizzard',
  'drought',
  'heatwave',
  'storm_surge',
  'structural_collapse',
  'industrial_hazard',
] as const;

export type DisasterType = (typeof DISASTER_TYPES)[number];

export const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const INCIDENT_STATUSES = ['active', 'monitoring', 'contained', 'resolved', 'false_alarm'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const VERIFICATION_STATUSES = ['pending', 'in_progress', 'verified', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const CREDIBILITY_CLASSIFICATIONS = [
  'highly_reliable',
  'likely_true',
  'needs_verification',
  'suspicious',
] as const;
export type CredibilityClassification = (typeof CREDIBILITY_CLASSIFICATIONS)[number];

export const USER_ROLES = ['citizen', 'responder', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// GeoJSON Point schema for reuse
const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true }, // [longitude, latitude]
}, { _id: false });

// GeoJSON Polygon schema for reuse
const GeoPolygonSchema = new Schema({
  type: { type: String, enum: ['Polygon'], default: 'Polygon' },
  coordinates: { type: [[[Number]]], required: true },
}, { _id: false });

// ============================================
// Incident Model
// ============================================

export interface IIncident extends Document {
  title: string;
  type: DisasterType;
  severity: SeverityLevel;
  status: IncidentStatus;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  dangerZone?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  description?: string;
  credibilityScore?: number;
  source: string; // 'usgs', 'nasa_firms', 'nasa_eonet', 'gdacs', 'citizen_report', 'reliefweb'
  sourceId?: string; // Original ID from the data source
  magnitude?: number; // For earthquakes
  depth?: number; // For earthquakes (km)
  tsunamiFlag?: boolean;
  brightness?: number; // For fires (FIRMS)
  confidence?: number; // Source confidence (0-100)
  affectedPopulation?: number;
  spreadPrediction?: {
    direction?: string;
    speed?: number;
    estimatedArea?: number;
    confidence?: number;
  };
  mediaUrls?: string[];
  verifiedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    title: { type: String, required: true },
    type: { type: String, enum: DISASTER_TYPES, required: true },
    severity: { type: String, enum: SEVERITY_LEVELS, required: true },
    status: { type: String, enum: INCIDENT_STATUSES, default: 'active' },
    location: {
      type: GeoPointSchema,
      required: true,
    },
    dangerZone: {
      type: GeoPolygonSchema,
      required: false,
    },
    description: String,
    credibilityScore: { type: Number, min: 0, max: 1 },
    source: { type: String, required: true },
    sourceId: String,
    magnitude: Number,
    depth: Number,
    tsunamiFlag: { type: Boolean, default: false },
    brightness: Number,
    confidence: { type: Number, min: 0, max: 100 },
    affectedPopulation: Number,
    spreadPrediction: {
      direction: String,
      speed: Number,
      estimatedArea: Number,
      confidence: Number,
    },
    mediaUrls: [String],
    verifiedAt: Date,
    resolvedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geospatial index for location-based queries
IncidentSchema.index({ location: '2dsphere' });
IncidentSchema.index({ dangerZone: '2dsphere' });
IncidentSchema.index({ type: 1, status: 1 });
IncidentSchema.index({ severity: 1 });
IncidentSchema.index({ source: 1, sourceId: 1 }, { unique: true, sparse: true });
IncidentSchema.index({ createdAt: -1 });

export const Incident: Model<IIncident> =
  mongoose.models.Incident || mongoose.model<IIncident>('Incident', IncidentSchema);

// ============================================
// Citizen Report Model
// ============================================

export interface IReport extends Document {
  userId?: string; // Clerk user ID
  incidentId?: mongoose.Types.ObjectId;
  type: DisasterType;
  severity: SeverityLevel;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
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
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    userId: String,
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incident' },
    type: { type: String, enum: DISASTER_TYPES, required: true },
    severity: { type: String, enum: SEVERITY_LEVELS, required: true },
    location: {
      type: GeoPointSchema,
      required: true,
    },
    address: String,
    description: { type: String, required: true },
    mediaUrls: [String],
    emergencyContact: String,
    isSOS: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'pending' },
    credibilityScore: { type: Number, min: 0, max: 1 },
    credibilityClassification: { type: String, enum: CREDIBILITY_CLASSIFICATIONS },
    aiAnalysisResults: {
      imageAnalysis: Schema.Types.Mixed,
      contentAnalysis: String,
      flags: [String],
    },
  },
  {
    timestamps: true,
  }
);

ReportSchema.index({ location: '2dsphere' });
ReportSchema.index({ verificationStatus: 1 });
ReportSchema.index({ type: 1 });
ReportSchema.index({ createdAt: -1 });

export const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);

// ============================================
// Rescue Team Model
// ============================================

export interface IRescueTeam extends Document {
  name: string;
  status: 'available' | 'deployed' | 'returning' | 'offline';
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  assignedIncident?: mongoose.Types.ObjectId;
  membersCount: number;
  vehicleType: string;
  specialization: string[];
  contactInfo: string;
  lastUpdate: Date;
  updatedAt: Date;
}

const RescueTeamSchema = new Schema<IRescueTeam>(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ['available', 'deployed', 'returning', 'offline'], default: 'available' },
    currentLocation: {
      type: GeoPointSchema,
      required: true,
    },
    assignedIncident: { type: Schema.Types.ObjectId, ref: 'Incident' },
    membersCount: { type: Number, required: true },
    vehicleType: { type: String, required: true },
    specialization: [String],
    contactInfo: String,
    lastUpdate: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

RescueTeamSchema.index({ currentLocation: '2dsphere' });
RescueTeamSchema.index({ status: 1 });

export const RescueTeam: Model<IRescueTeam> =
  mongoose.models.RescueTeam || mongoose.model<IRescueTeam>('RescueTeam', RescueTeamSchema);

// ============================================
// Shelter Model
// ============================================

export interface IShelter extends Document {
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  address: string;
  capacity: number;
  currentOccupancy: number;
  status: 'open' | 'full' | 'closed' | 'emergency_only';
  amenities: string[];
  contactInfo: string;
  disasterTypes: DisasterType[]; // Which disasters this shelter supports
}

const ShelterSchema = new Schema<IShelter>(
  {
    name: { type: String, required: true },
    location: {
      type: GeoPointSchema,
      required: true,
    },
    address: String,
    capacity: { type: Number, required: true },
    currentOccupancy: { type: Number, default: 0 },
    status: { type: String, enum: ['open', 'full', 'closed', 'emergency_only'], default: 'open' },
    amenities: [String],
    contactInfo: String,
    disasterTypes: [{ type: String, enum: DISASTER_TYPES }],
  },
  {
    timestamps: true,
  }
);

ShelterSchema.index({ location: '2dsphere' });
ShelterSchema.index({ status: 1 });

export const Shelter: Model<IShelter> =
  mongoose.models.Shelter || mongoose.model<IShelter>('Shelter', ShelterSchema);

// ============================================
// Alert Model
// ============================================

export interface IAlert extends Document {
  type: DisasterType;
  severity: SeverityLevel;
  title: string;
  message: string;
  source: string;
  affectedArea?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  affectedRegion?: string;
  instructions?: string;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    type: { type: String, enum: DISASTER_TYPES, required: true },
    severity: { type: String, enum: SEVERITY_LEVELS, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    source: { type: String, required: true },
    affectedArea: {
      type: GeoPolygonSchema,
      required: false,
    },
    affectedRegion: String,
    instructions: String,
    isActive: { type: Boolean, default: true },
    expiresAt: Date,
  },
  {
    timestamps: true,
  }
);

AlertSchema.index({ affectedArea: '2dsphere' });
AlertSchema.index({ isActive: 1 });
AlertSchema.index({ type: 1 });
AlertSchema.index({ createdAt: -1 });

export const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);

// ============================================
// Verification Score Model
// ============================================

export interface IVerificationScore extends Document {
  reportId: mongoose.Types.ObjectId;
  timestampCheck: number; // 0-1
  gpsValidation: number;
  weatherConsistency: number;
  satelliteCorrelation: number;
  aiImageAnalysis: number;
  aiContentAnalysis: number;
  overallScore: number;
  classification: CredibilityClassification;
  reasoning: string;
  flags: string[];
  createdAt: Date;
}

const VerificationScoreSchema = new Schema<IVerificationScore>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', required: true },
    timestampCheck: { type: Number, min: 0, max: 1 },
    gpsValidation: { type: Number, min: 0, max: 1 },
    weatherConsistency: { type: Number, min: 0, max: 1 },
    satelliteCorrelation: { type: Number, min: 0, max: 1 },
    aiImageAnalysis: { type: Number, min: 0, max: 1 },
    aiContentAnalysis: { type: Number, min: 0, max: 1 },
    overallScore: { type: Number, min: 0, max: 1, required: true },
    classification: { type: String, enum: CREDIBILITY_CLASSIFICATIONS, required: true },
    reasoning: String,
    flags: [String],
  },
  {
    timestamps: true,
  }
);

VerificationScoreSchema.index({ reportId: 1 });

export const VerificationScore: Model<IVerificationScore> =
  mongoose.models.VerificationScore ||
  mongoose.model<IVerificationScore>('VerificationScore', VerificationScoreSchema);

// ============================================
// Environmental Data Model
// ============================================

export interface IEnvironmentalData extends Document {
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  locationName?: string;
  temperature: number; // Celsius
  rainfall: number; // mm
  windSpeed: number; // km/h
  windDirection: number; // degrees
  humidity: number; // percentage
  pressure?: number; // hPa
  visibility?: number; // km
  uvIndex?: number;
  airQualityIndex?: number;
  weatherCode?: number;
  weatherDescription?: string;
  recordedAt: Date;
}

const EnvironmentalDataSchema = new Schema<IEnvironmentalData>(
  {
    location: {
      type: GeoPointSchema,
      required: true,
    },
    locationName: String,
    temperature: Number,
    rainfall: Number,
    windSpeed: Number,
    windDirection: Number,
    humidity: Number,
    pressure: Number,
    visibility: Number,
    uvIndex: Number,
    airQualityIndex: Number,
    weatherCode: Number,
    weatherDescription: String,
    recordedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

EnvironmentalDataSchema.index({ location: '2dsphere' });
EnvironmentalDataSchema.index({ recordedAt: -1 });

export const EnvironmentalData: Model<IEnvironmentalData> =
  mongoose.models.EnvironmentalData ||
  mongoose.model<IEnvironmentalData>('EnvironmentalData', EnvironmentalDataSchema);

// ============================================
// User Model
// ============================================

export interface IUser extends Document {
  clerkId: string;
  email: string;
  name?: string;
  role: UserRole;
  phone?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
    disasterTypes: DisasterType[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    name: String,
    role: { type: String, enum: USER_ROLES, default: 'citizen' },
    phone: String,
    location: {
      type: GeoPointSchema,
      required: false,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      disasterTypes: [{ type: String, enum: DISASTER_TYPES }],
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ clerkId: 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
