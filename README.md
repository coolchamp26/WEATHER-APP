# 🌤️ Modern Weather App

A beautiful, full-stack weather application built with Python Flask and Vanilla JavaScript. Features a glassmorphism UI, dynamic themes, and comprehensive weather data using the OpenWeatherMap API.

## 🚀 Features

- **Current Weather**: Temperature, humidity, wind, visibility, pressure, sunrise/sunset.
- **5-Day Forecast**: Daily breakdown with visual icons.
- **Dynamic Themes**: UI changes based on weather conditions (Sunny, Rainy, Cloudy, Night, Snow).
- **Geolocation**: Auto-detects user location.
- **Smart Search**: Search by city name.
- **Favorites & History**: Save favorite cities and view recent searches (LocalStorage).
- **Responsive Design**: Mobile-first glassmorphism interface.

## 🛠️ Tech Stack

- **Backend**: Python, Flask
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **API**: OpenWeatherMap

## ⚙️ Setup & Installation

1.  **Clone the repository** (or download the source):
    ```bash
    git clone <repository-url>
    cd weather-app
    ```

2.  **Create a Virtual Environment**:
    ```bash
    python -m venv venv
    
    # Windows
    venv\Scripts\activate
    
    # macOS/Linux
    source venv/bin/activate
    ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure API Key**:
    - Sign up at [OpenWeatherMap](https://openweathermap.org/api) to get a free API key.
    - Create a `.env` file in the root directory (copy from `.env.example`).
    - Add your key:
      ```
      WEATHER_API_KEY=your_actual_api_key_here
      ```

5.  **Run the Application**:
    ```bash
    python app.py
    ```
    The app will start at `http://127.0.0.1:5000`.

## 📂 Project Structure

```
weather-app/
│── app.py              # Flask Backend
│── requirements.txt    # Python Dependencies
│── .env                # Environment Variables (API Key)
│── static/
│   ├── css/            # Stylesheets
│   ├── js/             # Frontend Logic
│   └── assets/         # Images/Icons
└── templates/
    └── index.html      # Main HTML File
```

## 🔒 Security Note

Never commit your `.env` file containing real API keys to version control.

---
Built with ❤️ by Antigravity
