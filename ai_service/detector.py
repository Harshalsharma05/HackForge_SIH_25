import pandas as pd
import numpy as np

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth's radius in meters
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(np.radians, [lat1, lon1, lat2, lon2])
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    a = np.sin(dlat / 2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2)**2
    c = 2 * np.arcsin(np.sqrt(a))
    return R * c

def detect_movement_anomalies(location_history):
    anomalies = []
    
    # Convert list of dicts to a Pandas DataFrame
    df = pd.DataFrame(location_history)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    if len(df) < 2:
        return anomalies
        
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    df['prev_lat'] = df['latitude'].shift(1)
    df['prev_lon'] = df['longitude'].shift(1)
    df['prev_time'] = df['timestamp'].shift(1)
    
    # Analyze the most recent movement (from the second to last to the last point)
    latest_point = df.iloc[-1]
    
    distance_moved = haversine(
        latest_point['latitude'], latest_point['longitude'], 
        latest_point['prev_lat'], latest_point['prev_lon']
    )
    
    time_diff_seconds = (latest_point['timestamp'] - latest_point['prev_time']).total_seconds()

    # RULE 1: PROLONGED INACTIVITY (Immobility)
    # If the time gap is long but the distance moved is very short
    if time_diff_seconds > (30 * 60) and distance_moved < 50: # 30 minutes, 50 meters
        anomalies.append({
            "type": "immobility",
            "title": "Prolonged Inactivity",
            "description": f"Tourist has been stationary for {time_diff_seconds/60:.1f} minutes.",
            "severity": "medium",
        })

    # RULE 2: ABNORMAL SPEED
    if time_diff_seconds > 0:
        speed_kph = (distance_moved / 1000) / (time_diff_seconds / 3600)
        if speed_kph > 120: # Faster than a typical car on a highway
            anomalies.append({
                "type": "abnormal_speed",
                "title": "Abnormal Speed Detected",
                "description": f"An unusually high speed of {speed_kph:.1f} km/h was detected.",
                "severity": "high",
            })
            
    # RULE 3: SUDDEN LOCATION DROPOFF (Signal Loss)
    # This is detected if the time gap is very large, e.g., > 1 hour
    if time_diff_seconds > (60 * 60):
        anomalies.append({
            "type": "signal_loss",
            "title": "Sudden Location Drop-off",
            "description": f"Location signal was lost for {time_diff_seconds/60:.1f} minutes.",
            "severity": "high",
        })
            
    return anomalies