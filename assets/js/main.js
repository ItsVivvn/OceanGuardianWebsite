
(function () {
  'use strict';


  function fetchLocalJson(path, fallback) {
    return fetch(path)
      .then(res => {
        if (!res.ok) throw new Error('Local JSON not found: ' + path);
        return res.json();
      })
      .catch(() => fallback);
  }


  function animateStats() {
    const statEls = document.querySelectorAll('.stat-value');
    statEls.forEach(el => {
      const target = el.dataset.value;
      if (!target) return;

      if (isNaN(Number(target))) {
        el.textContent = target;
        return;
      }

      const end = parseInt(target, 10);
      let current = 0;
      const step = Math.max(1, Math.floor(end / 40));
      const timer = setInterval(() => {
        current += step;
        if (current >= end) {
          el.textContent = end;
          clearInterval(timer);
        } else {
          el.textContent = current;
        }
      }, 18);
    });
  }

  function makeIssueCardsKeyboardAccessible() {
    const issueCards = document.querySelectorAll('.issue-card');
    issueCards.forEach(card => {
      card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const btn = card.querySelector('button[data-bs-toggle="collapse"]');
          if (btn) btn.click();
        }
      });
    });
  }


  function setupDataDownload(buttonSelector, dataObject, filename = 'data.json') {
    const btn = document.querySelector(buttonSelector);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(dataObject, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }



  function getColorForHotspot(type) {
    switch ((type || '').toLowerCase()) {
      case 'plastic': return '#ff7f50';
      case 'bleaching': return '#ffcc00';
      case 'fishing': return '#1e90ff';
      case 'pollution': return '#8a2be2';
      default: return '#3388ff';
    }
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replaceAll('&', '&amp;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;')
              .replaceAll('"', '&quot;')
              .replaceAll("'", '&#39;');
  }

  function formatPopupHtml(props = {}) {
    const lines = [];
    if (props.type) lines.push(`<strong>Type:</strong> ${escapeHtml(props.type)}`);
    if (props.severity) lines.push(`<strong>Severity:</strong> ${escapeHtml(props.severity)}`);
    if (props.date) lines.push(`<strong>Date:</strong> ${escapeHtml(props.date)}`);
    if (props.notes) lines.push(`<div style="margin-top:6px;">${escapeHtml(props.notes)}</div>`);
    if (props.id) lines.push(`<div class="text-muted small mt-1">ID: ${escapeHtml(props.id)}</div>`);
    return lines.join('<br/>');
  }

  function createCustomIcon(urlOrDataUri, iconSize = [28, 28]) {
    return L.icon({
      iconUrl: urlOrDataUri,
      iconSize: iconSize,
      iconAnchor: [iconSize[0] / 2, iconSize[1]],
      popupAnchor: [0, -iconSize[1] / 2],
      className: 'sdg-marker-icon'
    });
  }

  function initHotspotMap(options = {}) {
    if (!options.mapId) {
      console.warn('initHotspotMap: mapId is required');
      return null;
    }
    const mapEl = document.getElementById(options.mapId);
    if (!mapEl) {
   
      return null;
    }

    const geojsonPath = options.geojsonPath || 'data/geojson.json';
    const fallback = options.fallback || { type: 'FeatureCollection', features: [] };

    let map;
    try {
      map = L.map(options.mapId, { scrollWheelZoom: true }).setView(options.initialView || [0, 20], options.initialZoom || 2);
    } catch (err) {
      console.error('Leaflet map initialization failed (is Leaflet loaded?)', err);
      return null;
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    fetchLocalJson(geojsonPath, fallback)
      .then(geojson => {
        const useIcons = options.useCustomIcons && options.iconMap && typeof options.iconMap === 'object';
        const iconCache = {};

        function pointToLayer(feature, latlng) {
          const props = feature.properties || {};
          const type = (props.type || 'default').toLowerCase();

          if (useIcons && options.iconMap[type]) {
            const iconKey = options.iconMap[type];
            if (!iconCache[iconKey]) {
              iconCache[iconKey] = createCustomIcon(iconKey, options.iconSize || [32,32]);
            }
            return L.marker(latlng, { icon: iconCache[iconKey] });
          }

          const color = getColorForHotspot(type);
          return L.circleMarker(latlng, {
            radius: Math.max(6, (props._markerRadius || 7)),
            fillColor: color,
            color: '#ffffff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.9
          });
        }

        function onEachFeature(feature, layer) {
          if (!feature.properties) return;
          const popupHtml = formatPopupHtml(feature.properties);
          layer.bindPopup(popupHtml);
        }

        if (map.hotspotLayer) {
          try { map.removeLayer(map.hotspotLayer); } catch (e) { }
        }

        const layer = L.geoJSON(geojson, { pointToLayer, onEachFeature }).addTo(map);
        map.hotspotLayer = layer;

        try {
          const bounds = layer.getBounds();
          if (bounds.isValid && bounds.isValid()) map.fitBounds(bounds.pad(0.25));
        } catch (e) {
        }
      })
      .catch(err => {
        console.error('Error loading geojson for map:', err);
      });

    return map;
  }


  document.addEventListener('DOMContentLoaded', function () {
    animateStats();
    makeIssueCardsKeyboardAccessible();

    const mapEl = document.getElementById('map');
    if (mapEl) {
      const fallback = (window.FALLBACK_GEOJSON && typeof window.FALLBACK_GEOJSON === 'object') ? window.FALLBACK_GEOJSON : { type: 'FeatureCollection', features: [] };

      initHotspotMap({
        mapId: 'map',
        geojsonPath: 'data/geojson.json',
        fallback: fallback,
        initialView: [0, 20],
        initialZoom: 2
      });
    }

    if (window.SAMPLE_DATA) {
      const downloadBtn = document.querySelector('#downloadData');
      if (downloadBtn) setupDataDownload('#downloadData', window.SAMPLE_DATA, 'sample-data.json');
    }
  });

  window.sdgMain = {
    fetchLocalJson,
    animateStats,
    makeIssueCardsKeyboardAccessible,
    setupDataDownload,
    initHotspotMap,
    getColorForHotspot,
    formatPopupHtml,
    createCustomIcon
  };
})();
