let admin = JSON.parse(localStorage.getItem('currentUser'));
const token = localStorage.getItem('amc_token');
if (!admin || !token) {
    alert('Please login first!');
    location.href = 'index.html';
} else if (admin.role !== 'admin' && !localStorage.getItem('amc_token_backup')) {
    alert('Admin access required!');
    location.href = 'index.html';
}

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));

let allUsers = [];
let allDevices = [];
let allServices = [];
let allBills = [];

async function loadAll() {
    const [u, d, s, b] = await Promise.all([
        Services.allUsers(), Devices.list(), Services.list(), Bills.list()
    ]);
    allUsers = u.users || [];
    allDevices = d.devices || [];
    allServices = s.services || [];
    allBills = b.bills || [];
    updateStats();
    renderUsers();
    renderDevices();
    renderServices();
    renderBills();
    loadSwitchUsers();
}

function updateStats() {
    document.getElementById('totalUsers').textContent = allUsers.length;
    document.getElementById('totalDevices').textContent = allDevices.length;
    document.getElementById('totalServices').textContent = allServices.length;
    document.getElementById('totalRevenue').textContent = '₹' + allBills.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
}

document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');
    });
});

function renderUsers() {
    const search = document.getElementById('searchUser').value.toLowerCase();
    const role = document.getElementById('filterRole').value;
    let users = allUsers;
    if (role) users = users.filter(u => u.role === role);
    if (search) users = users.filter(u => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));

    const list = document.getElementById('usersList');
    if (users.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:30px">No users found.</p>';
        return;
    }
    list.innerHTML = `
        <table class="data-table" style="width:100%;background:white;border-radius:10px;overflow:hidden">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Devices</th><th>Services</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
                ${users.map(u => {
                    const dCount = allDevices.filter(d => d.user_id === u.id).length;
                    const sCount = allServices.filter(s => s.user_id === u.id).length;
                    const isSelf = u.id === admin.id;
                    const isDisabled = u.disabled;
                    return `
                        <tr style="${isDisabled ? 'opacity:0.5;background:#fee' : ''}">
                            <td><b>${u.name}</b></td>
                            <td>${u.email}</td>
                            <td>${u.phone || '-'}</td>
                            <td>
                                ${isSelf ? `<span class="role-badge ${u.role}">${u.role}</span>` :
                                `<select onchange="changeUserRole(${u.id}, this.value)" style="padding:4px 8px;border-radius:6px;border:1px solid #ddd;font-size:12px">
                                    <option value="customer" ${u.role === 'customer' ? 'selected' : ''}>Customer</option>
                                    <option value="technician" ${u.role === 'technician' ? 'selected' : ''}>Technician</option>
                                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>`}
                            </td>
                            <td>
                                ${isDisabled ?
                                    '<span style="background:#e74c3c;color:white;padding:3px 8px;border-radius:10px;font-size:11px">DISABLED</span>' :
                                    '<span style="background:#27ae60;color:white;padding:3px 8px;border-radius:10px;font-size:11px">ACTIVE</span>'}
                            </td>
                            <td>${dCount}</td>
                            <td>${sCount}</td>
                            <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                            <td>
                                <div style="display:flex;gap:4px;flex-wrap:wrap">
                                    <button onclick="switchToUser(${u.id})" class="btn" style="padding:5px 10px;font-size:11px" title="Switch to user"><i class="fas fa-user-switch"></i></button>
                                    ${isSelf ? '' :
                                    `<button onclick="toggleUserStatus(${u.id}, ${!isDisabled})" class="btn" style="padding:5px 10px;font-size:11px;background:${isDisabled ? '#27ae60' : '#e74c3c'}" title="${isDisabled ? 'Enable' : 'Disable'}">
                                        <i class="fas fa-${isDisabled ? 'check' : 'ban'}"></i>
                                    </button>`}
                                    ${isSelf ? '' :
                                    `<button onclick="deleteUser(${u.id}, '${u.name.replace(/'/g, "\\'")}')" class="btn" style="padding:5px 10px;font-size:11px;background:#95a5a6" title="Delete user">
                                        <i class="fas fa-trash"></i>
                                    </button>`}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function toggleUserStatus(userId, newDisabled) {
    const action = newDisabled ? 'disable' : 'enable';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    const res = await api('/auth/users/' + userId + '/status', 'PUT', { disabled: newDisabled });
    if (res.error) { alert(res.error); return; }
    alert(res.message);
    await loadAll();
}

