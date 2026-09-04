let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
const token = localStorage.getItem('amc_token');
if (!currentUser || !token) window.location.href = 'index.html';

document.getElementById('userName').textContent = currentUser.name;
document.getElementById('userRole').textContent = currentUser.role;
document.getElementById('welcomeName').textContent = currentUser.name.split(' ')[0];
document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();

const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.add('active');
});
closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});

const modal = document.getElementById('addDeviceModal');
const addDeviceBtn = document.getElementById('addDeviceBtn');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');

if (addDeviceBtn && modal) {
    addDeviceBtn.addEventListener('click', () => modal.classList.add('active'));
    if (closeModal) closeModal.addEventListener('click', () => modal.classList.remove('active'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
}

let allDevices = [];
let allServices = [];

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateStats() {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const due = allDevices.filter(d => d.next_service && new Date(d.next_service) <= monthEnd).length;

    document.getElementById('totalDevices').textContent = allDevices.length;
    document.getElementById('totalServices').textContent = allServices.filter(s => s.status === 'completed').length;
    document.getElementById('pendingServices').textContent = allServices.filter(s => s.status === 'pending').length;
    document.getElementById('dueServices').textContent = due;
}

function renderServiceTable() {
    const recent = allServices.slice(-5).reverse();
    const tbody = document.getElementById('serviceTable');
    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><i class="fas fa-inbox"></i><p>No services yet. Add a device to get started.</p></td></tr>`;
        return;
    }
    tbody.innerHTML = recent.map(s => `
        <tr>
            <td>${s.device_name || 'Device'}</td>
            <td>${new Date(s.date).toLocaleDateString()}</td>
            <td><span class="status ${s.status}">${s.status}</span></td>
            <td>${s.cost ? '₹' + s.cost : '-'}</td>
        </tr>
    `).join('');
}

function renderReminders() {
    const upcoming = allDevices.filter(d => d.next_service).slice(0, 4);
    const list = document.getElementById('reminderList');
    if (upcoming.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No upcoming reminders.</p></div>`;
        return;
    }
    list.innerHTML = upcoming.map(d => {
        const days = Math.ceil((new Date(d.next_service) - new Date()) / (1000 * 60 * 60 * 24));
        return `
            <div class="reminder-item">
                <i class="fas fa-tools"></i>
                <div class="reminder-info">
                    <div class="reminder-title">${d.brand} ${d.model}</div>
                    <div class="reminder-date">${days > 0 ? `Due in ${days} days` : 'Overdue'}</div>
                </div>
            </div>
        `;
    }).join('');
}

function buildNotifications() {
    const notifs = [];
    const now = new Date();
    allDevices.forEach(d => {
        if (d.next_service) {
            const days = Math.ceil((new Date(d.next_service) - now) / (1000 * 60 * 60 * 24));
            if (days <= 7) {
                notifs.push({
                    icon: 'fa-tools',
                    color: days < 0 ? '#e74c3c' : '#f39c12',
                    title: `${d.brand || ''} ${d.model || d.type} service`,
                    desc: days < 0 ? `Overdue by ${Math.abs(days)} days` : `Due in ${days} days`,
                    time: 'Today'
                });
            }
        }
    });
    const pending = allServices.filter(s => s.status === 'pending').length;
    if (pending > 0) {
        notifs.push({
            icon: 'fa-clock',
            color: '#3498db',
            title: `${pending} pending service${pending > 1 ? 's' : ''}`,
            desc: 'Tap "Service Requests" to view',
            time: 'Recent'
        });
    }
    const unpaid = allServices.filter(s => s.status === 'completed' && !s.paid).length;
    if (unpaid > 0) {
        notifs.push({
            icon: 'fa-file-invoice',
            color: '#16a085',
            title: `${unpaid} unpaid bill${unpaid > 1 ? 's' : ''}`,
            desc: 'Check your bills section',
            time: 'Recent'
        });
    }
    return notifs;
}

function updateNotifBadge() {
    const notifs = buildNotifications();
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = notifs.length;
        badge.style.display = notifs.length > 0 ? 'flex' : 'none';
    }
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
            <h3 style="display:flex;align-items:center;gap:10px"><i class="fas fa-bell" style="color:#f39c12"></i> Notifications (${notifs.length})</h3>
            ${notifs.length === 0 ? `<div style="text-align:center;padding:30px 10px;color:#999"><i class="fas fa-bell-slash" style="font-size:48px;margin-bottom:10px;display:block"></i>No new notifications</div>` :
            `<div style="max-height:400px;overflow-y:auto">
                ${notifs.map(n => `
                    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-bottom:1px solid #f0f0f0">
                        <div style="width:40px;height:40px;border-radius:50%;background:${n.color}22;color:${n.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <i class="fas ${n.icon}"></i>
                        </div>
                        <div style="flex:1">
                            <div style="font-weight:600;font-size:14px;color:#333">${n.title}</div>
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

async function loadData() {
    const [devRes, srvRes] = await Promise.all([Devices.list(), Services.list()]);
    if (!devRes.error) allDevices = devRes.devices;
    if (!srvRes.error) allServices = srvRes.services;
    updateStats();
    renderServiceTable();
    renderReminders();
    updateNotifBadge();
}

document.getElementById('notifBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showNotifications();
});

document.getElementById('addDeviceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        type: document.getElementById('deviceType').value,
        brand: document.getElementById('deviceBrand').value,
        model: document.getElementById('deviceModel').value,
        serial: document.getElementById('deviceSerial').value,
        purchase_date: document.getElementById('purchaseDate').value,
        warranty: parseInt(document.getElementById('warranty').value),
        mobile: document.getElementById('deviceMobile').value,
        address: document.getElementById('deviceAddress').value
    };
    const result = await Devices.add(data);
    if (result.error) { showToast(result.error, 'error'); return; }
    modal.classList.remove('active');
    e.target.reset();
    showToast('Device added successfully!', 'success');
    await loadData();
});

loadData();
