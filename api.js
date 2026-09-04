const API_URL = (function() {
    if (typeof window.API_URL !== 'undefined' && window.API_URL) return window.API_URL;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        return 'https://amc-npl.onrender.com/api';
    }
    return 'https://amc-np-backend.onrender.com/api';
})();

function getToken() {
    return localStorage.getItem('amc_token');
}

async function api(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(getToken() && { 'Authorization': 'Bearer ' + getToken() })
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(API_URL + endpoint, options);
        let data;
        try { data = await res.json(); } catch(e) { data = { error: 'Invalid server response' }; }

        if (res.status === 401 || res.status === 403) {
            if (res.status === 403 && data.error && data.error.includes('disabled')) {
                alert('Your account has been disabled by admin.');
                localStorage.clear();
                location.href = 'index.html';
                return { error: data.error };
            }
            if (res.status === 401 && !endpoint.includes('/auth/login')) {
                localStorage.removeItem('amc_token');
                localStorage.removeItem('currentUser');
                if (location.pathname !== '/index.html' && !location.pathname.includes('index.html')) {
                    location.href = 'index.html';
                }
            }
        }
        if (!res.ok) {
            const msg = (data && data.error) || 'Request failed (HTTP ' + res.status + ')';
            return { error: msg, status: res.status };
        }
        return data;
    } catch (err) {
        console.error('API Error:', err);
        return { error: err.message, status: 0 };
    }
}

// AUTH
const Auth = {
    register: (data) => api('/auth/register', 'POST', data),
    login: (data) => api('/auth/login', 'POST', data),
    google: (data) => api('/auth/google', 'POST', data),
    me: () => api('/auth/me'),
    update: (data) => api('/auth/me', 'PUT', data),
    deleteAccount: () => api('/auth/me', 'DELETE')
};

// DEVICES
const Devices = {
    list: () => api('/devices'),
    add: (data) => api('/devices', 'POST', data),
    update: (id, data) => api('/devices/' + id, 'PUT', data),
    delete: (id) => api('/devices/' + id, 'DELETE'),
    renew: (id, data) => api('/devices/' + id + '/renew', 'POST', data),
    renewals: (id) => api('/devices/' + id + '/renewals')
};

// SERVICES
const Services = {
    list: () => api('/services'),
    book: (data) => api('/services', 'POST', data),
    assign: (id, technician) => api('/services/' + id + '/assign', 'PUT', { technician }),
    accept: (id) => api('/services/' + id + '/accept', 'PUT'),
    complete: (id, data) => api('/services/' + id + '/complete', 'PUT', data),
    allUsers: () => api('/services/users/all')
};

// BILLS
const Bills = {
    list: () => api('/bills'),
    pay: (id, method) => api('/bills/' + id + '/pay', 'PUT', { method })
};

function backToAdmin() {
    const adminBackup = localStorage.getItem('amc_token_backup');
    if (!adminBackup) {
        if (typeof showToast === 'function') showToast('No admin session to return to', 'error');
        else alert('No admin session to return to');
        return;
    }
    if (!confirm('Go back to Admin panel?')) return;
    const admin = JSON.parse(adminBackup);
    localStorage.setItem('currentUser', JSON.stringify(admin));
    localStorage.setItem('amc_token', localStorage.getItem('admin_token') || '');
    localStorage.removeItem('amc_token_backup');
    localStorage.removeItem('admin_token');
    location.href = 'admin.html';
}

function showBackToAdminBtn() {
    const btn = document.getElementById('backToAdminBtn');
    if (!btn) return;
    const hasBackup = localStorage.getItem('amc_token_backup');
    btn.style.display = hasBackup ? 'block' : 'none';
    if (hasBackup) {
        try {
            const admin = JSON.parse(hasBackup);
            btn.innerHTML = '<i class="fas fa-undo"></i> Back to ' + (admin.name || 'Admin');
        } catch(e) {}
    }
}