async function changeUserRole(userId, newRole) {
    if (!confirm('Change user role to ' + newRole + '?')) {
        await loadAll();
        return;
    }
    const res = await api('/auth/users/' + userId + '/role', 'PUT', { role: newRole });
    if (res.error) { alert(res.error); await loadAll(); return; }
    alert('Role updated successfully');
    await loadAll();
}

function renderDevices() {
    const search = document.getElementById('searchDevice').value.toLowerCase();
    let devices = allDevices;
    if (search) devices = devices.filter(d => d.brand.toLowerCase().includes(search) || d.model.toLowerCase().includes(search) || d.type.toLowerCase().includes(search));

    const list = document.getElementById('devicesList');
    if (devices.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:30px">No devices found.</p>';
        return;
    }
    list.innerHTML = `
        <table class="data-table" style="width:100%;background:white;border-radius:10px;overflow:hidden">
            <thead><tr><th>Owner</th><th>Type</th><th>Brand</th><th>Model</th><th>Serial</th><th>Purchase</th><th>Next Service</th></tr></thead>
            <tbody>
                ${devices.map(d => {
                    const owner = allUsers.find(u => u.id === d.user_id);
                    return `<tr><td><b>${owner ? owner.name : 'Unknown'}</b></td><td>${d.type}</td><td>${d.brand}</td><td>${d.model}</td><td>${d.serial}</td><td>${new Date(d.purchase_date).toLocaleDateString()}</td><td>${d.next_service ? new Date(d.next_service).toLocaleDateString() : '-'}</td></tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderServices() {
    const search = document.getElementById('searchService').value.toLowerCase();
    const status = document.getElementById('filterServiceStatus').value;
    let services = allServices;
    if (status) services = services.filter(s => s.status === status);
    if (search) services = services.filter(s => s.device_name.toLowerCase().includes(search));
    services.sort((a,b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

    const technicians = allUsers.filter(u => u.role === 'technician');
    const list = document.getElementById('servicesList');
    if (services.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:30px">No services found.</p>';
        return;
    }
    list.innerHTML = `
        <table class="data-table" style="width:100%;background:white;border-radius:10px;overflow:hidden">
            <thead><tr><th>Customer</th><th>Device</th><th>Type</th><th>Date</th><th>Technician</th><th>Status</th><th>Cost</th><th>Actions</th></tr></thead>
            <tbody>
                ${services.map(s => {
                    const customer = allUsers.find(u => u.id === s.user_id);
                    return `<tr>
                        <td>${customer ? customer.name : 'Unknown'}</td>
                        <td>${s.device_name}</td>
                        <td>${s.type || 'Service'}</td>
                        <td>${s.date ? new Date(s.date).toLocaleDateString() : '-'}</td>
                        <td>${s.technician || '<span style="color:#f39c12">Unassigned</span>'}</td>
                        <td><span class="status ${s.status}">${s.status}</span></td>
                        <td>${s.cost ? '₹' + s.cost : '-'}</td>
                        <td>${s.status === 'pending' ? `<select onchange="assignTechnician(${s.id}, this.value)" style="padding:4px;font-size:12px;border-radius:4px"><option value="">Assign...</option>${technicians.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}</select>` : ''}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
}

async function assignTechnician(serviceId, technician) {
    if (!technician) return;
    const result = await Services.assign(serviceId, technician);
    if (result.error) { alert(result.error); return; }
    alert('Technician assigned!');
    await loadAll();
}

function renderBills() {
    const bills = allBills.sort((a,b) => new Date(b.date) - new Date(a.date));
    const total = bills.reduce((s,b) => s + b.amount, 0);
    const paid = bills.filter(b => b.status === 'paid').reduce((s,b) => s + b.amount, 0);
    const pending = bills.filter(b => b.status !== 'paid').reduce((s,b) => s + b.amount, 0);

    document.getElementById('billsList').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:20px">
            <div style="background:white;padding:20px;border-radius:10px;text-align:center"><div style="color:#888;font-size:13px">Total</div><div style="font-size:24px;font-weight:700">₹${total}</div></div>
            <div style="background:white;padding:20px;border-radius:10px;text-align:center"><div style="color:#888;font-size:13px">Collected</div><div style="font-size:24px;font-weight:700;color:#11998e">₹${paid}</div></div>
            <div style="background:white;padding:20px;border-radius:10px;text-align:center"><div style="color:#888;font-size:13px">Pending</div><div style="font-size:24px;font-weight:700;color:#e74c3c">₹${pending}</div></div>
        </div>
        <table class="data-table" style="width:100%;background:white;border-radius:10px;overflow:hidden">
            <thead><tr><th>Bill No</th><th>Device</th><th>Amount</th><th>Status</th><th>Method</th><th>Date</th></tr></thead>
            <tbody>
                ${bills.map(b => `<tr><td><b>${b.bill_no}</b></td><td>${b.device_name}</td><td><b>₹${b.amount}</b></td><td><span class="status ${b.status === 'paid' ? 'completed' : 'pending'}">${b.status}</span></td><td>${b.payment_method || '-'}</td><td>${new Date(b.date).toLocaleDateString()}</td></tr>`).join('')}
            </tbody>
        </table>
    `;
}

function loadSwitchUsers() {
    const sel = document.getElementById('switchUserSelect');
    sel.innerHTML = '<option value="">-- Select User --</option>';
    allUsers.filter(u => u.id !== admin.id).forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.name} (${u.email}) - ${u.role}`;
        sel.appendChild(opt);
    });
}

function openSwitchModal() { document.getElementById('switchModal').classList.add('active'); }
function closeSwitchModal() { document.getElementById('switchModal').classList.remove('active'); }

async function switchToUser(userId) {
    if (!userId) return;
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    if (!confirm(`Switch to ${user.name}? You'll see their data until you switch back.`)) return;
    await doSwitchTo(user);
}

async function doSwitch() {
    const userId = parseInt(document.getElementById('switchUserSelect').value);
    if (!userId) { alert('Select a user'); return; }
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    await doSwitchTo(user);
}

async function doSwitchTo(user) {
    const originalAdmin = JSON.parse(localStorage.getItem('amc_token_backup') || 'null');
    if (!originalAdmin) {
        localStorage.setItem('amc_token_backup', JSON.stringify(admin));
        localStorage.setItem('admin_token', localStorage.getItem('amc_token') || '');
    }
    const res = await api('/auth/impersonate', 'POST', { userId: user.id });
    if (res.error) {
        alert('Switch failed: ' + res.error);
        return;
    }
    localStorage.setItem('amc_token', res.token);
    localStorage.setItem('currentUser', JSON.stringify(res.user));
    closeSwitchModal();
    alert(`Now viewing as: ${res.user.name} (${res.user.role})`);
    if (res.user.role === 'technician') location.href = 'technician.html';
    else location.href = 'dashboard.html';
}

function adminLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('amc_token');
    localStorage.removeItem('amc_token_backup');
    localStorage.removeItem('admin_token');
    location.href = 'index.html';
}

