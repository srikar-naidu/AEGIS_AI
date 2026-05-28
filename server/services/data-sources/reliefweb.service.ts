import axios from 'axios';

// ============================================
// ReliefWeb API Service
// Humanitarian disaster reports and updates
// API Docs: https://apidoc.reliefweb.int/
// 100% Free, no API key required
// ============================================

export interface ReliefWebDisaster {
  id: string;
  fields: {
    name: string;
    description?: string;
    status: 'current' | 'past';
    type: Array<{
      id: number;
      name: string;
      code: string;
      primary?: boolean;
    }>;
    country: Array<{
      id: number;
      name: string;
      code: string;
      location?: {
        lat: number;
        lon: number;
      };
      primary?: boolean;
    }>;
    date: {
      created: string; // ISO
    };
    primary_country?: {
      id: number;
      name: string;
      code: string;
      location: {
        lat: number;
        lon: number;
      };
    };
    url: string;
  };
}

export interface ReliefWebResponse {
  took: number;
  total: number;
  data: ReliefWebDisaster[];
}

const RELIEFWEB_BASE = 'https://api.reliefweb.int/v1/disasters';

/**
 * Fetch ongoing global disasters from ReliefWeb
 */
export async function fetchReliefWebDisasters(limit = 20): Promise<ReliefWebDisaster[]> {
  try {
    const response = await axios.post<ReliefWebResponse>(
      RELIEFWEB_BASE,
      {
        filter: {
          field: 'status',
          value: 'current',
        },
        fields: {
          include: ['name', 'description', 'status', 'type', 'country', 'date', 'primary_country', 'url'],
        },
        limit,
        sort: ['date:desc'],
      },
      {
        timeout: 15000,
      }
    );

    const disasters = response.data?.data || [];
    console.log(`[ReliefWeb] Fetched ${disasters.length} ongoing disasters`);
    return disasters;
  } catch (error) {
    console.error('[ReliefWeb] Error fetching disasters:', error instanceof Error ? error.message : error);
    return [];
  }
}

// Map ReliefWeb disaster type names/codes to our standard types
export const RELIEFWEB_TYPE_MAP: Record<string, string> = {
  EQ: 'earthquake', // Earthquake
  EP: 'industrial_hazard', // Epidemic (map to hazard/other)
  FL: 'flood', // Flood
  TC: 'cyclone', // Tropical Cyclone
  VO: 'volcano', // Volcanic Activity
  DR: 'drought', // Drought
  WF: 'wildfire', // Wildfire
  TS: 'tsunami', // Tsunami
  LS: 'landslide', // Landslide
  ST: 'cyclone', // Storm / Severe Local Storm
  MS: 'landslide', // Mud Slide
  AV: 'landslide', // Avalanche
  CW: 'blizzard', // Cold Wave
  HW: 'heatwave', // Heat Wave
  OT: 'industrial_hazard', // Other
};

/**
 * Map ReliefWeb primary type code to our disaster type
 */
export function mapReliefWebType(types: ReliefWebDisaster['fields']['type']): string {
  const primaryType = types.find((t) => t.primary) || types[0];
  if (!primaryType) return 'industrial_hazard';
  return RELIEFWEB_TYPE_MAP[primaryType.code] || 'industrial_hazard';
}
