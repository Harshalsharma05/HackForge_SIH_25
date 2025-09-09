// Mock data for testing authority dashboard
export const mockTourists = [
  {
    _id: 'tourist_001',
    latitude: 28.6139,
    longitude: 77.2090,
    timestamp: new Date().toISOString(),
    status: 'active'
  },
  {
    _id: 'tourist_002', 
    latitude: 28.6200,
    longitude: 77.2150,
    timestamp: new Date().toISOString(),
    status: 'active'
  }
];

export const mockGeofences = [
  {
    _id: 'geo_001',
    name: 'Red Fort Area',
    latitude: 28.6562,
    longitude: 77.2410,
    radius_km: 0.5,
    risk_level: 'low'
  },
  {
    _id: 'geo_002',
    name: 'Danger Zone',
    latitude: 28.6100,
    longitude: 77.2000,
    radius_km: 0.3,
    risk_level: 'high'
  }
];

export const mockAlerts = [
  {
    _id: 'alert_001',
    type: 'panic',
    description: 'Tourist pressed panic button',
    timestamp: new Date().toISOString(),
    resolved: false
  },
  {
    _id: 'alert_002',
    type: 'geo_fence',
    description: 'Tourist entered danger zone',
    timestamp: new Date().toISOString(),
    resolved: false
  }
];