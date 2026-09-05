let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
const token = localStorage.getItem('amc_token');
if (!currentUser || !token) window.location.href = 'index.html';

document.getElementById('userName').textContent = currentUser.name;
document.getElementById('userAvatar').textContent = currentUser.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
document.getElementById('welcomeName').textContent = currentUser.name.split(' ')[0];
if (currentUser.organization_name) {
    document.getElementById('welcomeOrg').textContent = currentUser.organization_name;
    document.getElementById('orgName').textContent = currentUser.organization_name;
}

if (currentUser.role === 'admin') document.getElementById('adminLink')?.style.setProperty('display', 'block');
if (currentUser.role === 'technician') document.getElementById('techLink')?.style.setProperty('display', 'block');

const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
menuToggle?.addEventListener('click', (e) => { e.stopPropagation(); sidebar.classList.add('active'); });
closeSidebar?.addEventListener('click', () => sidebar.classList.remove('active'));
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

let allDevices = [];
let allServices = [];
let allBills = [];
let chartBar = null;
let chartLine = null;
let chartDonut = null;
let currentMetric = 'completion';
let currentTimeFilter = 'ytd';

document.getElementById('timeFilter')?.addEventListener('change', (e) => {
    currentTimeFilter = e.target.value;
    renderAllCharts();
});

document.querySelectorAll('.ptab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMetric = btn.dataset.metric;
        renderBullets();
    });
});

