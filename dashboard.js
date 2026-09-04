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

menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
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

addDeviceBtn.addEventListener('click', () => modal.classList.add('active'));
closeModal.addEventListener('click', () => modal.classList.remove('active'));
cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

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

async function loadData() {
    const [devRes, srvRes] = await Promise.all([Devices.list(), Services.list()]);
    if (!devRes.error) allDevices = devRes.devices;
    if (!srvRes.error) allServices = srvRes.services;
    updateStats();
    renderServiceTable();
    renderReminders();
}

document.getElementById('addDeviceForm').addEventListener('submit', async (e) => {
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
