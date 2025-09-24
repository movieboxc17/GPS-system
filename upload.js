// upload.js
const MAP_CENTER = [59.3293, 18.0686]; // Stockholm
const STORAGE_KEY = 'uploaded_journeys_v1';
let map, journeyLayers = [], journeyColors = ["#2176ae", "#e53935", "#2e7d32", "#f59e0b", "#5cc1ff", "#ff6b6b", "#52d273", "#f6c453"];
function getColor(idx) { return journeyColors[idx % journeyColors.length]; }
function loadJourneysFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveJourneysToStorage(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {}
}
function renderJourneysList() {
  const listEl = document.getElementById('journeyList');
  listEl.innerHTML = '';
  journeys.forEach((j, idx) => {
    const stats = j.data.length ? `${j.data.length} pts` : 'No data';
    listEl.innerHTML += `<div class='journey-item'><b>${j.name}</b> (${stats}) <button class='btn btn-danger btn-sm' data-del='${j.id}'>Delete</button></div>`;
  });
}
function clearMap() {
  journeyLayers.forEach(l => map.removeLayer(l));
  journeyLayers = [];
}
function addJourneyToMap(journey, name, color) {
  if (!Array.isArray(journey) || journey.length === 0) return;
  const latlngs = journey.map(j => [j.latitude, j.longitude]);
  const poly = L.polyline(latlngs, { color, weight: 5 }).addTo(map);
  journeyLayers.push(poly);
  L.circleMarker(latlngs[0], { color, radius: 7, fillOpacity: .8 }).addTo(map).bindPopup(`${name} Start`);
  L.circleMarker(latlngs[latlngs.length-1], { color, radius: 7, fillOpacity: .8 }).addTo(map).bindPopup(`${name} End`);
  map.fitBounds(poly.getBounds(), { padding: [20, 20] });
}
function redrawMap() {
  clearMap();
  journeys.forEach((j, idx) => addJourneyToMap(j.data, j.name, getColor(idx)));
}
let journeys = loadJourneysFromStorage();
document.addEventListener('DOMContentLoaded', function() {
  map = L.map('map').setView(MAP_CENTER, 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  redrawMap();
  renderJourneysList();
  document.getElementById('uploadBtn').onclick = function() {
    const files = document.getElementById('fileInput').files;
    if (!files.length) return;
    document.getElementById('uploadStatus').textContent = '';
    let loaded = 0;
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          let journey;
          // Accept array of journeys (from all_journeys.json) or single journey
          if (Array.isArray(data) && data.length && data[0].data && Array.isArray(data[0].data)) {
            // Array of journey objects
            data.forEach((item, idx) => {
              journeys.push({
                id: item.id || Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-5),
                name: item.name || `Journey ${idx+1}`,
                data: Array.isArray(item.data) ? item.data : []
              });
            });
            saveJourneysToStorage(journeys);
            redrawMap();
            renderJourneysList();
            loaded++;
            if (loaded === files.length) document.getElementById('uploadStatus').textContent = `Uploaded ${loaded} file(s).`;
            return;
          }
          // Single journey object or array of points
          journey = Array.isArray(data) ? data : (data.journey || []);
          let name = data.name || files[i].name.replace(/\.json$/i, "");
          const item = { id: Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-5), name, data: journey };
          journeys.push(item);
          saveJourneysToStorage(journeys);
          redrawMap();
          renderJourneysList();
          loaded++;
          if (loaded === files.length) document.getElementById('uploadStatus').textContent = `Uploaded ${loaded} file(s).`;
        } catch (err) {
          document.getElementById('uploadStatus').textContent = `Error reading ${files[i].name}: ${err}`;
        }
      };
      reader.readAsText(files[i]);
    }
  };
  function fetchGithubJourneys(folderUrl) {
    // Support local folder in same repo (e.g. /Journeys)
    let apiUrlGithub;
    if (folderUrl.startsWith('/')) {
      // Relative path, assume repo is hosted on GitHub Pages
      // Try to fetch all_journeys.json from the folder
      const apiUrlLocal = folderUrl.replace(/\/$/, '') + '/all_journeys.json';
      fetch(apiUrlLocal)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            data.forEach((item, idx) => {
              const journey = item.data && item.data.journey ? item.data.journey : [];
              journeys.push({
                id: item.id || Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-5),
                name: item.name || `Journey ${idx+1}`,
                data: journey
              });
            });
            saveJourneysToStorage(journeys);
            redrawMap();
            renderJourneysList();
            document.getElementById('uploadStatus').textContent = `Fetched ${data.length} journey(s) from local folder.`;
          } else {
            document.getElementById('uploadStatus').textContent = 'No journeys found in local folder.';
          }
        })
        .catch(err => {
          document.getElementById('uploadStatus').textContent = `Local folder error: ${err}`;
        });
      return;
    }
    const match = folderUrl.match(/github.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)/);
    if (!match) {
      document.getElementById('uploadStatus').textContent = 'Invalid GitHub folder URL.';
      return;
    }
    const [_, owner, repo, branch, folder] = match;
    apiUrlGithub = `https://api.github.com/repos/${owner}/${repo}/contents/${folder}?ref=${branch}`;
    fetch(apiUrlGithub)
      .then(r => r.json())
      .then(files => {
        if (!Array.isArray(files)) throw new Error('No files found');
        const jsonFiles = files.filter(f => f.name.endsWith('.json'));
        if (!jsonFiles.length) throw new Error('No .json files found');
        let loaded = 0;
        jsonFiles.forEach((file, idx) => {
          fetch(file.download_url)
            .then(r => r.json())
            .then(data => {
              let journey;
              if (Array.isArray(data) && data.length && data[0].latitude !== undefined) {
                journey = data;
              } else if (Array.isArray(data) && data.length && data[0].data && Array.isArray(data[0].data)) {
                // Array of journey objects
                data.forEach((item, i) => {
                  journeys.push({
                    id: item.id || Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-5),
                    name: item.name || `${file.name.replace('.json','')}-${i+1}`,
                    data: Array.isArray(item.data) ? item.data : []
                  });
                });
                return;
              } else {
                journey = data.journey || [];
              }
              const name = data.name || file.name.replace('.json','');
              journeys.push({
                id: Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-5),
                name,
                data: journey
              });
              loaded++;
              if (loaded === jsonFiles.length) {
                saveJourneysToStorage(journeys);
                redrawMap();
                renderJourneysList();
                document.getElementById('uploadStatus').textContent = `Fetched ${loaded} file(s) from GitHub.`;
              }
            })
            .catch(err => {
              document.getElementById('uploadStatus').textContent = `Error reading ${file.name}: ${err}`;
            });
        });
      })
      .catch(err => {
        document.getElementById('uploadStatus').textContent = `GitHub error: ${err}`;
      });
  }
  document.getElementById('fetchGithubBtn').onclick = function() {
    const url = document.getElementById('githubFolderInput').value.trim();
    if (!url) return;
    fetchGithubJourneys(url);
  };
  document.getElementById('journeyList').addEventListener('click', function(e) {
    if (e.target.dataset.del) {
      const idx = journeys.findIndex(j => j.id === e.target.dataset.del);
      if (idx !== -1) {
        journeys.splice(idx, 1);
        saveJourneysToStorage(journeys);
        redrawMap();
        renderJourneysList();
      }
    }
  });
});
