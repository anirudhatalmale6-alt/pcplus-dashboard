/**
 * Network Security - Live Data Loader for AdGuard Home + OpenVAS
 * Loaded after dashboard-api.js on network-security.html
 */
(function() {
  window.addEventListener('DOMContentLoaded', async function() {
    try {
      const user = await DashboardAPI.auth.me();
      if (!user) return;
    } catch(e) { return; }

    loadAdGuardData();
    loadOpenVASData();
  });

  function esc(s) { return DashboardAPI.escapeHtml(s || ''); }

  function fmtNum(n) {
    if (n == null) return '--';
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return String(n);
  }

  function fmtDate(d) {
    if (!d) return 'Never';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
      dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function renderDomainList(items, container) {
    if (!items || items.length === 0) {
      container.innerHTML = '<div style="padding:8px 0; color:var(--text-muted);">No data available</div>';
      return;
    }
    var maxCount = items[0] ? (typeof items[0] === 'object' ? Object.values(items[0])[0] : items[0].count || 0) : 1;
    container.innerHTML = items.map(function(item) {
      var domain, count;
      if (typeof item === 'object' && !item.domain) {
        var keys = Object.keys(item);
        domain = keys[0] || 'unknown';
        count = item[domain] || 0;
      } else {
        domain = item.domain || item.Domain || 'unknown';
        count = item.count || item.Count || 0;
      }
      if (maxCount === 0) maxCount = 1;
      var pct = Math.round((count / maxCount) * 100);
      return '<div style="display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid #f1f5f9;">' +
        '<div style="flex:1; min-width:0;">' +
          '<div style="font-size:11px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="' + esc(domain) + '">' + esc(domain) + '</div>' +
          '<div style="height:3px; background:#e5e9f0; border-radius:2px; margin-top:2px;"><div style="height:3px; background:var(--accent); border-radius:2px; width:' + pct + '%;"></div></div>' +
        '</div>' +
        '<span style="font-size:11px; font-weight:700; color:var(--text-primary); min-width:40px; text-align:right;">' + fmtNum(count) + '</span>' +
      '</div>';
    }).join('');
  }

  async function loadAdGuardData() {
    var statusEl = document.getElementById('adguard-status');
    try {
      var stats = await DashboardAPI.dns.stats();
      if (!stats) {
        if (statusEl) { statusEl.textContent = 'Unavailable'; statusEl.className = 'status-chip yellow'; }
        return;
      }
      if (statusEl) { statusEl.textContent = 'Connected'; statusEl.className = 'status-chip green'; }

      var totalEl = document.getElementById('dns-total-queries');
      var blockedEl = document.getElementById('dns-blocked-queries');
      var rateEl = document.getElementById('dns-block-rate');
      var avgEl = document.getElementById('dns-avg-time');

      if (totalEl) totalEl.textContent = fmtNum(stats.numDnsQueries || stats.num_dns_queries || 0);
      if (blockedEl) blockedEl.textContent = fmtNum(stats.numBlockedFiltering || stats.num_blocked_filtering || 0);

      var total = stats.numDnsQueries || stats.num_dns_queries || 0;
      var blocked = stats.numBlockedFiltering || stats.num_blocked_filtering || 0;
      var rate = total > 0 ? ((blocked / total) * 100).toFixed(1) + '%' : '0%';
      if (rateEl) rateEl.textContent = rate;

      var avgTime = stats.avgProcessingTime || stats.avg_processing_time || 0;
      if (avgEl) avgEl.textContent = avgTime > 0 ? (avgTime * 1000).toFixed(1) + 'ms' : '--';

      var topBlockedEl = document.getElementById('dns-top-blocked');
      if (topBlockedEl) {
        var topBlocked = stats.topBlockedDomains || stats.top_blocked_domains || [];
        renderDomainList(topBlocked.slice(0, 8), topBlockedEl);
      }

      var topQueriedEl = document.getElementById('dns-top-queried');
      if (topQueriedEl) {
        var topQueried = stats.topQueriedDomains || stats.top_queried_domains || [];
        renderDomainList(topQueried.slice(0, 8), topQueriedEl);
      }

      var topClientsEl = document.getElementById('dns-top-clients');
      if (topClientsEl) {
        var topClients = stats.topClients || stats.top_clients || [];
        renderDomainList(topClients.slice(0, 8), topClientsEl);
      }

    } catch(e) {
      console.error('AdGuard load error:', e);
      if (statusEl) { statusEl.textContent = 'Error'; statusEl.className = 'status-chip red'; }
    }
  }

  async function loadOpenVASData() {
    var statusEl = document.getElementById('openvas-status');
    try {
      var summary = await DashboardAPI.vulnerability.summary();
      if (!summary) {
        if (statusEl) { statusEl.textContent = 'Unavailable'; statusEl.className = 'status-chip yellow'; }
        document.getElementById('vuln-table-body').innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-muted);">OpenVAS scanner not responding</td></tr>';
        return;
      }
      if (statusEl) { statusEl.textContent = 'Connected'; statusEl.className = 'status-chip green'; }

      var critEl = document.getElementById('vuln-critical');
      var highEl = document.getElementById('vuln-high');
      var medEl = document.getElementById('vuln-medium');
      var lowEl = document.getElementById('vuln-low');
      var totalEl = document.getElementById('vuln-total');
      var hostsEl = document.getElementById('vuln-hosts');
      var dateEl = document.getElementById('vuln-scan-date');

      if (critEl) critEl.textContent = summary.critical || 0;
      if (highEl) highEl.textContent = summary.high || 0;
      if (medEl) medEl.textContent = summary.medium || 0;
      if (lowEl) lowEl.textContent = (summary.low || 0) + (summary.info || 0);
      if (totalEl) totalEl.textContent = summary.totalFindings || 0;
      if (hostsEl) hostsEl.textContent = summary.hostsScanned || 0;
      if (dateEl) dateEl.textContent = summary.scanDate ? fmtDate(summary.scanDate) : 'No scans';

      var tbody = document.getElementById('vuln-table-body');
      var vulns = summary.topVulnerabilities || [];
      if (tbody) {
        if (vulns.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--green); font-weight:600;">No vulnerabilities found - network is clean</td></tr>';
        } else {
          tbody.innerHTML = vulns.map(function(v) {
            var sevClass = v.severity >= 9 ? 'red' : v.severity >= 7 ? 'yellow' : v.severity >= 4 ? 'blue' : 'green';
            var sevLabel = v.severity >= 9 ? 'Critical' : v.severity >= 7 ? 'High' : v.severity >= 4 ? 'Medium' : 'Low';
            var sevBg = v.severity >= 9 ? 'var(--red-bg)' : v.severity >= 7 ? 'var(--yellow-bg)' : v.severity >= 4 ? 'var(--accent-light)' : 'var(--green-bg)';
            var sevColor = v.severity >= 9 ? 'var(--red)' : v.severity >= 7 ? '#d97706' : v.severity >= 4 ? 'var(--accent)' : 'var(--green)';
            return '<tr>' +
              '<td><span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;background:' + sevBg + ';color:' + sevColor + ';">' +
                v.severity.toFixed(1) + ' ' + sevLabel + '</span></td>' +
              '<td style="font-weight:600;max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + esc(v.name || v.nvt) + '">' + esc(v.name || v.nvt) + '</td>' +
              '<td style="font-family:monospace;font-size:11px;">' + esc(v.host) + '</td>' +
              '<td style="font-family:monospace;font-size:11px;">' + esc(v.port) + '</td>' +
              '<td>' + (v.cve ? '<span style="font-size:10px;font-weight:600;color:var(--accent);">' + esc(v.cve) + '</span>' : '<span style="color:var(--text-muted);font-size:10px;">--</span>') + '</td>' +
            '</tr>';
          }).join('');
        }
      }

      var hostBreakdown = summary.hostBreakdown || [];
      if (hostBreakdown.length > 0) {
        var breakdownSection = document.getElementById('vuln-host-breakdown');
        var hostsList = document.getElementById('vuln-hosts-list');
        if (breakdownSection) breakdownSection.style.display = 'block';
        if (hostsList) {
          hostsList.innerHTML = hostBreakdown.map(function(h) {
            var totalForHost = (h.high || 0) + (h.medium || 0) + (h.low || 0) + (h.info || 0);
            return '<div style="display:flex; align-items:center; gap:12px; padding:8px 12px; background:#f8fafc; border-radius:6px; border:1px solid var(--border); margin-bottom:6px;">' +
              '<span style="font-family:monospace; font-size:12px; font-weight:700; min-width:120px;">' + esc(h.host) + '</span>' +
              '<div style="flex:1; display:flex; gap:8px;">' +
                (h.high > 0 ? '<span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; background:var(--yellow-bg); color:#d97706;">High: ' + h.high + '</span>' : '') +
                (h.medium > 0 ? '<span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; background:var(--accent-light); color:var(--accent);">Med: ' + h.medium + '</span>' : '') +
                (h.low > 0 ? '<span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; background:var(--green-bg); color:var(--green);">Low: ' + h.low + '</span>' : '') +
                (h.info > 0 ? '<span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; background:#f1f5f9; color:var(--text-muted);">Info: ' + h.info + '</span>' : '') +
              '</div>' +
              '<span style="font-size:12px; font-weight:700;">' + totalForHost + ' total</span>' +
            '</div>';
          }).join('');
        }
      }

    } catch(e) {
      console.error('OpenVAS load error:', e);
      if (statusEl) { statusEl.textContent = 'Error'; statusEl.className = 'status-chip red'; }
      var tbody = document.getElementById('vuln-table-body');
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--red);">Failed to load vulnerability data: ' + esc(e.message) + '</td></tr>';
    }
  }
})();
