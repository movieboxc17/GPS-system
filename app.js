// Journey recorder and path drawer using GPS and cellular data

let map, path, marker;
let journey = [];
let watchId = null;
let started = false;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');

// Setup map
function initMap(lat = 51.505, lng = -0.09, zoom = 13) {
  map = L.map('map').setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
  path = L.polyline([], { color: '#2176ae', weight: 5 }).addTo(map);
  marker = L.marker([lat, lng]).addTo(map);
}

// Update map with current position
function updateMap(lat, lng) {
  marker.setLatLng([lat, lng]);
  path.addLatLng([lat, lng]);
  map.panTo([lat, lng]);
}

// Start journey recording
function startJourney() {
  if (!navigator.geolocation) {
    statusDiv.textContent = "Geolocation is not supported!";
    return;
  }
  started = true;
  journey = [];
  path.setLatLngs([]);
  statusDiv.textContent = "Journey recording started...";
  startBtn.disabled = true;
  stopBtn.disabled = false;
  downloadBtn.disabled = true;

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude, accuracy, timestamp } = pos.coords;
      journey.push({ latitude, longitude, accuracy, timestamp });
      updateMap(latitude, longitude);
      statusDiv.textContent = `Location: (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) | Accuracy: ${accuracy}m`;
    },
    err => {
      statusDiv.textContent = "Location error: " + err.message;
    },
    {
      enableHighAccuracy: true, // Try to use GPS + cellular
      maximumAge: 0,
      timeout: 10000
    }
  );
}

// Stop journey recording
function stopJourney() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  started = false;
  stopBtn.disabled = true;
  startBtn.disabled = false;
  downloadBtn.disabled = journey.length === 0;
  statusDiv.textContent = "Journey recording stopped.";
}

// Download journey as JSON
function downloadJourney() {
  const blob = new Blob([JSON.stringify(journey, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "journey.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  statusDiv.textContent = "Journey downloaded!";
}

// Event listeners
startBtn.addEventListener('click', startJourney);
stopBtn.addEventListener('click', stopJourney);
downloadBtn.addEventListener('click', downloadJourney);

// On page load, get location and initialize map
window.onload = function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        initMap(latitude, longitude, 16);
        updateMap(latitude, longitude);
      },
      () => {
        initMap(); // Default map
      }
    );
  } else {
    initMap();
  }
};
