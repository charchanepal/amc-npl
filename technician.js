let tech = JSON.parse(localStorage.getItem('currentUser'));
if (!tech) location.href = 'index.html';

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));

let currentJobId = null;
let myJobs = [];
let availableJobs = [];
let completedJobs = [];
let allUsers = [];

document.getElementById('techName').textContent = tech.name;

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast ' + type + ' show';
    setTimeout(() => t.classList.remove('show'), 3000);
}

function updateCounts() {
    document.getElementById('assignedCount').textContent = myJobs.length;
    document.getElementById('completedCount').textContent = completedJobs.length;
}

document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
    });
});

function renderMyJobs() {
    const list = document.getElementById('myJobsList');
    if (myJobs.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:30px">No active jobs assigned.</p>';
        return;
    }
    list.innerHTML = myJobs.map(s => {
        const customer = allUsers.find(u => u.id === s.user_id);
        return `
            <div class="job-card">
                <div class="job-header">
                    <div><h3>${s.device_name}</h3><p style="color:#888;font-size:13px"><i class="fas fa-user"></i> ${customer ? customer.name : 'Unknown'} | <i class="fas fa-phone"></i> ${customer ? customer.phone : '-'}</p></div>
                    <span class="status pending">Pending</span>
                </div>
                <div class="job-body">
                    <p><b>Service Type:</b> ${s.type || 'Service'}</p>
                    <p><b>Date:</b> ${new Date(s.date).toLocaleDateString()} ${s.time_slot || ''}</p>
                    <p><b>Issue:</b> ${s.issue || 'No description'}</p>
                </div>
                <div class="job-actions">
                    <button onclick="openJobModal(${s.id})" class="btn" style="background:#11998e"><i class="fas fa-check"></i> Complete Job</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAvailable() {
    const list = document.getElementById('availableList');
    if (availableJobs.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:30px">No available jobs right now.</p>';
        return;
    }
    list.innerHTML = availableJobs.map(s => {
        const customer = allUsers.find(u => u.id === s.user_id);
        return `
            <div class="job-card" style="border-left:4px solid #f2994a">
                <div class="job-header">
                    <div><h3>${s.device_name}</h3><p style="color:#888;font-size:13px"><i class="fas fa-user"></i> ${customer ? customer.name : 'Unknown'}</p></div>
                    <span class="status pending">Unassigned</span>
                </div>
                <div class="job-body">
                    <p><b>Type:</b> ${s.type || 'Service'}</p>
                    <p><b>Date:</b> ${new Date(s.date).toLocaleDateString()}</p>
                    <p><b>Issue:</b> ${s.issue || 'No description'}</p>
                </div>
                <div class="job-actions">
                    <button onclick="acceptJob(${s.id})" class="btn"><i class="fas fa-hand-paper"></i> Accept Job</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCompleted() {
    const list = document.getElementById('completedList');
    if (completedJobs.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:30px">No completed jobs yet.</p>';
        return;
    }
    const totalEarned = completedJobs.reduce((s, sv) => s + (sv.cost || 0), 0);
    list.innerHTML = `
        <div style="background:white;padding:20px;border-radius:10px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
            <div><b>Total Jobs:</b> ${completedJobs.length}</div>
            <div><b>Total Earned:</b> <span style="color:#11998e;font-size:20px">₹${totalEarned}</span></div>
        </div>
        <table class="data-table" style="width:100%;background:white;border-radius:10px;overflow:hidden">
            <thead><tr><th>Device</th><th>Customer</th><th>Date</th><th>Cost</th></tr></thead>
            <tbody>${completedJobs.map(s => { const customer = allUsers.find(u => u.id === s.user_id); return `<tr><td>${s.device_name}</td><td>${customer ? customer.name : '-'}</td><td>${new Date(s.date).toLocaleDateString()}</td><td><b>₹${s.cost || 0}</b></td></tr>`; }).join('')}</tbody>
        </table>
    `;
}

async function acceptJob(id) {
    const result = await Services.accept(id);
    if (result.error) { showToast(result.error, 'error'); return; }
    showToast('Job accepted!');
    await loadAll();
}

function openJobModal(id) {
    currentJobId = id;
    const service = [...myJobs, ...availableJobs, ...completedJobs].find(s => s.id === id);
    const customer = allUsers.find(u => u.id === service.user_id);
    document.getElementById('jobDetails').innerHTML = `
        <div style="background:#f9fafb;padding:15px;border-radius:8px">
            <p><b>Customer:</b> ${customer ? customer.name : '-'}</p>
            <p><b>Device:</b> ${service.device_name}</p>
            <p><b>Service:</b> ${service.type || 'Service'}</p>
            <p><b>Issue:</b> ${service.issue || 'No description'}</p>
        </div>
    `;
    document.getElementById('jobCost').value = service.cost || '';
    document.getElementById('jobNotes').value = service.notes || '';
    document.getElementById('jobModal').classList.add('active');
}

function closeJobModal() { document.getElementById('jobModal').classList.remove('active'); currentJobId = null; }

async function markComplete() {
    const cost = parseFloat(document.getElementById('jobCost').value) || 0;
    const notes = document.getElementById('jobNotes').value.trim();
    if (cost <= 0) { showToast('Enter valid cost', 'error'); return; }
    const result = await Services.complete(currentJobId, { cost, notes });
    if (result.error) { showToast(result.error, 'error'); return; }
    closeJobModal();
    showToast('Completed & bill generated!');
    await loadAll();
}

async function loadAll() {
    const [sRes, uRes] = await Promise.all([Services.list(), Services.allUsers()]);
    if (sRes.error || uRes.error) { showToast('Failed to load', 'error'); return; }
    allUsers = uRes.users || [];
    const services = sRes.services || [];
    myJobs = services.filter(s => s.technician === tech.name && s.status === 'pending');
    availableJobs = services.filter(s => !s.technician && s.status === 'pending');
    completedJobs = services.filter(s => s.technician === tech.name && s.status === 'completed');
    updateCounts();
    renderMyJobs();
    renderAvailable();
    renderCompleted();
}

function techLogout() {
    const adminToken = localStorage.getItem('admin_token');
    const adminUser = localStorage.getItem('amc_token_backup');
    if (adminToken && adminUser) {
        localStorage.setItem('amc_token', adminToken);
        localStorage.setItem('currentUser', adminUser);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('amc_token_backup');
        location.href = 'admin.html';
    } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('amc_token');
        location.href = 'index.html';
    }
}

loadAll();
