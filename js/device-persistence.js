(function() {
  var DEVICE_KEY = 'pcplus_selected_device';
  var CUSTOMER_KEY = 'pcplus_selected_customer';

  function getStoredDevice() {
    try { var raw = localStorage.getItem(DEVICE_KEY); return raw ? JSON.parse(raw) : null; } catch(e) { return null; }
  }
  function storeDevice(device) {
    try { localStorage.setItem(DEVICE_KEY, JSON.stringify(device)); } catch(e) {}
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
    if (dn) dn.textContent = device.hostname || 'Select Device';
    if (dos && device.osVersion) dos.innerHTML = '<span class="online-dot" style="' + (device.isOnline ? '' : 'background:#ef4444') + '"></span> ' + device.osVersion + ' &bull; ' + (device.isOnline ? 'Online' : 'Offline');
    var cn = document.querySelector('.client-name');
    if (cn && device.customerName) cn.textContent = device.customerName;
  }

  window.addEventListener('DOMContentLoaded', function() {
    var params = new URLSearchParams(window.location.search);
    var deviceId = params.get('deviceId');

    if (deviceId) {
      updateNavLinks(deviceId);
      var stored = getStoredDevice();
      if (stored && stored.deviceId === deviceId) {
        updateHeader(stored);
      }
    } else {
      var stored = getStoredDevice();
      if (stored && stored.deviceId) {
        updateNavLinks(stored.deviceId);
        updateHeader(stored);
        var url = new URL(window.location);
        url.searchParams.set('deviceId', stored.deviceId);
        if (stored.customerName) url.searchParams.set('customer', stored.customerName);
        window.history.replaceState({}, '', url.toString());
      }
    }

    var observer = new MutationObserver(function() {
      var dpDevice = document.getElementById('dpDevice');
      if (dpDevice && !dpDevice._persisted) {
        dpDevice._persisted = true;
        dpDevice.addEventListener('change', function() {
          var did = dpDevice.value;
          if (did) {
            var text = dpDevice.options[dpDevice.selectedIndex].text;
            var hostname = text.split('(')[0].trim();
            storeDevice({ deviceId: did, hostname: hostname, customerName: getStoredCustomer() });
          }
        });
      }
      var dpCustomer = document.getElementById('dpCustomer');
      if (dpCustomer && !dpCustomer._persisted) {
        dpCustomer._persisted = true;
        dpCustomer.addEventListener('change', function() {
          storeCustomer(dpCustomer.value);
        });
      }
      var custSel = document.getElementById('customerSelect');
      if (custSel && !custSel._persisted) {
        custSel._persisted = true;
        var storedCust = getStoredCustomer();
        if (storedCust && !custSel.value) {
          custSel.value = storedCust;
          custSel.dispatchEvent(new Event('change'));
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
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