function backToAdmin() {
    const adminBackup = localStorage.getItem('amc_token_backup');
    if (!adminBackup) {
        alert('No admin session to return to');
        return;
    }
    const admin = JSON.parse(adminBackup);
    localStorage.setItem('currentUser', JSON.stringify(admin));
    localStorage.setItem('amc_token', localStorage.getItem('admin_token') || '');
    localStorage.removeItem('amc_token_backup');
    localStorage.removeItem('admin_token');
    alert('Welcome back, Admin!');
    location.reload();
}

function showBackToAdminBtn() {
    const btn = document.getElementById('backToAdminBtn');
    if (!btn) return;
    const hasBackup = localStorage.getItem('amc_token_backup');
    btn.style.display = hasBackup ? 'block' : 'none';
}

function openAddUserModal() {
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPhone').value = '';
    document.getElementById('newUserRole').value = 'customer';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('addUserModal').classList.add('active');
    setTimeout(() => document.getElementById('newUserName').focus(), 100);
}

function closeAddUserModal() {
    document.getElementById('addUserModal').classList.remove('active');
}

async function createNewUser(e) {
    e.preventDefault();
    const data = {
        name: document.getElementById('newUserName').value.trim(),
        email: document.getElementById('newUserEmail').value.trim(),
        phone: document.getElementById('newUserPhone').value.trim(),
        role: document.getElementById('newUserRole').value,
        password: document.getElementById('newUserPassword').value
    };
    if (!data.name || !data.email || !data.password) { alert('All required fields must be filled'); return; }
    if (data.password.length < 6) { alert('Password must be at least 6 characters'); return; }

    const res = await api('/auth/users', 'POST', data);
    if (res.error) { alert(res.error); return; }
    closeAddUserModal();
    alert('User "' + res.user.name + '" created successfully! Login: ' + res.user.email);
    await loadAll();
}

async function deleteUser(userId, userName) {
    if (!confirm('Delete user "' + userName + '" and all their data?\n\nThis action cannot be undone.')) return;
    if (!confirm('Final confirmation: Delete this user?')) return;
    const res = await api('/auth/users/' + userId, 'DELETE');
    if (res.error) { alert(res.error); return; }
    alert('User deleted');
    await loadAll();
}

loadAll();
showBackToAdminBtn();
