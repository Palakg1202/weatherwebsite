// --- Updated main.js using Open-Meteo API (no API key needed) ---

const cityInput = document.getElementById('city-input');
const suggestionsList = document.getElementById('suggestions');

const temperatureEl = document.getElementById('temperature');
const conditionEl = document.getElementById('condition');
const locationEl = document.getElementById('location');
const unitToggle = document.getElementById('unit-toggle');

const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('wind-speed');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const uvIndexEl = document.getElementById('uv-index');
const weatherIconEl = document.getElementById('weather-icon');

const hourlyForecastEl = document.getElementById('hourly-forecast');
const dailyForecastEl = document.getElementById('daily-forecast');

const bgImageEl = document.getElementById('bg-image');
const animationContainer = document.getElementById('animation-container');

let currentUnit = 'celsius'; // "celsius" or "fahrenheit"
let currentCity = null;

let debounceTimer = null;

// Utility: Capitalize string
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Format time in local timezone
function formatTime(dateStr, timezoneOffsetSec) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Convert °C to °F and vice versa
function cToF(c) {
  return Math.round(c * 9 / 5 + 32);
}
function fToC(f) {
  return Math.round((f - 32) * 5 / 9);
}

// Clear suggestions list
function clearSuggestions() {
  suggestionsList.innerHTML = '';
}

// Event: Input city name for autocomplete (Open-Meteo geocoding)
cityInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const query = cityInput.value.trim();
  if (query.length < 2) {
    clearSuggestions();
    return;
  }
  debounceTimer = setTimeout(() => {
    fetchCitySuggestions(query);
  }, 300);
});

// Fetch city suggestions with Open-Meteo geocoding API (no key)
async function fetchCitySuggestions(query) {
  clearSuggestions();
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch city suggestions');
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      clearSuggestions();
      return;
    }

    data.results.forEach(city => {
      const li = document.createElement('li');
      li.textContent = `${city.name}${city.admin1 ? ', ' + city.admin1 : ''}, ${city.country}`;
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.dataset.lat = city.latitude;
      li.dataset.lon = city.longitude;
      li.dataset.name = city.name;
      li.dataset.country = city.country;
      li.dataset.admin1 = city.admin1 || '';

      li.addEventListener('click', () => {
        selectCity(li);
      });
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectCity(li);
        }
      });

      suggestionsList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    clearSuggestions();
  }
}

// Select city and fetch weather
function selectCity(element) {
  clearSuggestions();

  currentCity = {
    name: element.dataset.name,
    country: element.dataset.country,
    admin1: element.dataset.admin1,
    lat: parseFloat(element.dataset.lat),
    lon: parseFloat(element.dataset.lon)
  };

  cityInput.value = `${currentCity.name}${currentCity.admin1 ? ', ' + currentCity.admin1 : ''}, ${currentCity.country}`;

  fetchWeatherData(currentCity.lat, currentCity.lon);
}

// Fetch weather data from Open-Meteo
async function fetchWeatherData(lat, lon) {
  // Clear UI and show loading states
  setLoadingState(true);

  const unitTemp = currentUnit === 'celsius' ? 'celsius' : 'fahrenheit';

  // Open-Meteo API params
  // Request current weather, hourly and daily with UV index, windspeed, sunrise/sunset, humidity
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,weathercode,apparent_temperature,precipitation_probability,uv_index` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max,windspeed_10m_max,precipitation_sum` +
    `&current_weather=true&timezone=auto&temperature_unit=${unitTemp}&windspeed_unit=kmh`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch weather data');
    const data = await res.json();

    updateCurrentWeather(data.current_weather);
    updateHourlyForecast(data.hourly, data.hourly.time);
    updateDailyForecast(data.daily);
    updateExtraDetails(data.current_weather, data.daily);

    updateBackgroundAndAnimation(data.current_weather.weathercode);

    if(currentCity) {
      locationEl.textContent = `${currentCity.name}${currentCity.admin1 ? ', ' + currentCity.admin1 : ''}, ${currentCity.country}`;
    }

  } catch (e) {
    console.error('Error fetching weather:', e);
    alert('Failed to load weather data. Please try another city or later.');
  } finally {
    setLoadingState(false);
  }
}

function setLoadingState(isLoading) {
  if(isLoading) {
    temperatureEl.textContent = '--°';
    conditionEl.textContent = 'Loading...';
    feelsLikeEl.textContent = '--';
    humidityEl.textContent = '--';
    windSpeedEl.textContent = '--';
    sunriseEl.textContent = '--';
    sunsetEl.textContent = '--';
    uvIndexEl.textContent = '--';
    hourlyForecastEl.innerHTML = '';
    dailyForecastEl.innerHTML = '';
    weatherIconEl.src = 'images/sun.jpg';
    weatherIconEl.alt = 'Loading weather icon';
  }
}

