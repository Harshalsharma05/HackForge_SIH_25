from flask import Flask, request, jsonify
from detector import detect_movement_anomalies

app = Flask(__name__)

@app.route('/analyze/location', methods=['POST'])
def analyze_location_endpoint():
    json_data = request.get_json()

    if not json_data or 'location_history' not in json_data or len(json_data['location_history']) < 2:
        return jsonify({"is_anomaly": False, "reason": "Not enough data for analysis"}), 200

    try:
        anomalies = detect_movement_anomalies(json_data['location_history'])

        if anomalies:
            # For the demo, we return the first and most critical anomaly
            return jsonify({
                "is_anomaly": True,
                "anomaly_details": anomalies[0] # Return the first anomaly found
            })
        else:
            return jsonify({"is_anomaly": False})

    except Exception as e:
        print(f"Error during analysis: {e}")
        return jsonify({"error": "An internal error occurred."}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)