// ========== PROFILE DROPDOWN ==========
function initProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    if (!profileBtn) return;

    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const adminBackup = localStorage.getItem('amc_token_backup');
    const isAdmin = user.role === 'admin';
    const isSwitched = !!adminBackup;

    let adminName = '';
    if (isSwitched) {
        try { adminName = JSON.parse(adminBackup).name || 'Admin'; } catch(e) {}
    }

    let menuItems = '';
    const roleColor = user.role === 'admin' ? '#e74c3c' : user.role === 'technician' ? '#11998e' : '#667eea';
    menuItems += '<div class="profile-menu-header"><div class="pm-name">' + (user.name || 'User') + '</div><div class="pm-email">' + (user.email || '') + '</div><div class="pm-role" style="background:' + roleColor + '">' + (user.role || '') + '</div></div>';

    if (isAdmin) {
        menuItems += '<a href="#" onclick="event.preventDefault();openProfileSwitchModal()" class="profile-menu-item"><i class="fas fa-user-friends"></i> Switch User</a>';
    }
    if (isSwitched) {
        menuItems += '<a href="#" onclick="event.preventDefault();backToAdmin()" class="profile-menu-item" style="color:#16a085"><i class="fas fa-undo"></i> Return to ' + adminName + '</a>';
    }
    menuItems += '<a href="settings.html" class="profile-menu-item"><i class="fas fa-cog"></i> Settings</a>';
    menuItems += '<div class="profile-menu-divider"></div>';
    menuItems += '<a href="#" onclick="event.preventDefault();doProfileLogout()" class="profile-menu-item logout"><i class="fas fa-sign-out-alt"></i> Logout</a>';

    let menu = document.getElementById('profileMenu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'profileMenu';
        menu.className = 'profile-menu';
        document.body.appendChild(menu);
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('active');
            }
        });
    }
    menu.innerHTML = menuItems;

    const newBtn = profileBtn.cloneNode(true);
    profileBtn.parentNode.replaceChild(newBtn, profileBtn);
    newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = newBtn.getBoundingClientRect();
        menu.style.top = (rect.bottom + 8) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.classList.toggle('active');
    });
}

function doProfileLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('amc_token');
    localStorage.removeItem('amc_token_backup');
    localStorage.removeItem('admin_token');
    location.href = 'index.html';
}

function openProfileSwitchModal() {
    let modal = document.getElementById('switchModal');
    if (modal) {
        modal.classList.add('active');
        if (typeof loadSwitchUsers === 'function') loadSwitchUsers();
        return;
    }
    if (typeof openSwitchModal === 'function') { openSwitchModal(); return; }
    if (typeof window.loadAllUsersForSwitch === 'function') { window.loadAllUsersForSwitch(); return; }
    fetchAndShowSwitchModal();
}