// Map Open-Meteo weathercode to icon and description
// Codes listed at https://open-meteo.com/en/docs#api-formats
function mapWeatherCodeToIconDesc(code) {
  // Weather codes reference https://open-meteo.com/en/docs#latitude=52.52&longitude=13.41&hourly=weathercode
  // Return object with icon filename (matching images/) and description string
  // Simplified mapping for demo:
  if ([0].includes(code)) return {icon: 'sun', desc: 'Clear sky'};
  if ([1,2,3].includes(code)) return {icon: 'cloud-sun', desc: 'Partly cloudy'};
  if ([45,48].includes(code)) return {icon: 'fog', desc: 'Fog'};
  if ([51,53,55,56,57].includes(code)) return {icon: 'rain', desc: 'Drizzle'};
  if ([61,63,65,66,67].includes(code)) return {icon: 'rain', desc: 'Rain'};
  if ([71,73,75,77].includes(code)) return {icon: 'snow', desc: 'Snow'};
  if ([80,81,82].includes(code)) return {icon: 'rain', desc: 'Rain showers'};
  if ([85,86].includes(code)) return {icon: 'snow', desc: 'Snow showers'};
  if ([95,96,99].includes(code)) return {icon: 'thunderstorm', desc: 'Thunderstorm'};
  return {icon: 'sun', desc: 'Clear sky'}; // fallback
}

function updateCurrentWeather(current) {
  if(!current) return;

  // Temperature
  let temp = Math.round(current.temperature);
  let feelsLike = '--';
  // Open-Meteo API doesn't provide apparent temp at current_weather; appeared in hourly, so approximate with same temp for now
  feelsLikeEl.textContent = '--';

  temperatureEl.textContent = `${temp}°`;

  // Map weather code to icon and description
  const {icon, desc} = mapWeatherCodeToIconDesc(current.weathercode);
  conditionEl.textContent = capitalize(desc);

  weatherIconEl.src = `images/${icon}.jpg`;
  weatherIconEl.alt = capitalize(desc);

  // humidity, windspeed not in current_weather in Open-Meteo
  humidityEl.textContent = '--';
  windSpeedEl.textContent = Math.round(current.windspeed || 0);
  windSpeedEl.innerHTML += current.windspeed_unit ? ` km/h` : ' km/h';

  // sunrise & sunset from daily, set empty here
  sunriseEl.textContent = '--';
  sunsetEl.textContent = '--';

  uvIndexEl.textContent = '--';

  if(currentCity) {
    locationEl.textContent = `${currentCity.name}${currentCity.admin1 ? ', ' + currentCity.admin1 : ''}, ${currentCity.country}`;
  }
}

function updateHourlyForecast(hourly, timeArray) {
  hourlyForecastEl.innerHTML = '';
  if (!hourly || !timeArray) return;
  
  // We'll show next 24 hours forecast
  for (let i = 0; i < Math.min(24, timeArray.length); i++) {
    const timeStr = timeArray[i];
    const dateTime = new Date(timeStr);
    const hourLabel = (i === 0) ? 'Now' : dateTime.toLocaleTimeString([], {hour: 'numeric', hour12: true});
    const temp = Math.round(hourly.temperature_2m[i]);
    const weathercode = hourly.weathercode ? hourly.weathercode[i] : 0;
    const {icon, desc} = mapWeatherCodeToIconDesc(weathercode);

    const hourDiv = document.createElement('div');
    hourDiv.className = 'hour-hour';
    hourDiv.setAttribute('tabindex', '0');
    hourDiv.setAttribute('role', 'listitem');
    hourDiv.innerHTML = `
      <div class="hour-label">${hourLabel}</div>
      <img src="images/${icon}.jpg" alt="${capitalize(desc)} icon" loading="lazy" />
      <div class="hour-temp">${temp}°</div>
    `;
    hourlyForecastEl.appendChild(hourDiv);
  }
}

