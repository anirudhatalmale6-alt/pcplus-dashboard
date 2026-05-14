(function() {
  const STORAGE_KEY = 'pcplus_selected_device';
  const CUSTOMER_KEY = 'pcplus_selected_customer';

  function getStoredDevice() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  }

  function storeDevice(device) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(device)); } catch(e) {}
  }

  function storeCustomer(name) {
    try { localStorage.setItem(CUSTOMER_KEY, name); } catch(e) {}
  }

  function getStoredCustomer() {
    try { return localStorage.getItem(CUSTOMER_KEY) || ''; } catch(e) { return ''; }
  }

  function updateNavLinks(deviceId) {
    document.querySelectorAll('.nav-item[href]').forEach(function(a) {
      var href = a.getAttribute('href');
      if (href && href.includes('.html')) {
        var base = href.split('?')[0];
        a.setAttribute('href', base + '?deviceId=' + encodeURIComponent(deviceId));
      }
    });
  }

  function updateHeader(device) {
    var dn = document.querySelector('.device-name');
    var dos = document.querySelector('.device-os');
    if (dn) dn.textContent = device.hostname || device.deviceName || 'Select Device';
    if (dos) dos.innerHTML = '<span class="online-dot" style="' + (device.isOnline ? '' : 'background:#ef4444') + '"></span> ' +
      (device.osVersion || '') + ' &bull; ' + (device.isOnline ? 'Online' : 'Offline');

    var cn = document.querySelector('.client-name');
    if (cn && device.customerName) cn.textContent = device.customerName;
    var tb = document.querySelector('.tier-badge');
    if (tb && device.licenseTier) {
      tb.className = 'tier-badge ' + device.licenseTier.toLowerCase();
      tb.innerHTML = '<span class="tier-dot"></span>' + device.licenseTier;
    }
  }

  window.addEventListener('DOMContentLoaded', async function() {
    var params = new URLSearchParams(window.location.search);
    var deviceId = params.get('deviceId');

    if (deviceId && typeof DashboardAPI !== 'undefined') {
      try {
        var device = await DashboardAPI.dashboard.device(deviceId);
        if (device) {
          storeDevice({ deviceId: deviceId, hostname: device.hostname, osVersion: device.osVersion,
            isOnline: device.isOnline, customerName: device.customerName, licenseTier: device.licenseTier });
          storeCustomer(device.customerName || '');
          updateHeader(device);
          updateNavLinks(deviceId);
        }
      } catch(e) { console.error('Device load error:', e); }
    } else {
      var stored = getStoredDevice();
      if (stored && stored.deviceId) {
        updateHeader(stored);
        updateNavLinks(stored.deviceId);
        if (typeof DashboardAPI !== 'undefined') {
          try {
            var fresh = await DashboardAPI.dashboard.device(stored.deviceId);
            if (fresh) {
              storeDevice({ deviceId: stored.deviceId, hostname: fresh.hostname, osVersion: fresh.osVersion,
                isOnline: fresh.isOnline, customerName: fresh.customerName, licenseTier: fresh.licenseTier });
              updateHeader(fresh);
            }
          } catch(e) {}
        }
      }
    }
  });

  window.PCPlusPersistence = {
    storeDevice: storeDevice,
    storeCustomer: storeCustomer,
    getStoredDevice: getStoredDevice,
    getStoredCustomer: getStoredCustomer,
    updateNavLinks: updateNavLinks,
    updateHeader: updateHeader
  };
})();