async function fetchAndShowSwitchModal() {
    const res = await api('/services/users/all');
    if (res.error) { alert('Cannot load users: ' + res.error); return; }
    const users = (res.users || []).filter(u => u.id !== JSON.parse(localStorage.getItem('currentUser') || '{}').id);
    if (users.length === 0) { alert('No other users to switch to'); return; }

    let modal = document.getElementById('switchModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'switchModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal-box" style="max-width:450px">
            <h3><i class="fas fa-user-friends" style="color:#667eea"></i> Switch User</h3>
            <p style="color:#777;font-size:13px;margin-bottom:15px">View the app as another user. Click "Return to Admin" in profile to come back.</p>
            <label>Select User</label>
            <select id="switchUserSelect" style="width:100%;padding:11px 14px;border:1.5px solid #e1e5eb;border-radius:8px;font-size:14px;background:#f9fafb;margin-bottom:20px">
                <option value="">-- Select User --</option>
                ${users.map(u => `<option value="${u.id}">${u.name} (${u.email}) - ${u.role}</option>`).join('')}
            </select>
            <div style="display:flex;gap:10px">
                <button onclick="doGlobalSwitch()" class="btn" style="flex:1"><i class="fas fa-exchange-alt"></i> Switch</button>
                <button onclick="closeGlobalSwitch()" class="btn-outline" style="flex:1">Cancel</button>
            </div>
        </div>
    `;
    modal.classList.add('active');
}

async function doGlobalSwitch() {
    const userId = parseInt(document.getElementById('switchUserSelect').value);
    if (!userId) { alert('Please select a user'); return; }
    const res = await api('/services/users/all');
    const user = (res.users || []).find(u => u.id === userId);
    if (!user) { alert('User not found'); return; }

    const original = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const originalToken = localStorage.getItem('amc_token');
    if (!localStorage.getItem('amc_token_backup')) {
        localStorage.setItem('amc_token_backup', JSON.stringify(original));
        localStorage.setItem('admin_token', originalToken || '');
    }

    const imp = await api('/auth/impersonate', 'POST', { userId: user.id });
    if (imp.error) {
        alert('Switch failed: ' + imp.error);
        localStorage.removeItem('amc_token_backup');
        localStorage.removeItem('admin_token');
        return;
    }
    localStorage.setItem('amc_token', imp.token);
    localStorage.setItem('currentUser', JSON.stringify(imp.user));
    alert(`Now viewing as: ${imp.user.name} (${imp.user.role})`);
    if (imp.user.role === 'technician') location.href = 'technician.html';
    else location.href = 'dashboard.html';
}

function closeGlobalSwitch() {
    const modal = document.getElementById('switchModal');
    if (modal) modal.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    showBackToAdminBtn();
    initProfileDropdown();
    fillProfileInfo();
});
if (document.readyState !== 'loading') {
    showBackToAdminBtn();
    initProfileDropdown();
    fillProfileInfo();
}

function fillProfileInfo() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!user.name) return;
    const name = user.name;
    const role = user.role || 'customer';
    const initial = name.charAt(0).toUpperCase();

    const avatar = document.getElementById('userAvatar');
    const uName = document.getElementById('userName');
    const uRole = document.getElementById('userRole');
    if (avatar) {
        avatar.textContent = initial;
        const gradients = {
            admin: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
            technician: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            customer: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        };
        avatar.style.background = gradients[role] || gradients.customer;
    }
    if (uName) uName.textContent = name;
    if (uRole) uRole.textContent = role.toUpperCase();

    applyRoleNavLinks(role);
}

function applyRoleNavLinks(role) {
    const adminLink = document.getElementById('adminLink');
    const techLink = document.getElementById('techLink');
    const customerLinks = document.getElementById('customerLinks');
    if (adminLink) adminLink.style.display = role === 'admin' ? 'block' : 'none';
    if (techLink) techLink.style.display = (role === 'technician' || role === 'admin') ? 'block' : 'none';
    if (customerLinks) customerLinks.style.display = (role === 'admin' || role === 'technician') ? 'none' : 'block';
    enforcePageAccess(role);
}

function enforcePageAccess(role) {
    const path = location.pathname.toLowerCase();
    if (path.includes('admin.html') && role !== 'admin') {
        if (localStorage.getItem('amc_token_backup')) {
            alert('You are currently viewing as another user. Return to your admin account first.');
            location.href = 'dashboard.html';
        } else {
            alert('Admin access required');
            location.href = 'dashboard.html';
        }
    }
    if (path.includes('technician.html') && role !== 'technician' && role !== 'admin') {
        alert('Technician access required');
        location.href = 'dashboard.html';
    }
}

(function earlyRoleCheck() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const role = user.role || 'customer';
        const path = location.pathname.toLowerCase();
        if (path.includes('admin.html') && role !== 'admin' && !localStorage.getItem('amc_token_backup')) {
            alert('Admin access required');
            location.href = 'index.html';
        }
        if (path.includes('technician.html') && role !== 'technician' && role !== 'admin') {
            alert('Technician access required');
            location.href = 'dashboard.html';
        }
    } catch(e) {}
})();
