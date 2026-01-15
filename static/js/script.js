document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const locationBtn = document.getElementById('location-btn');
    const unitToggleBtn = document.getElementById('unit-toggle');
    const favoriteBtn = document.getElementById('favorite-btn');
    const favoritesList = document.getElementById('favorites-list');

    // UI Elements to update
    const cityNameEl = document.getElementById('city-name');
    const dateTimeEl = document.getElementById('date-time');
    const tempEl = document.getElementById('temperature');
    const conditionTextEl = document.getElementById('condition-text');
    const weatherIconEl = document.getElementById('weather-icon');
    const humidityEl = document.getElementById('humidity');
    const windEl = document.getElementById('wind-speed');
    const visibilityEl = document.getElementById('visibility');
    const pressureEl = document.getElementById('pressure');

    const forecastContainer = document.getElementById('forecast-container');
    const loader = document.getElementById('loader');
    const errorToast = document.getElementById('error-toast');
    const errorMsg = document.getElementById('error-msg');

    // --- State ---
    let currentUnit = 'metric'; // 'metric' (C) or 'imperial' (F)
    let currentCity = 'Delhi'; // Default city
    let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];

    // --- Initial Load ---
    renderFavorites();
    fetchWeather(currentCity);

    // --- Event Listeners ---
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
            cityInput.value = '';
        }
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    locationBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            showLoader();
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    hideLoader();
                    showError("Location access denied or unavailable.");
                }
            );
        } else {
            showError("Geolocation is not supported by this browser.");
        }
    });

    unitToggleBtn.addEventListener('click', () => {
        currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
        unitToggleBtn.textContent = currentUnit === 'metric' ? '°C' : '°F';
        // Re-fetch to convert units
        // Note: API returns metric by default. We can either ask API for imperial or convert locally.
        // For simplicity and to stick to "Use metric as default" requirement, we will convert locally for display
        // IF we stored the data. But fetching again is cleaner if we want to support switching completely.
        // However, the backend is hardcoded to units='metric'. So we will convert locally.

        // Actually, let's just re-render if we have data, converting on the fly.
        // To do this simply without global data state, we'll just re-fetch and I'll add logic to convert in render.
        // Or better: update the backend to accept units.
        // But backend is set to 'metric'. So I will do client-side conversion for proper seamless toggle.

        // Let's re-fetch. It's fast enough with cache.
        fetchWeather(currentCity);
    });

    favoriteBtn.addEventListener('click', () => {
        toggleFavorite(currentCity);
    });

    // --- Core Functions ---

    async function fetchWeather(city) {
        showLoader();
        try {
            const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (response.ok) {
                currentCity = data.city; // Update current city from valid response
                updateCurrentWeatherUI(data);
                applyTheme(data.condition, data.icon);
                updateFavoriteBtnState();

                // Fetch Forecast
                fetchForecast(city);
            } else {
                showError(data.error || "City not found");
            }
        } catch (error) {
            showError("Network error. Please try again.");
        } finally {
            hideLoader();
        }
    }

    async function fetchWeatherByCoords(lat, lon) {
        showLoader();
        try {
            const response = await fetch(`/api/weather/coords?lat=${lat}&lon=${lon}`);
            const data = await response.json();

            if (response.ok) {
                currentCity = data.city;
                updateCurrentWeatherUI(data);
                applyTheme(data.condition, data.icon);
                updateFavoriteBtnState();

                // Fetch Forecast using city name derived from coords
                fetchForecast(data.city);
            } else {
                showError(data.error || "Could not determine location weather");
            }
        } catch (error) {
            showError("Network error.");
        } finally {
            hideLoader();
        }
    }

    async function fetchForecast(city) {
        try {
            const response = await fetch(`/api/forecast?city=${encodeURIComponent(city)}`);
            const data = await response.json();

            if (response.ok) {
                renderForecast(data.list);
            }
        } catch (error) {
            console.error("Error fetching forecast:", error);
        }
    }

    // --- UI Update Functions ---

    function updateCurrentWeatherUI(data) {
        cityNameEl.textContent = `${data.city}, ${data.country}`;

        // Date Time
        const date = new Date(data.dt * 1000);
        dateTimeEl.textContent = date.toLocaleDateString("en-US", { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

        // Temp Conversion interaction
        const tempVal = convertTemp(data.temp);
        tempEl.textContent = Math.round(tempVal);

        conditionTextEl.textContent = data.condition;
        weatherIconEl.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

        humidityEl.textContent = `${data.humidity}%`;

        // Wind Speed (m/s from API, convert if needed. Let's keep metric m/s or km/h)
        // API 'metric' returns m/s. Let's show km/h => m/s * 3.6
        const windKm = (data.wind_speed * 3.6).toFixed(1);
        windEl.textContent = `${windKm} km/h`;

        const visibilityKm = (data.visibility / 1000).toFixed(1);
        visibilityEl.textContent = `${visibilityKm} km`;

        pressureEl.textContent = `${data.pressure} hPa`;
    }

    function renderForecast(list) {
        forecastContainer.innerHTML = '';

        // We get a list of 3-hour steps. We want daily.
        // Strategy: Pick one entry per day (e.g., at noon)
        // Or simply take the next 5 items if we want 3-hour steps?
        // Requirement said "5-day forecast".
        // Let's filter for approx noon items "12:00:00" string match or just default to 5 distinct days.

        const dailyData = [];
        const seenDates = new Set();

        list.forEach(item => {
            const dateTxt = item.dt_txt.split(' ')[0]; // YYYY-MM-DD
            if (!seenDates.has(dateTxt) && item.dt_txt.includes("12:00:00")) {
                dailyData.push(item);
                seenDates.add(dateTxt);
            }
        });

        // If we don't have enough noon data (e.g. late night query), just take the first entry of each new day
        if (dailyData.length < 5) {
            const fallbackSet = new Set();
            list.forEach(item => {
                const dateTxt = item.dt_txt.split(' ')[0];
                if (!fallbackSet.has(dateTxt)) {
                    dailyData.push(item);
                    fallbackSet.add(dateTxt);
                }
            });
            // Dedupe with the first approach if needed, but the Set handles it.
            // We need to re-sort or just limit to 5.
        }

        dailyData.slice(0, 5).forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayName = date.toLocaleDateString("en-US", { weekday: 'short' });
            const temp = Math.round(convertTemp(item.temp));

            const div = document.createElement('div');
            div.className = 'forecast-item';
            div.innerHTML = `
                <div class="forecast-date">${dayName}</div>
                <img class="forecast-icon" src="https://openweathermap.org/img/wn/${item.icon}.png" alt="icon">
                <div class="forecast-temp">${temp}°</div>
            `;
            forecastContainer.appendChild(div);
        });
    }

    // --- Helpers ---

    function convertTemp(tempC) {
        if (currentUnit === 'imperial') {
            return (tempC * 9 / 5) + 32;
        }
        return tempC;
    }

    function applyTheme(condition, iconCode) {
        document.body.className = ''; // clear classes

        // Determine theme based on condition
        // Conditions: Thunderstorm, Drizzle, Rain, Snow, Atmosphere, Clear, Clouds

        const cond = condition.toLowerCase();

        // Check for night (icon ends in 'n')
        const isNight = iconCode.endsWith('n');

        if (isNight) {
            document.body.classList.add('theme-night');
            return;
        }

        if (cond.includes('clear')) {
            document.body.classList.add('theme-sunny');
        } else if (cond.includes('cloud')) {
            document.body.classList.add('theme-cloudy');
        } else if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('thunder')) {
            document.body.classList.add('theme-rainy');
        } else if (cond.includes('snow')) {
            document.body.classList.add('theme-snow');
        } else {
            document.body.classList.add('theme-cloudy'); // Default fallback
        }
    }

    // --- Favorites Logic ---
    function toggleFavorite(city) {
        const index = favorites.indexOf(city);
        if (index === -1) {
            favorites.push(city);
        } else {
            favorites.splice(index, 1);
        }
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        updateFavoriteBtnState();
        renderFavorites();
    }

    function updateFavoriteBtnState() {
        if (favorites.includes(currentCity)) {
            favoriteBtn.innerHTML = '<i class="fa-solid fa-star" style="color: #f1c40f;"></i>';
        } else {
            favoriteBtn.innerHTML = '<i class="fa-regular fa-star"></i>';
        }
    }

    function renderFavorites() {
        favoritesList.innerHTML = '';
        favorites.forEach(city => {
            const li = document.createElement('li');
            li.className = 'fav-item';
            li.textContent = city;
            li.onclick = () => fetchWeather(city);
            favoritesList.appendChild(li);
        });
    }

    // --- Loader & Error ---
    function showLoader() {
        loader.classList.remove('hidden');
    }

    function hideLoader() {
        loader.classList.add('hidden');
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorToast.classList.remove('hidden');
        setTimeout(() => {
            errorToast.classList.add('hidden');
        }, 3000);
    }
});