function getFilteredServices() {
    const now = new Date();
    if (currentTimeFilter === 'all') return allServices;
    if (currentTimeFilter === 'month') {
        return allServices.filter(s => {
            const d = new Date(s.created_at || s.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    }
    if (currentTimeFilter === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        return allServices.filter(s => {
            const d = new Date(s.created_at || s.date);
            return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
        });
    }
    if (currentTimeFilter === 'ytd') {
        return allServices.filter(s => {
            const d = new Date(s.created_at || s.date);
            return d.getFullYear() === now.getFullYear();
        });
    }
    return allServices;
}

function getFilteredBills() {
    const now = new Date();
    if (currentTimeFilter === 'all') return allBills;
    return allBills.filter(b => {
        const d = new Date(b.date || b.created_at);
        if (currentTimeFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (currentTimeFilter === 'quarter') {
            const q = Math.floor(now.getMonth() / 3);
            return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
        }
        if (currentTimeFilter === 'ytd') return d.getFullYear() === now.getFullYear();
        return true;
    });
}

function updateKPIs() {
    const services = getFilteredServices();
    document.getElementById('kpiTotalDevices').textContent = allDevices.length;
    document.getElementById('kpiActiveServices').textContent = services.filter(s => s.status === 'completed').length;
    document.getElementById('kpiPending').textContent = services.filter(s => s.status === 'pending').length;
    const bills = getFilteredBills();
    const revenue = bills.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    document.getElementById('kpiRevenue').textContent = '₹' + revenue.toLocaleString('en-IN');
    document.getElementById('kpiTotalDelta').innerHTML = '<i class="fas fa-cube" style="color:#6b7280"></i> Registered';
    document.getElementById('kpiActiveDelta').innerHTML = '<i class="fas fa-arrow-up" style="color:#16a34a"></i> Completed';
    document.getElementById('kpiPendingDelta').innerHTML = '<i class="fas fa-clock" style="color:#d97706"></i> Awaiting';
    document.getElementById('kpiRevenueDelta').innerHTML = '<i class="fas fa-rupee-sign" style="color:#16a34a"></i> Total billed';
    document.getElementById('lastRefresh').textContent = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function renderBullets() {
    const services = getFilteredServices();
    const types = {};
    services.forEach(s => {
        const t = s.type || 'Other';
        if (!types[t]) types[t] = { total: 0, completed: 0 };
        types[t].total++;
        if (s.status === 'completed') types[t].completed++;
    });
    const entries = Object.entries(types);
    if (entries.length === 0) {
        document.getElementById('bulletGrid').innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9ca3af;padding:20px">No service data yet</div>';
        document.getElementById('slaBullets').innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#9ca3af;padding:20px">No SLA data</div>';
        return;
    }
    const colors = ['dark', 'purple', 'green'];
    document.getElementById('bulletGrid').innerHTML = entries.slice(0, 3).map(([type, data], i) => {
        const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        if (currentMetric === 'completion') {
            return `
                <div class="bullet-cell">
                    <div class="bullet-cell-title">${type}</div>
                    <div class="bullet-cell-value ${colors[i]}">${pct}.0%</div>
                    <div class="bullet-cell-deltas">
                        <div class="delta-row"><i class="fas fa-arrow-up delta-icon up"></i> ${data.completed}/${data.total} done</div>
                    </div>
                    <div class="bullet-bar">
                        <div class="bullet-bar-fill" style="width:${Math.min(pct, 100)}%"></div>
                        <div class="bullet-bar-target" style="left:80%"></div>
                    </div>
                    <div class="bullet-bar-labels"><span>0%</span><span>100%</span></div>
                </div>
            `;
        } else {
            return `
                <div class="bullet-cell">
                    <div class="bullet-cell-title">${type}</div>
                    <div class="bullet-cell-value ${colors[i]}">${data.total}</div>
                    <div class="bullet-cell-deltas">
                        <div class="delta-row"><i class="fas fa-check delta-icon up"></i> ${data.completed} completed</div>
                    </div>
                    <div class="bullet-bar">
                        <div class="bullet-bar-fill" style="width:${Math.min((data.completed/Math.max(data.total,1))*100, 100)}%"></div>
                    </div>
                </div>
            `;
        }
    }).join('');

    document.getElementById('slaBullets').innerHTML = entries.slice(0, 6).map(([type, data]) => {
        const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
        const target = 80;
        const achieved = pct >= target;
        return `
            <div class="sla-bullet-cell">
                <div class="sla-bullet-cell-title">${type}</div>
                <div class="sla-bullet-cell-value">${pct}% of ${data.total} (target: ${target}%)</div>
                <div class="sla-bullet-bar">
                    <div class="sla-bullet-bar-pink" style="width:${Math.min(pct, 100)}%"></div>
                    <div class="sla-bullet-target" style="left:${target}%"></div>
                </div>
                <div class="sla-bullet-meta">
                    <span>${achieved ? 'Target met' : (target - pct) + '% to go'}</span>
                    <span>${data.completed}/${data.total}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderDonut() {
    const services = getFilteredServices();
    const counts = {
        completed: services.filter(s => s.status === 'completed').length,
        pending: services.filter(s => s.status === 'pending').length,
        inprogress: services.filter(s => s.status === 'in_progress' || s.status === 'assigned' || s.status === 'accepted').length,
        cancelled: services.filter(s => s.status === 'cancelled').length
    };
    const total = services.length;
    document.getElementById('donutTotal').textContent = total;
    const colors = {
        completed: '#1976d2',
        inprogress: '#7c3aed',
        pending: '#ec4899',
        cancelled: '#f59e0b'
    };
    const labels = {
        completed: 'Completed',
        inprogress: 'In Progress',
        pending: 'Pending',
        cancelled: 'Cancelled'
    };
    const data = [];
    const lbls = [];
    const cols = [];
    Object.keys(counts).forEach(k => {
        if (counts[k] > 0) {
            data.push(counts[k]);
            lbls.push(labels[k]);
            cols.push(colors[k]);
        }
    });
    const ctx = document.getElementById('donutChart');
    if (!ctx) return;
    if (chartDonut) chartDonut.destroy();
    if (data.length === 0) {
        const c2d = ctx.getContext('2d');
        c2d.font = '13px sans-serif';
        c2d.fillStyle = '#9ca3af';
        c2d.textAlign = 'center';
        c2d.fillText('No data', 90, 90);
        document.getElementById('donutLegend').innerHTML = '';
        return;
    }
    chartDonut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: lbls,
            datasets: [{
                data,
                backgroundColor: cols,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            cutout: '70%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } }
        }
    });
    document.getElementById('donutLegend').innerHTML = lbls.map((l, i) => `
        <div class="donut-legend-row">
            <span class="donut-legend-dot" style="background:${cols[i]}"></span>
            <span class="donut-legend-label">${l}</span>
            <span class="donut-legend-value">${data[i]}</span>
        </div>
    `).join('');
}

function renderBar() {
    const types = {};
    allDevices.forEach(d => { const t = d.type || 'Other'; types[t] = (types[t] || 0) + 1; });
    const labels = Object.keys(types);
    const data = Object.values(types);
    const colors = ['#1e3a8a', '#1976d2', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#06b6d4', '#0891b2'];
    const ctx = document.getElementById('barChart');
    if (!ctx) return;
    if (chartBar) chartBar.destroy();
    chartBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No data'],
            datasets: [{
                label: 'Devices',
                data: labels.length ? data : [0],
                backgroundColor: labels.length ? labels.map((_, i) => colors[i % colors.length]) : ['#e5e7eb'],
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f3f5' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderLine() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString('en', { month: 'short' }) });
    }
    const completed = months.map(({ y, m }) => allServices.filter(s => {
        if (s.status !== 'completed') return false;
        const d = new Date(s.created_at || s.date);
        return d.getFullYear() === y && d.getMonth() === m;
    }).length);
    const pending = months.map(({ y, m }) => allServices.filter(s => {
        if (s.status !== 'pending') return false;
        const d = new Date(s.created_at || s.date);
        return d.getFullYear() === y && d.getMonth() === m;
    }).length);
    const revenue = months.map(({ y, m }) => allBills.filter(b => {
        const d = new Date(b.date || b.created_at);
        return d.getFullYear() === y && d.getMonth() === m;
    }).reduce((s, b) => s + (parseFloat(b.amount) || 0), 0));
    const ctx = document.getElementById('lineChart');
    if (!ctx) return;
    if (chartLine) chartLine.destroy();
    chartLine = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => m.label),
            datasets: [
                { label: 'Completed', data: completed, borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,0.1)', tension: 0.35, fill: true, pointRadius: 4, pointBackgroundColor: '#1976d2' },
                { label: 'Pending', data: pending, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)', tension: 0.35, fill: true, pointRadius: 4, pointBackgroundColor: '#7c3aed' },
                { label: 'Revenue', data: revenue, borderColor: '#16a34a', backgroundColor: 'transparent', tension: 0.35, fill: false, pointRadius: 4, pointBackgroundColor: '#16a34a', yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f1f3f5' } },
                y1: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { callback: v => '₹' + v } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderAttention() {
    const list = document.getElementById('attentionList');
    if (!list) return;
    const now = new Date(); now.setHours(0,0,0,0);
    const items = [];
    allDevices.forEach(d => {
        if (!d.next_service) return;
        const end = new Date(d.next_service);
        end.setHours(0,0,0,0);
        const days = Math.ceil((end - now) / (1000*60*60*24));
        if (days <= 30) {
            items.push({
                name: `${d.brand || ''} ${d.model || d.type || 'Device'}`.trim(),
                meta: `AMC-${String(d.id).padStart(6, '0')} · ${d.organization_name || currentUser.organization_name || 'Acme Industries Pvt Ltd'}`,
                date: end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                ago: days < 0 ? `${Math.abs(days)} days ago` : days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`,
                status: days < 0 ? 'expired' : 'expiring'
            });
        }
    });
    items.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (items.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>All devices are covered. Nothing needs attention.</p></div>`;
        return;
    }
    list.innerHTML = items.slice(0, 6).map(item => `
        <div class="attention-item">
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-meta">${item.meta}</div>
            </div>
            <div class="item-date">
                <div class="date-main">${item.date}</div>
                <div class="date-ago">${item.ago}</div>
            </div>
            <span class="status-pill ${item.status}">${item.status === 'expired' ? 'Expired' : 'Expiring soon'}</span>
        </div>
    `).join('');
}

function renderAllCharts() {
    updateKPIs();
    renderBullets();
    renderDonut();
    renderBar();
    renderLine();
    renderAttention();
}

function buildNotifications() {
    const notifs = [];
    const now = new Date(); now.setHours(0,0,0,0);
    allDevices.forEach(d => {
        if (d.next_service) {
            const end = new Date(d.next_service);
            const days = Math.ceil((end - now) / (1000*60*60*24));
            if (days <= 7) {
                notifs.push({
                    icon: 'fa-tools',
                    color: days < 0 ? '#dc2626' : '#d97706',
                    title: `${d.brand || ''} ${d.model || d.type}`,
                    desc: days < 0 ? `Expired ${Math.abs(days)} day${Math.abs(days)>1?'s':''} ago` : `Expires in ${days} day${days>1?'s':''}`,
                    time: 'Recent'
                });
            }
        }
    });
    allServices.filter(s => s.status === 'pending').slice(0, 3).forEach(s => {
        notifs.push({ icon: 'fa-clock', color: '#1976d2', title: s.device_name || s.type, desc: 'Service pending', time: 'Recent' });
    });
    return notifs;
}

function updateNotifBadge() {
    const n = buildNotifications();
    const badge = document.getElementById('notifBadge');
    if (badge) { badge.textContent = n.length; badge.style.display = n.length > 0 ? 'flex' : 'none'; }
}

function showNotifications() {
    const notifs = buildNotifications();
    let modal = document.getElementById('notifModal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'notifModal';
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-box" style="max-width:420px">
            <h3 style="display:flex;align-items:center;gap:10px"><i class="fas fa-bell" style="color:#d97706"></i> Notifications (${notifs.length})</h3>
            ${notifs.length === 0 ? `<div style="text-align:center;padding:30px 10px;color:#9ca3af"><i class="fas fa-bell-slash" style="font-size:48px;margin-bottom:10px;display:block"></i>No new notifications</div>` :
            `<div style="max-height:400px;overflow-y:auto">
                ${notifs.map(n => `
                    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-bottom:1px solid #f0f0f0">
                        <div style="width:40px;height:40px;border-radius:50%;background:${n.color}22;color:${n.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <i class="fas ${n.icon}"></i>
                        </div>
                        <div style="flex:1">
                            <div style="font-weight:600;font-size:14px;color:#111827">${n.title}</div>
                            <div style="font-size:12px;color:#777;margin-top:2px">${n.desc}</div>
                            <div style="font-size:11px;color:#aaa;margin-top:3px">${n.time}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`}
            <div style="margin-top:15px;text-align:right">
                <button class="btn-outline" onclick="document.getElementById('notifModal').remove()">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

document.getElementById('notifBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showNotifications();
});

async function loadData() {
    try {
        const [devRes, srvRes, billRes] = await Promise.all([
            Devices.list(),
            Services.list(),
            Bills.list().catch(() => ({ bills: [] }))
        ]);
        if (!devRes.error) allDevices = devRes.devices || [];
        if (!srvRes.error) allServices = srvRes.services || [];
        if (!billRes.error) allBills = billRes.bills || [];
    } catch (err) {
        console.error('Failed to load data', err);
    }
    renderAllCharts();
    updateNotifBadge();
}

if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.onload = () => loadData();
    document.head.appendChild(script);
} else {
    loadData();
}
