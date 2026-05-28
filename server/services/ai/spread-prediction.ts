import { IIncident } from '../db/models';

/**
 * Calculates a disaster spread prediction based on wind/meteorological data.
 * This is highly useful for wildfires and cyclones.
 */
export async function calculateSpreadPrediction(incident: IIncident, lat: number, lng: number) {
  if (incident.type !== 'wildfire' && incident.type !== 'cyclone') {
    return;
  }

  try {
    // Query Open-Meteo for wind speed and direction at the coordinates
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const response = await fetch(url);
    if (!response.ok) return;
    
    const data = await response.json();
    const weather = data.current_weather;
    
    if (weather && weather.windspeed !== undefined && weather.winddirection !== undefined) {
      // Calculate speed category based on windspeed (km/h)
      const windSpeed = weather.windspeed;
      const windDirection = weather.winddirection;
      
      // Convert degrees to cardinal direction for human readability
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
      const index = Math.round((windDirection % 360) / 45);
      const cardinalDirection = directions[index];

      // Extremely simplified calculation for demo purposes
      let speedFactor = windSpeed * 0.5; // Spread speed estimate
      
      incident.spreadPrediction = {
        direction: cardinalDirection,
        speed: speedFactor,
        estimatedArea: speedFactor * 2.5, // Arbitrary area growth per hour
        confidence: 85, // High confidence given live meteo data
      };
      
      await incident.save();
    }
  } catch (err) {
    console.error('[Spread Prediction] Failed to calculate:', err);
  }
}