function updateDailyForecast(daily) {
  dailyForecastEl.innerHTML = '';
  if (!daily || !daily.time) return;
  // Start from today, showing next 7 days or as available
  for(let i = 0; i < Math.min(7, daily.time.length); i++) {
    const date = new Date(daily.time[i]);
    const dayName = date.toLocaleDateString(undefined, {weekday:'long'});
    const iconData = mapWeatherCodeToIconDesc(daily.weathercode[i]);
    const high = Math.round(daily.temperature_2m_max[i]);
    const low = Math.round(daily.temperature_2m_min[i]);
    
    const card = document.createElement('div');
    card.className = 'daily-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <div class="daily-day">${dayName}</div>
      <img src="images/${iconData.icon}.jpg" alt="${capitalize(iconData.desc)} icon" loading="lazy" />
      <div class="daily-temps">
        <span class="high">${high}°</span>
        <span class="low">${low}°</span>
      </div>
    `;
    dailyForecastEl.appendChild(card);
  }
}

function updateExtraDetails(current, daily) {
  // current contains temperature, windspeed, weathercode; daily contains sunrise, sunset, uv_index_max, humidity is unavailable in Open-Meteo direct
  if(!current || !daily) return;

  // feels like approximated as real temp - Open-Meteo doesn't provide real apparent temperature in current_weather
  feelsLikeEl.textContent = '--';
  // humidity not in current_weather, so unknown
  humidityEl.textContent = '--'; 

  if(current.windspeed !== undefined) {
    windSpeedEl.textContent = Math.round(current.windspeed);
    windSpeedEl.innerHTML += ' km/h';
  } else {
    windSpeedEl.textContent = '--';
  }

  sunriseEl.textContent = daily.sunrise ? formatTime(daily.sunrise[0]) : '--';
  sunsetEl.textContent = daily.sunset ? formatTime(daily.sunset[0]) : '--';
  uvIndexEl.textContent = daily.uv_index_max ? daily.uv_index_max[0].toFixed(1) : '--';
}

// Background and animation updates
function clearAnimations() {
  animationContainer.innerHTML = '';
}

function createCloud(sizeClass, delayMultiplier, topPercent, leftStartVW) {
  const cloud = document.createElement('div');
  cloud.classList.add('cloud', sizeClass);
  cloud.style.setProperty('--i', delayMultiplier);
  cloud.style.top = `${topPercent}vh`;
  cloud.style.left = `${leftStartVW}vw`;
  animationContainer.appendChild(cloud);
}

function createRainDrops(count) {
  clearAnimations();
  for (let i = 0; i < count; i++) {
    const drop = document.createElement('div');
    drop.classList.add('rain-drop');
    drop.style.left = `${Math.random() * 100}vw`;
    drop.style.animationDuration = `${0.5 + Math.random()}s`;
    drop.style.animationDelay = `${-Math.random() * 2}s`;
    animationContainer.appendChild(drop);
  }
}

function createLightningFlash() {
  clearAnimations();
  const flash = document.createElement('div');
  flash.classList.add('lightning-flash');
  animationContainer.appendChild(flash);
}

function createSunGlow() {
  clearAnimations();
  const glow = document.createElement('div');
  glow.classList.add('sun-glow');
  animationContainer.appendChild(glow);
}

function updateBackgroundAndAnimation(weathercode) {
  let bgSrc = 'images/clear.jpg';
  clearAnimations();
  // Map weathercode to background and animation
  // Based on simplified groups from Open-Meteo
  if ([0].includes(weathercode)) {
    bgSrc = 'images/clear.jpg';
    createSunGlow();
  } else if ([1,2,3].includes(weathercode)) {
    bgSrc = 'images/clouds.jpg';
    createCloud('small', 1, 15, -20);
    createCloud('medium', 1.5, 25, -40);
    createCloud('large', 0.8, 35, -30);
    createCloud('small', 2, 45, -10);
  } else if ([45,48].includes(weathercode)) {
    bgSrc = 'images/foggy.jpg';
  } else if ([51,53,55,56,57,61,63,65,80,81,82].includes(weathercode)) {
    bgSrc = 'images/rain.jpg';
    createRainDrops(50);
  } else if ([95,96,99].includes(weathercode)) {
    bgSrc = 'images/storms.jpg';
    createRainDrops(30);
    createLightningFlash();
  } else if ([71,73,75,77,85,86].includes(weathercode)) {
    bgSrc = 'images/snow.jpg';
  } else {
    bgSrc = 'images/clear.jpg';
    createSunGlow();
  }

  // Update background image and alt text
  const altTextMap = {
    sunny: 'Sunny weather background with clear sky',
    cloudy: 'Cloudy weather background with soft clouds',
    rainy: 'Rainy weather background with raindrops',
    stormy: 'Stormy weather background with lightning',
    foggy: 'Foggy weather background with mist',
    snowy: 'Snowy weather background with snow',
  };
  const altText = altTextMap[bgSrc.split('/').pop().split('.')[0]] || 'Weather background';

  bgImageEl.src = bgSrc;
  bgImageEl.alt = altText;
}

// Temperature unit toggle event
unitToggle.addEventListener('click', () => {
  if(!currentCity) return; // ignore if no city selected
  currentUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
  unitToggle.textContent = currentUnit === 'celsius' ? '°C' : '°F';
  fetchWeatherData(currentCity.lat, currentCity.lon);
});

// Keyboard navigation of suggestions (optional enhancement)
cityInput.addEventListener('keydown', (e) => {
  const items = Array.from(suggestionsList.children);
  if (!items.length) return;

  let selectedIndex = items.findIndex(item => item.getAttribute('aria-selected') === 'true');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (selectedIndex === -1 || selectedIndex === items.length -1) {
      selectSuggestion(0);
    } else {
      selectSuggestion(selectedIndex + 1);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (selectedIndex <= 0) {
      selectSuggestion(items.length - 1);
    } else {
      selectSuggestion(selectedIndex - 1);
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if(selectedIndex !== -1) {
      selectCity(items[selectedIndex]);
      clearSuggestions();
    }
  }
});

function selectSuggestion(index) {
  const items = suggestionsList.children;
  Array.from(items).forEach((item,i) => {
    item.setAttribute('aria-selected', i === index ? 'true' : 'false');
  });
  if(items[index]) items[index].focus();
}

// Initialization placeholder text
temperatureEl.textContent = '--°';
conditionEl.textContent = 'Search a city...';
locationEl.textContent = '--';




