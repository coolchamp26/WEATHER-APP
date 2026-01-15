import os
import time
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
API_KEY = os.getenv('WEATHER_API_KEY')
BASE_URL = "https://api.openweathermap.org/data/2.5"
CACHE_TIMEOUT = 300  # 5 minutes in seconds

# Simple in-memory cache
weather_cache = {}

def get_cached_data(key):
    """Retrieve data from cache if valid."""
    if key in weather_cache:
        timestamp, data = weather_cache[key]
        if time.time() - timestamp < CACHE_TIMEOUT:
            return data
        else:
            del weather_cache[key]
    return None

def set_cached_data(key, data):
    """Store data in cache."""
    weather_cache[key] = (time.time(), data)

def fetch_weather_api(endpoint, params):
    """Helper to call OpenWeatherMap API with error handling."""
    if not API_KEY:
        return {"error": "API Key not configured"}, 500
    
    params['appid'] = API_KEY
    params['units'] = 'metric'  # Default to metric
    
    try:
        response = requests.get(f"{BASE_URL}/{endpoint}", params=params)
        response.raise_for_status()
        return response.json(), 200
    except requests.exceptions.HTTPError as err:
        return {"error": str(err), "details": response.json() if response.content else {}}, response.status_code
    except Exception as e:
        return {"error": "Internal Server Error", "details": str(e)}, 500

@app.route('/')
def index():
    """Serve the frontend."""
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('images/favicon.png')

@app.route('/api/weather')
def get_current_weather():
    """Get current weather by city."""
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400
    
    # Check cache
    cache_key = f"weather_{city.lower()}"
    cached = get_cached_data(cache_key)
    if cached:
        return jsonify(cached)
    
    data, status = fetch_weather_api("weather", {"q": city})
    
    if status == 200:
        cleaned_data = {
            "city": data["name"],
            "country": data["sys"]["country"],
            "temp": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "temp_min": data["main"]["temp_min"],
            "temp_max": data["main"]["temp_max"],
            "humidity": data["main"]["humidity"],
            "pressure": data["main"]["pressure"],
            "wind_speed": data["wind"]["speed"],
            "wind_deg": data["wind"].get("deg", 0),
            "visibility": data.get("visibility", 10000),
            "condition": data["weather"][0]["main"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "sunrise": data["sys"]["sunrise"],
            "sunset": data["sys"]["sunset"],
            "dt": data["dt"],
            "timezone": data["timezone"]
        }
        set_cached_data(cache_key, cleaned_data)
        return jsonify(cleaned_data)
    
    return jsonify(data), status

@app.route('/api/forecast')
def get_forecast():
    """Get 5-day forecast by city."""
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    # Check cache
    cache_key = f"forecast_{city.lower()}"
    cached = get_cached_data(cache_key)
    if cached:
        return jsonify(cached)

    data, status = fetch_weather_api("forecast", {"q": city})
    
    if status == 200:
        # Process forecast data to get daily summary or raw list
        # For simplicity, sending raw list but frontend can filter for daily
        # Or we can group by day here. Let's send the raw list with relevant fields to keep backend simple
        # but also provide a processed 'daily' list if possible.
        
        # OWM 5 day forecast returns data every 3 hours.
        # We'll just pass through relevant fields to keep payload light.
        
        processed_list = []
        for item in data['list']:
            processed_list.append({
                "dt": item["dt"],
                "temp": item["main"]["temp"],
                "condition": item["weather"][0]["main"],
                "icon": item["weather"][0]["icon"],
                "dt_txt": item["dt_txt"]
            })
            
        cleaned_data = {
            "city": data["city"]["name"],
            "country": data["city"]["country"],
            "list": processed_list
        }
        
        set_cached_data(cache_key, cleaned_data)
        return jsonify(cleaned_data)

    return jsonify(data), status

@app.route('/api/weather/coords')
def get_weather_by_coords():
    """Get weather by latitude and longitude."""
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({"error": "lat and lon parameters are required"}), 400

    # Cache key for coords? Rounding to 2 decimal places to catch nearby
    lat_r = round(float(lat), 2)
    lon_r = round(float(lon), 2)
    cache_key = f"weather_coords_{lat_r}_{lon_r}"
    
    cached = get_cached_data(cache_key)
    if cached:
        return jsonify(cached)

    data, status = fetch_weather_api("weather", {"lat": lat, "lon": lon})
    
    if status == 200:
        cleaned_data = {
            "city": data["name"],
            "country": data["sys"]["country"],
            "temp": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "temp_min": data["main"]["temp_min"],
            "temp_max": data["main"]["temp_max"],
            "humidity": data["main"]["humidity"],
            "pressure": data["main"]["pressure"],
            "wind_speed": data["wind"]["speed"],
            "wind_deg": data["wind"].get("deg", 0),
            "visibility": data.get("visibility", 10000),
            "condition": data["weather"][0]["main"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"],
            "sunrise": data["sys"]["sunrise"],
            "sunset": data["sys"]["sunset"],
            "dt": data["dt"],
            "timezone": data["timezone"]
        }
        set_cached_data(cache_key, cleaned_data)
        return jsonify(cleaned_data)
        
    return jsonify(data), status

if __name__ == '__main__':
    app.run(debug=True)
