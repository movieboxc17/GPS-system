// Load and visualize all journeys from /Journeys/all_journeys.json
const map = L.map('map', { zoomControl: false }).setView([59.3293, 18.0686], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// Marker cluster group for start/end markers
const markerCluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 40
});
map.addLayer(markerCluster);

const colors = [
  '#2176ae', '#fbb13c', '#fd5f00', '#9bc53d', '#e55934', '#fa7921', '#43bccd', '#6a4c93', '#1982c4', '#8ac926'
];

let polylines = [], startMarkers = [], endMarkers = [], journeysData = [];
let allVisible = true;

fetch('Journeys/Data1.json')
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
    // Color legend (collapsible)
    const legendEl = document.getElementById('colorLegend');
    legendEl.innerHTML = `<button id='legendToggleBtn' style='margin-right:8px;'>Visa/Dölj färglegend</button><span id='legendItems'></span>`;
    const legendItems = document.getElementById('legendItems');
    journeys.forEach((j, idx) => {
      const color = colors[idx % colors.length];
      legendItems.innerHTML += `<span style="display:flex;align-items:center;gap:4px;"><span style="width:16px;height:16px;background:${color};border-radius:3px;display:inline-block;"></span> ${j.name || 'Resa'}</span>`;
    });
    document.getElementById('legendToggleBtn').onclick = function() {
      legendItems.style.display = legendItems.style.display === 'none' ? 'flex' : 'none';
    };
    // Filter UI: create input before journeyList
    let filterInput = document.getElementById('filterInput');
    if (!filterInput) {
      const filterDiv = document.createElement('div');
      filterDiv.innerHTML = `<input id='filterInput' type='text' placeholder='Filtrera namn eller datum...' style='padding:6px 10px;margin-bottom:8px;width:90%;max-width:320px;'>`;
      const mainContent = document.getElementById('mainContent');
      mainContent.insertBefore(filterDiv, mainContent.firstChild);
      filterInput = filterDiv.firstChild;
    }
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
        markerCluster.addLayer(startMarker);
        startMarkers.push(startMarker);
        // End marker
        endMarker = L.marker(points[points.length-1], {
          title: 'Slut',
          icon: L.icon({
            iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
            iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34]
          })
        }).bindPopup(`<b>${j.name || 'Resa'}</b><br>Slutpunkt`);
        markerCluster.addLayer(endMarker);
        endMarkers.push(endMarker);
      } else {
        polylines.push(null);
        startMarkers.push(null);
        endMarkers.push(null);
      }
      // Add journey card
      const card = document.createElement('div');
      card.className = 'journey-card';
      card.innerHTML = `<label><input type='checkbox' class='journey-toggle' data-idx='${idx}' checked> <b class='journey-name' data-idx='${idx}'>${j.name || 'Resa'}</b></label>
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
          if (startMarkers[idx]) markerCluster.addLayer(startMarkers[idx]);
          if (endMarkers[idx]) markerCluster.addLayer(endMarkers[idx]);
        } else {
          if (polylines[idx]) map.removeLayer(polylines[idx]);
          if (startMarkers[idx]) markerCluster.removeLayer(startMarkers[idx]);
          if (endMarkers[idx]) markerCluster.removeLayer(endMarkers[idx]);
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
    // Journey details modal
    document.querySelectorAll('.journey-name').forEach(el => {
      el.addEventListener('click', function() {
        const idx = +this.dataset.idx;
        showJourneyModal(journeysData[idx], colors[idx % colors.length]);
      });
    });
    // Filter journeys
    document.getElementById('filterInput').addEventListener('input', function() {
      const val = this.value.toLowerCase();
      document.querySelectorAll('.journey-card').forEach((card, idx) => {
        const j = journeysData[idx];
        const name = (j.name || '').toLowerCase();
        const date = (new Date(j.createdAt)).toLocaleDateString('sv-SE');
        card.style.display = (name.includes(val) || date.includes(val)) ? '' : 'none';
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

// Center map button for mobile
const centerBtn = document.createElement('button');
centerBtn.textContent = 'Centrera karta';
centerBtn.style = 'position:fixed;bottom:18px;right:18px;z-index:1200;padding:10px 18px;background:#2176ae;color:#fff;border-radius:8px;border:none;box-shadow:0 2px 8px rgba(0,0,0,.12);font-size:16px;';
centerBtn.onclick = function() {
  map.setView([59.3293, 18.0686], 11);
};
if (window.innerWidth < 600) document.body.appendChild(centerBtn);

// Mobile enhancements: make controls touch-friendly
document.addEventListener('DOMContentLoaded', function() {
  document.body.style.fontSize = window.innerWidth < 540 ? '16px' : '15px';
  document.getElementById('map').style.minHeight = window.innerWidth < 540 ? '220px' : '320px';
});

// Modal for journey details
const modal = document.createElement('div');
modal.id = 'journeyModal';
modal.style = 'display:none;position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.18);backdrop-filter:blur(2px);align-items:center;justify-content:center;';
modal.innerHTML = `<div style='background:#fff;color:#222;padding:24px 32px;border-radius:16px;box-shadow:0 2px 16px rgba(0,0,0,.18);max-width:90vw;min-width:220px;'><div id='modalContent'></div><button id='closeModalBtn' style='margin-top:18px;padding:8px 18px;'>Stäng</button></div>`;
document.body.appendChild(modal);
document.getElementById('closeModalBtn').onclick = function() { modal.style.display = 'none'; };

function showJourneyModal(journey, color) {
  const stats = journey.stats || {};
  let html = `<h3 style='color:${color};margin-bottom:8px;'>${journey.name || 'Resa'}</h3>`;
  html += `<div style='font-size:15px;margin-bottom:8px;'>Sträcka: ${(stats.distance/1000).toFixed(2)} km<br>Tid: ${formatTime(stats.duration)}<br>Punkter: ${stats.points}<br>Start: ${formatDate(journey.createdAt)}<br>Slut: ${formatDate(journey.updatedAt)}</div>`;
  // Chart (speed/elevation if available)
  if (journey.data && journey.data.journey && journey.data.journey.length > 0) {
    const speeds = journey.data.journey.map(p => p.speed).filter(s => typeof s === 'number');
    if (speeds.length > 0) {
      html += `<canvas id='speedChart' width='320' height='80' style='margin-bottom:8px;'></canvas>`;
    }
    // Elevation (if available)
    const elevations = journey.data.journey.map(p => p.elevation).filter(e => typeof e === 'number');
    if (elevations.length > 0) {
      html += `<canvas id='elevChart' width='320' height='80' style='margin-bottom:8px;'></canvas>`;
    }
  }
  document.getElementById('modalContent').innerHTML = html;
  modal.style.display = 'flex';
  // Draw charts
  setTimeout(() => {
    if (document.getElementById('speedChart')) {
      drawChart('speedChart', journey.data.journey.map(p => p.speed), 'Hastighet (m/s)', color);
    }
    if (document.getElementById('elevChart')) {
      drawChart('elevChart', journey.data.journey.map(p => p.elevation), 'Höjd (m)', color);
    }
  }, 100);
}

function drawChart(canvasId, data, label, color) {
  if (!window.Chart) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => drawChart(canvasId, data, label, color);
    document.body.appendChild(script);
    return;
  }
  const ctx = document.getElementById(canvasId).getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i+1),
      datasets: [{ label, data, borderColor: color, backgroundColor: 'rgba(33,118,174,.08)', fill: true }]
    },
    options: { scales: { x: { display: false }, y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
  });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('sv-SE');
}

function formatTime(ms) {
  if (!ms) return '';
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h) return `${h}h ${m%60}m`;
  if (m) return `${m}m ${s%60}s`;
  return `${s}s`;
}
