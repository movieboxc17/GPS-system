// Load and visualize all journeys from /Journeys/all_journeys.json
const map = L.map('map', { zoomControl: false }).setView([59.3293, 18.0686], 11); // Stockholm default
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

const colors = [
  '#2176ae', '#fbb13c', '#fd5f00', '#9bc53d', '#e55934', '#fa7921', '#43bccd', '#6a4c93', '#1982c4', '#8ac926'
];

let polylines = [], startMarkers = [], endMarkers = [], journeysData = [];
let allVisible = true;

fetch('Journeys/all_journeys.json')
  .then(r => r.json())
  .then(journeys => {
    if (!Array.isArray(journeys) || journeys.length === 0) {
      document.getElementById('journeyList').innerHTML = '<div>Inga resor hittades.</div>';
      return;
    }
    journeysData = journeys;
    polylines = [];
    startMarkers = [];
    endMarkers = [];
    let totalDistance = 0, totalPoints = 0, totalDuration = 0;
    const bounds = L.latLngBounds();
    // Color legend
    const legendEl = document.getElementById('colorLegend');
    legendEl.innerHTML = '';
    journeys.forEach((j, idx) => {
      const color = colors[idx % colors.length];
      legendEl.innerHTML += `<span style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:16px;background:${color};border-radius:3px;display:inline-block;"></span> ${j.name || 'Resa'}</span>`;
    });
    // List and map
    document.getElementById('journeyList').innerHTML = '';
    journeys.forEach((j, idx) => {
      const color = colors[idx % colors.length];
      const points = (j.data && j.data.journey) ? j.data.journey.map(p => [p.latitude, p.longitude]) : [];
      totalDistance += j.stats?.distance || 0;
      totalPoints += j.stats?.points || 0;
      totalDuration += j.stats?.duration || 0;
      let poly = null, startMarker = null, endMarker = null;
      if (points.length > 0) {
        poly = L.polyline(points, { color, weight: 4, opacity: 0.8 });
        poly.addTo(map);
        polylines.push(poly);
        points.forEach(pt => bounds.extend(pt));
        // Start marker
        startMarker = L.marker(points[0], {
          title: 'Start',
          icon: L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png',
            iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34]
          })
        }).bindPopup(`<b>${j.name || 'Resa'}</b><br>Startpunkt`);
        startMarker.addTo(map);
        startMarkers.push(startMarker);
        // End marker
        endMarker = L.marker(points[points.length-1], {
          title: 'Slut',
          icon: L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
            iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34]
          })
        }).bindPopup(`<b>${j.name || 'Resa'}</b><br>Slutpunkt`);
        endMarker.addTo(map);
        endMarkers.push(endMarker);
      } else {
        polylines.push(null);
        startMarkers.push(null);
        endMarkers.push(null);
      }
      // Add journey card
      const card = document.createElement('div');
      card.className = 'journey-card';
      card.innerHTML = `<label><input type='checkbox' class='journey-toggle' data-idx='${idx}' checked> <b>${j.name || 'Resa'}</b></label>
        <button class='zoom-btn' data-idx='${idx}' style='float:right;padding:4px 10px;font-size:13px;'>Zooma</button>
        <div class='stats'>Sträcka: ${(j.stats?.distance/1000).toFixed(2)} km | Tid: ${formatTime(j.stats?.duration)} | Punkter: ${j.stats?.points}</div>`;
      document.getElementById('journeyList').appendChild(card);
    });
    // Total stats
    document.getElementById('totalStats').innerHTML = `Totalt: ${(totalDistance/1000).toFixed(2)} km | Tid: ${formatTime(totalDuration)} | Punkter: ${totalPoints}`;
    if (bounds.isValid()) map.fitBounds(bounds);
    // Toggle visibility
    document.querySelectorAll('.journey-toggle').forEach(cb => {
      cb.addEventListener('change', function() {
        const idx = +this.dataset.idx;
        if (this.checked) {
          if (polylines[idx]) polylines[idx].addTo(map);
          if (startMarkers[idx]) startMarkers[idx].addTo(map);
          if (endMarkers[idx]) endMarkers[idx].addTo(map);
        } else {
          if (polylines[idx]) map.removeLayer(polylines[idx]);
          if (startMarkers[idx]) map.removeLayer(startMarkers[idx]);
          if (endMarkers[idx]) map.removeLayer(endMarkers[idx]);
        }
      });
    });
    // Zoom to journey
    document.querySelectorAll('.zoom-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = +this.dataset.idx;
        const j = journeysData[idx];
        const points = (j.data && j.data.journey) ? j.data.journey.map(p => [p.latitude, p.longitude]) : [];
        if (points.length > 0) {
          map.fitBounds(L.latLngBounds(points));
        }
      });
    });
  });

// Hide/show all journeys
document.getElementById('toggleAllBtn').addEventListener('click', function() {
  allVisible = !allVisible;
  document.querySelectorAll('.journey-toggle').forEach(cb => {
    cb.checked = allVisible;
    cb.dispatchEvent(new Event('change'));
  });
  this.textContent = allVisible ? 'Dölj alla' : 'Visa alla';
});

// Mobile enhancements: make controls touch-friendly
document.addEventListener('DOMContentLoaded', function() {
  document.body.style.fontSize = window.innerWidth < 540 ? '16px' : '15px';
  document.getElementById('map').style.minHeight = window.innerWidth < 540 ? '220px' : '320px';
});

function formatTime(ms) {
  if (!ms) return '';
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h) return `${h}h ${m%60}m`;
  if (m) return `${m}m ${s%60}s`;
  return `${s}s`;
}
