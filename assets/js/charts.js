
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

  const DEFAULT_FALLBACK = {
    sea_temperature: [
      { date: '2015-01-01', value: 16.8 },
      { date: '2016-01-01', value: 17.1 },
      { date: '2017-01-01', value: 17.4 },
      { date: '2018-01-01', value: 17.6 },
      { date: '2019-01-01', value: 17.7 },
      { date: '2020-01-01', value: 17.9 },
      { date: '2021-01-01', value: 18.0 },
      { date: '2022-01-01', value: 18.1 },
      { date: '2023-01-01', value: 18.2 },
      { date: '2024-01-01', value: 18.3 }
    ],
    plastic_by_region: [
      { region: 'Asia', value: 4100 },
      { region: 'Africa', value: 900 },
      { region: 'Europe', value: 650 },
      { region: 'Americas', value: 1300 },
      { region: 'Oceania', value: 170 }
    ],
    fishing_pressure: [
      { region: 'North Atlantic', value: 78 },
      { region: 'Indian Ocean', value: 62 },
      { region: 'Pacific', value: 92 },
      { region: 'Mediterranean', value: 55 }
    ],
    coral_bleaching_by_year: [
      { year: 2015, count: 40 },
      { year: 2016, count: 65 },
      { year: 2017, count: 72 },
      { year: 2018, count: 58 },
      { year: 2019, count: 62 },
      { year: 2020, count: 70 },
      { year: 2021, count: 68 }
    ],
    plastic_types: [
      { type: 'Bottles & containers', value: 34 },
      { type: 'Food packaging', value: 22 },
      { type: 'Fishing gear', value: 15 },
      { type: 'Plastic bags', value: 12 },
      { type: 'Microplastics (fragments)', value: 10 },
      { type: 'Other', value: 7 }
    ]
  };

  const PALETTE = {
    primary: '#0b74d1',
    primaryLight: 'rgba(11,116,209,0.12)',
    accent1: '#1e90ff',
    accent2: '#66b2ff',
    coral: '#ff7f50',
    yellow: '#ffcc00'
  };

  function createLineChart(ctx, labels, data, opts = {}) {
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: opts.label || '',
          data: data,
          borderColor: opts.borderColor || PALETTE.primary,
          backgroundColor: opts.backgroundColor || PALETTE.primaryLight,
          tension: opts.tension != null ? opts.tension : 0.25,
          pointRadius: opts.pointRadius || 3,
          fill: opts.fill != null ? opts.fill : true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: opts.scales || {
          x: { title: { display: !!opts.xTitle, text: opts.xTitle || '' } },
          y: { title: { display: !!opts.yTitle, text: opts.yTitle || '' } }
        },
        plugins: { legend: { display: !!opts.showLegend } }
      }
    });
  }

  function createBarChart(ctx, labels, data, opts = {}) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: opts.label || '',
          data: data,
          backgroundColor: opts.backgroundColor || labels.map(() => PALETTE.primary),
          borderRadius: opts.borderRadius != null ? opts.borderRadius : 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: opts.scales || {
          x: { ticks: { autoSkip: false } },
          y: { beginAtZero: true }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function createDoughnutChart(ctx, labels, data, opts = {}) {
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          label: opts.label || '',
          data: data,
          backgroundColor: opts.backgroundColor || [PALETTE.primary, PALETTE.accent1, PALETTE.coral, PALETTE.yellow, PALETTE.accent2]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: opts.legendPosition || 'bottom' } }
      }
    });
  }



  function initTempChart(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return Promise.reject(new Error('Canvas not found: ' + canvasId));

    const dataPath = options.dataPath || 'data/sample-data.json';
    const fallback = options.fallback || DEFAULT_FALLBACK;

    return fetchLocalJson(dataPath, fallback).then(json => {
      const items = json.sea_temperature || fallback.sea_temperature || [];
      const labels = items.map(i => {
        try { return new Date(i.date).getFullYear(); } catch { return i.date || ''; }
      });
      const values = items.map(i => Number(i.value));
      const chart = createLineChart(canvas.getContext('2d'), labels, values, {
        label: options.label || 'Sea surface temperature (°C)',
        xTitle: options.xTitle || 'Year',
        yTitle: options.yTitle || '°C',
        borderColor: options.borderColor || PALETTE.primary,
        backgroundColor: options.backgroundColor || PALETTE.primaryLight
      });
      return chart;
    });
  }

  function initPlasticChart(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return Promise.reject(new Error('Canvas not found: ' + canvasId));
    const dataPath = options.dataPath || 'data/sample-data.json';
    const fallback = options.fallback || DEFAULT_FALLBACK;

    return fetchLocalJson(dataPath, fallback).then(json => {
      const items = json.plastic_by_region || fallback.plastic_by_region || [];
      const labels = items.map(i => i.region);
      const values = items.map(i => Number(i.value));
      const chart = createBarChart(canvas.getContext('2d'), labels, values, {
        label: options.label || 'Plastic (sample tonnes)',
        backgroundColor: options.backgroundColor || labels.map(() => PALETTE.primary)
      });
      return chart;
    });
  }

  function initFishingChart(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return Promise.reject(new Error('Canvas not found: ' + canvasId));
    const dataPath = options.dataPath || 'data/sample-data.json';
    const fallback = options.fallback || DEFAULT_FALLBACK;

    return fetchLocalJson(dataPath, fallback).then(json => {
      const items = json.fishing_pressure || fallback.fishing_pressure || [];
      const labels = items.map(i => i.region);
      const values = items.map(i => Number(i.value));
      const chart = createDoughnutChart(canvas.getContext('2d'), labels, values, {
        label: options.label || 'Fishing pressure',
        backgroundColor: options.backgroundColor || [PALETTE.primary, PALETTE.accent1, PALETTE.coral, PALETTE.yellow, PALETTE.accent2]
      });
      return chart;
    });
  }

  function initBleachChart(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return Promise.reject(new Error('Canvas not found: ' + canvasId));
    const dataPath = options.dataPath || 'data/sample-data.json';
    const fallback = options.fallback || DEFAULT_FALLBACK;

    return fetchLocalJson(dataPath, fallback).then(json => {
      const items = json.coral_bleaching_by_year || fallback.coral_bleaching_by_year || [];
      const labels = items.map(i => String(i.year || i.date || ''));
      const values = items.map(i => Number(i.count || i.value || 0));
      const chart = createLineChart(canvas.getContext('2d'), labels, values, {
        label: options.label || 'Coral bleaching events (sample)',
        xTitle: options.xTitle || 'Year',
        yTitle: options.yTitle || 'Events'
      });
      return chart;
    });
  }


  window.sdgCharts = {
    initTempChart,
    initPlasticChart,
    initFishingChart,
    initBleachChart,
    createLineChart,
    createBarChart,
    createDoughnutChart,
    fetchLocalJson,
    DEFAULT_FALLBACK
  };

})();
