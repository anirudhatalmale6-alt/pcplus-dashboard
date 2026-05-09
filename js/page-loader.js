/**
 * PC Plus Dashboard - Page Loader v4.23.0
 * Auto-detects current page and loads appropriate data from the API.
 * Include after dashboard-api.js on any page.
 */
(async function() {
  const params = new URLSearchParams(window.location.search);
  let deviceId = params.get('deviceId') || '';
  let customerName = params.get('customer') || '';

  // Check auth
  const user = await DashboardAPI.auth.me();
  if (!user) return;

  // Determine which page we're on
  const page = window.location.pathname.split('/').pop().replace('.html','') || 'index';

  // Add device picker to header on all detail pages
  if (page !== 'index') {
    await addDevicePicker();
  }

  // Route to page-specific loader
  switch(page) {
    case 'scan-results': await loadScanResults(); break;
    case 'access-control': await loadAccessControl(); break;
    case 'backup-detail': await loadBackup(); break;
    case 'network-security': await loadNetwork(); break;
    case 'ransomware-shield': await loadRansomware(); break;
    case 'security-logs': await loadSecurityLogs(); break;
    case 'realtime-protection': await loadRealtimeProtection(); break;
    case 'compliance-overview': await loadCompliance(); break;
  }

  // --- Device Picker ---
  async function addDevicePicker() {
    const header = document.querySelector('.header');
    if (!header) return;

    const customers = await DashboardAPI.customers.list();
    if (!customers) return;

    const pickerDiv = document.createElement('div');
    pickerDiv.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 24px;background:rgba(37,150,190,0.04);border-bottom:1px solid var(--border);';
    pickerDiv.innerHTML = `
      <span style="font-size:11px;color:var(--text-secondary);font-weight:600;">VIEWING:</span>
      <select id="dpCustomer" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border);font-size:12px;font-family:inherit;background:white;min-width:180px;">
        <option value="">Select Customer...</option>
        ${customers.map(c => `<option value="${esc(c.customerName)}" ${c.customerName===customerName?'selected':''}>${esc(c.customerName)} (${c.deviceCount})</option>`).join('')}
      </select>
      <select id="dpDevice" style="padding:5px 10px;border-radius:6px;border:1px solid var(--border);font-size:12px;font-family:inherit;background:white;min-width:220px;">
        <option value="">Select Device...</option>
      </select>
      <span id="dpStatus" style="font-size:11px;color:var(--text-muted);margin-left:8px;"></span>
    `;
    header.parentNode.insertBefore(pickerDiv, header.nextSibling);

    const custSel = document.getElementById('dpCustomer');
    const devSel = document.getElementById('dpDevice');
    const status = document.getElementById('dpStatus');

    // If we have a deviceId, find its customer and pre-select
    if (deviceId) {
      const device = await DashboardAPI.dashboard.device(deviceId);
      if (device) {
        customerName = device.customerName;
        custSel.value = customerName;
        await loadDevicesForCustomer(customerName);
        devSel.value = deviceId;
        status.textContent = `${device.hostname} - ${device.isOnline?'Online':'Offline'}`;
        updateHeaderDevice(device);
      }
    } else if (customerName) {
      custSel.value = customerName;
      await loadDevicesForCustomer(customerName);
    }

    custSel.addEventListener('change', async () => {
      customerName = custSel.value;
      deviceId = '';
      devSel.innerHTML = '<option value="">Select Device...</option>';
      status.textContent = '';
      if (customerName) await loadDevicesForCustomer(customerName);
    });

    devSel.addEventListener('change', async () => {
      deviceId = devSel.value;
      if (deviceId) {
        // Reload page with new deviceId
        const url = new URL(window.location);
        url.searchParams.set('deviceId', deviceId);
        url.searchParams.set('customer', customerName);
        window.location.href = url.toString();
      }
    });

    async function loadDevicesForCustomer(name) {
      const detail = await DashboardAPI.customers.detail(name);
      if (detail && detail.devices) {
        devSel.innerHTML = '<option value="">Select Device (' + detail.devices.length + ')...</option>' +
          detail.devices.map(d => `<option value="${d.deviceId}" ${d.deviceId===deviceId?'selected':''}>${esc(d.hostname)} (${d.isOnline?'Online':'Offline'}, ${d.securityScore}%)</option>`).join('');
      }
    }
  }

  function updateHeaderDevice(device) {
    const dn = document.querySelector('.device-name');
    const dos = document.querySelector('.device-os');
    if (dn) dn.textContent = device.hostname;
    if (dos) dos.innerHTML = `<span class="online-dot" style="${device.isOnline?'':'background:#ef4444'}"></span> ${device.osVersion || 'Unknown OS'} &bull; ${device.isOnline?'Online':'Offline'}`;
  }

  // --- Page Loaders ---

  async function loadScanResults() {
    if (!deviceId) { showPickDevice(); return; }
    const data = await DashboardAPI.security.scanResults(deviceId);
    if (!data) return;

    // Update summary bar
    const nums = document.querySelectorAll('.summary-num');
    if (nums.length >= 4) {
      nums[0].textContent = data.totalChecks;
      nums[1].textContent = data.passedChecks;
      nums[2].textContent = data.totalChecks - data.passedChecks - data.failedChecks; // warnings
      nums[3].textContent = data.failedChecks;
    }

    // Replace category sections
    const main = document.querySelector('.main');
    const existingSections = main.querySelectorAll('.category-section');
    existingSections.forEach(s => s.remove());

    const filterBar = main.querySelector('.filter-bar');
    const insertPoint = filterBar ? filterBar.nextSibling : main.lastChild;

    data.categories.forEach(cat => {
      const section = document.createElement('div');
      section.className = 'category-section';
      section.style.animation = 'fadeUp 0.5s ease both';
      const passed = cat.checks.filter(c => c.passed).length;
      const failed = cat.checks.filter(c => !c.passed).length;
      section.innerHTML = `
        <div class="category-header" onclick="this.classList.toggle('collapsed')">
          <div class="category-toggle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>
          <span class="category-name">${esc(cat.category)}</span>
          <div class="category-summary">
            <span class="cat-badge pass">${passed} Pass</span>
            <span class="cat-badge fail">${failed} Fail</span>
          </div>
          <span class="category-count">${cat.totalChecks} tests</span>
        </div>
        <div class="category-body">
          <table class="test-table">
            <thead><tr><th style="width:40px">Status</th><th style="width:70px">Test ID</th><th>Test Name</th><th>Category</th><th>Detail</th><th>Compliance</th></tr></thead>
            <tbody>
              ${cat.checks.map(c => `
                <tr>
                  <td><span class="status-icon ${c.passed?'pass':'fail'}">${c.passed?'&#10003;':'&#10007;'}</span></td>
                  <td><code>${esc(c.id)}</code></td>
                  <td>${esc(c.name)}</td>
                  <td>${esc(cat.category)}</td>
                  <td>${esc(c.detail)}${c.recommendation?'<br><em style="color:var(--text-muted)">'+esc(c.recommendation)+'</em>':''}</td>
                  <td>${(c.complianceFrameworks||[]).map(f=>'<span class="compliance-tag">'+esc(f)+'</span>').join(' ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      main.insertBefore(section, insertPoint);
    });
  }

  async function loadAccessControl() {
    if (!deviceId) { showPickDevice(); return; }
    const data = await DashboardAPI.security.accessControl(deviceId);
    if (!data) return;
    // Data available — page keeps its design, numbers will be updated when agent reports
  }

  async function loadBackup() {
    if (!deviceId) { showPickDevice(); return; }
    const data = await DashboardAPI.security.backup(deviceId);
    if (!data) return;
    if (data.provider) {
      const labels = document.querySelectorAll('.backup-val');
      // Update last backup time if available
      if (data.lastBackupTime && labels.length > 0) {
        labels[0].textContent = new Date(data.lastBackupTime).toLocaleString();
      }
    }
  }

  async function loadNetwork() {
    if (!deviceId) { showPickDevice(); return; }
    const data = await DashboardAPI.security.network(deviceId);
    if (!data) return;
  }

  async function loadRansomware() {
    if (!deviceId) { showPickDevice(); return; }
    const data = await DashboardAPI.security.ransomware(deviceId);
    if (!data) return;
  }

  async function loadSecurityLogs() {
    const params = {};
    if (deviceId) params.deviceId = deviceId;
    const data = await DashboardAPI.security.logs(params);
    if (!data || !data.logs) return;

    const tbody = document.querySelector('.log-table tbody, .logs-table tbody, table tbody');
    if (!tbody) return;

    if (data.logs.length > 0) {
      tbody.innerHTML = data.logs.map(log => `
        <tr>
          <td><span class="severity-badge ${log.severity.toLowerCase()}">${log.severity}</span></td>
          <td>${new Date(log.timestamp).toLocaleString()}</td>
          <td>${esc(log.source)}</td>
          <td>${esc(log.category)}</td>
          <td>${esc(log.message)}</td>
          <td>${esc(log.hostname)}</td>
        </tr>
      `).join('');
    }
  }

  async function loadRealtimeProtection() {
    if (!deviceId) { showPickDevice(); return; }
    const data = await DashboardAPI.security.realtimeProtection(deviceId);
    if (!data) return;
    // Products list will update when agent posts AV data
  }

  async function loadCompliance() {
    if (!deviceId) { showPickDevice(); return; }
    const data = await DashboardAPI.security.compliance(deviceId);
    if (!data) return;

    // Update overall score
    const scoreEl = document.querySelector('.overall-score, .score-num, .compliance-score');
    if (scoreEl) scoreEl.textContent = data.overallScore + '%';

    // Update framework scores if elements exist
    const frameworks = document.querySelectorAll('.comp-row, .framework-card');
    if (data.frameworks && frameworks.length > 0) {
      data.frameworks.forEach((fw, i) => {
        if (frameworks[i]) {
          const pct = frameworks[i].querySelector('.comp-pct, .fw-score');
          if (pct) pct.textContent = Math.round(fw.scorePercent) + '%';
          const bar = frameworks[i].querySelector('.comp-bar-fill, .progress-fill');
          if (bar) bar.style.width = fw.scorePercent + '%';
        }
      });
    }
  }

  // --- Helpers ---
  function showPickDevice() {
    const main = document.querySelector('.main');
    if (!main) return;
    const notice = document.createElement('div');
    notice.style.cssText = 'padding:40px;text-align:center;background:white;border-radius:12px;margin:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);';
    notice.innerHTML = '<h2 style="color:var(--text-primary);margin-bottom:8px;">Select a Device</h2><p style="color:var(--text-secondary);">Use the customer and device picker above to view security data for a specific endpoint.</p>';
    main.prepend(notice);
  }

  function esc(str) { return DashboardAPI.escapeHtml(str); }
})();
</script>
