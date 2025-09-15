let map, currentMarker;
let journey = [];
let markers = [];
let path = null;
let watchId = null;
let started = false;

// Setup map
function initMap(lat = 51.505, lng = -0.09, zoom = 13) {
  map = L.map('map').setView([lat, lng], zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
}

function addPin(lat, lng, info) {
  const marker = L.marker([lat, lng]).addTo(map);
  marker.bindPopup(info).openPopup();
  markers.push(marker);
}

function clearPins() {
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
}

function drawPath(points) {
  if (path) {
    map.removeLayer(path);
  }
  path = L.polyline(points, { color: '#2176ae', weight: 5 }).addTo(map);
  if (points.length) {
    map.fitBounds(path.getBounds());
  }
}

// Start journey recording
function startJourney() {
  if (!navigator.geolocation) {
    document.getElementById('status').textContent = "Geolocation is not supported!";
    return;
  }
  started = true;
  journey = [];
  clearPins();
  if (path) {
    map.removeLayer(path);
    path = null;
  }
  document.getElementById('status').textContent = "Recording journey with pins...";
  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled = false;
  document.getElementById('downloadBtn').disabled = true;

  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude, accuracy, timestamp } = pos.coords;
      journey.push({ latitude, longitude, accuracy, timestamp });
      addPin(latitude, longitude, `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}<br>Accuracy: ${accuracy}m`);
      map.panTo([latitude, longitude]);
      document.getElementById('status').textContent = `Pin placed at (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) | Accuracy: ${accuracy}m`;
    },
    err => {
      document.getElementById('status').textContent = "Location error: " + err.message;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    }
  );
}

// When stopped, show path line, remove pins
function stopJourney() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  started = false;
  document.getElementById('stopBtn').disabled = true;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('downloadBtn').disabled = journey.length === 0;
  document.getElementById('status').textContent = "Journey stopped. Showing path.";
  clearPins();
  const points = journey.map(j => [j.latitude, j.longitude]);
  drawPath(points);
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
  document.getElementById('status').textContent = "Journey downloaded!";
}

// Controls
document.getElementById('startBtn').addEventListener('click', startJourney);
document.getElementById('stopBtn').addEventListener('click', stopJourney);
document.getElementById('downloadBtn').addEventListener('click', downloadJourney);

// On load, center map on current location
window.onload = function() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        initMap(latitude, longitude, 16);
      },
      () => {
        initMap();
      }
    );
  } else {
    initMap();
  }
};
