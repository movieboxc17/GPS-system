// Load and visualize all journeys from /Journeys/all_journeys.json
const map = L.map('map').setView([59.3293, 18.0686], 11); // Stockholm default
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

const colors = [
  '#2176ae', '#fbb13c', '#fd5f00', '#9bc53d', '#e55934', '#fa7921', '#43bccd', '#6a4c93', '#1982c4', '#8ac926'
];

fetch('Journeys/all_journeys.json')
  .then(r => r.json())
  .then(journeys => {
    if (!Array.isArray(journeys) || journeys.length === 0) {
      document.getElementById('journeyList').innerHTML = '<div>Inga resor hittades.</div>';
      return;
    }
    const polylines = [];
    const bounds = L.latLngBounds();
    journeys.forEach((j, idx) => {
      const color = colors[idx % colors.length];
      const points = (j.data && j.data.journey) ? j.data.journey.map(p => [p.latitude, p.longitude]) : [];
      if (points.length > 0) {
        const poly = L.polyline(points, { color, weight: 4, opacity: 0.8 });
        poly.addTo(map);
        polylines.push(poly);
        points.forEach(pt => bounds.extend(pt));
      }
      // Add journey card
      const card = document.createElement('div');
      card.className = 'journey-card';
      card.innerHTML = `<label><input type='checkbox' class='journey-toggle' data-idx='${idx}' checked> <b>${j.name || 'Resa'}</b></label>
        <div class='stats'>Sträcka: ${(j.stats?.distance/1000).toFixed(2)} km | Tid: ${formatTime(j.stats?.duration)} | Punkter: ${j.stats?.points}</div>`;
      document.getElementById('journeyList').appendChild(card);
    });
    if (bounds.isValid()) map.fitBounds(bounds);
    // Toggle visibility
    document.querySelectorAll('.journey-toggle').forEach(cb => {
      cb.addEventListener('change', function() {
        const idx = +this.dataset.idx;
        if (this.checked) polylines[idx].addTo(map);
        else map.removeLayer(polylines[idx]);
      });
    });
  });

function formatTime(ms) {
  if (!ms) return '';
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h) return `${h}h ${m%60}m`;
  if (m) return `${m}m ${s%60}s`;
  return `${s}s`;
}
