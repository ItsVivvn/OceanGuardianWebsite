
(function () {
  'use strict';

  function fetchJson(path, fallback) {
    return fetch(path)
      .then(res => { if (!res.ok) throw new Error('not-found'); return res.json(); })
      .catch(() => fallback);
  }

  const EMPTY_GEOJSON = { type: 'FeatureCollection', features: [] };

  function getColor(type) {
    if (window.sdgMain && typeof window.sdgMain.getColorForHotspot === 'function') {
      return window.sdgMain.getColorForHotspot(type);
    }
    switch ((type || '').toLowerCase()) {
      case 'plastic': return '#ff7f50';
      case 'bleaching': return '#ffcc00';
      case 'fishing': return '#1e90ff';
      case 'pollution': return '#8a2be2';
      default: return '#3388ff';
    }
  }

  function buildPopup(props) {
    if (window.sdgMain && typeof window.sdgMain.formatPopupHtml === 'function') {
      return window.sdgMain.formatPopupHtml(props);
    }
    const lines = [];
    if (props.type) lines.push(`<strong>Type:</strong> ${escapeHtml(props.type)}`);
    if (props.severity) lines.push(`<strong>Severity:</strong> ${escapeHtml(props.severity)}`);
    if (props.date) lines.push(`<strong>Date:</strong> ${escapeHtml(props.date)}`);
    if (props.notes) lines.push(`<div style="margin-top:6px;">${escapeHtml(props.notes)}</div>`);
    if (props.id) lines.push(`<div class="text-muted small mt-1">ID: ${escapeHtml(props.id)}</div>`);
    return lines.join('<br/>');
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function createMarkerForFeature(feature, latlng, options) {
    const props = feature.properties || {};
    const type = (props.type || 'default').toLowerCase();

    if (options.useCustomIcons && options.iconMap && options.iconMap[type]) {
      const iconSize = options.iconSize || [32, 32];
      const icon = L.icon({
        iconUrl: options.iconMap[type],
        iconSize: iconSize,
        iconAnchor: [iconSize[0] / 2, iconSize[1]],
        popupAnchor: [0, -iconSize[1] / 2],
        className: 'sdg-marker-icon'
      });
      return L.marker(latlng, { icon: icon });
    }

    const color = getColor(type);
    return L.circleMarker(latlng, {
      radius: Math.max(6, (props._markerRadius || 7)),
      fillColor: color,
      color: '#ffffff',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.9
    });
  }

  function initMapWithLayers(opts = {}) {
    const mapId = opts.mapId || 'map';
    const geojsonPath = opts.geojsonPath || 'data/geojson.json';
    const useCustomIcons = !!opts.useCustomIcons;
    const iconMap = opts.iconMap || {};
    const iconSize = opts.iconSize || [32, 32];
    const initialView = opts.initialView || [0, 20];
    const initialZoom = typeof opts.initialZoom === 'number' ? opts.initialZoom : 2;

    const mapEl = document.getElementById(mapId);
    if (!mapEl) {
      console.warn('initMapWithLayers: map element not found with id', mapId);
      return null;
    }

    let map;
    try {
      map = L.map(mapId, { scrollWheelZoom: true }).setView(initialView, initialZoom);
    } catch (e) {
      console.error('initMapWithLayers: Leaflet not available or map init failed', e);
      return null;
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    fetchJsonAndBuild();

    return map;

    function fetchJsonAndBuild() {
      fetchJson(geojsonPath, opts.fallback || EMPTY_GEOJSON)
        .then(geojson => {
          const groups = {};
          (geojson.features || []).forEach(feature => {
            const type = ((feature.properties && feature.properties.type) || 'unknown').toLowerCase();
            groups[type] = groups[type] || [];
            groups[type].push(feature);
          });

          const overlays = {};
          const allMarkers = [];

          Object.keys(groups).forEach(type => {
            const features = groups[type];
            const layerGroup = L.layerGroup();
            features.forEach(feature => {
              const coords = feature.geometry && feature.geometry.coordinates;
              if (!coords || coords.length < 2) return;
              const latlng = [coords[1], coords[0]];
              const marker = createMarkerForFeature(feature, latlng, { useCustomIcons, iconMap, iconSize });
              const popupHtml = buildPopup(feature.properties || {});
              if (popupHtml) marker.bindPopup(popupHtml);
              marker.addTo(layerGroup);
              allMarkers.push(marker);
            });
            overlays[type] = layerGroup;
            layerGroup.addTo(map);
          });

          if (Object.keys(overlays).length > 1) {
            const labeledOverlays = {};
            Object.keys(overlays).forEach(type => {
              const label = type.charAt(0).toUpperCase() + type.slice(1);
              labeledOverlays[label] = overlays[type];
            });
            L.control.layers(null, labeledOverlays, { collapsed: false }).addTo(map);
          }

          addLegend(Object.keys(groups), map);

          try {
            const group = L.featureGroup(allMarkers);
            const bounds = group.getBounds();
            if (bounds.isValid && bounds.isValid()) {
              map.fitBounds(bounds.pad(0.25));
            }
          } catch (e) {
          }

        })
        .catch(err => {
          console.error('initMapWithLayers: error loading geojson', err);
        });
    }
  }

  function addLegend(types, map) {
    if (!map) return;
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
      const div = L.DomUtil.create('div', 'sdg-legend p-2');
      div.style.background = 'rgba(255,255,255,0.95)';
      div.style.borderRadius = '6px';
      div.style.boxShadow = '0 6px 18px rgba(13,36,77,0.06)';
      div.style.fontSize = '0.9rem';
      div.style.lineHeight = '1.4';
      div.innerHTML = '<strong style="display:block;margin-bottom:6px;">Legend</strong>';
      types.forEach(type => {
        const color = getColor(type);
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.marginBottom = '6px';
        item.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${color};border:1px solid #fff;"></span><span>${escapeHtml(label)}</span>`;
        div.appendChild(item);
      });
      return div;
    };
    legend.addTo(map);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const el = document.getElementById('map');
    if (!el) return;
    const opts = (window.MAP_INIT_OPTIONS && typeof window.MAP_INIT_OPTIONS === 'object') ? window.MAP_INIT_OPTIONS : {};
    opts.mapId = opts.mapId || 'map';
    opts.geojsonPath = opts.geojsonPath || 'data/geojson.json';
    initMapWithLayers(opts);
  });

  window.initMapWithLayers = initMapWithLayers;

})();
