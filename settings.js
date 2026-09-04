let user = JSON.parse(localStorage.getItem('currentUser'));
if (!user) location.href = 'index.html';

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function loadProfile() {
    document.getElementById('setName').value = user.name || '';
    document.getElementById('setEmail').value = user.email || '';
    document.getElementById('setPhone').value = user.phone || '';
    document.getElementById('setAddress').value = user.address || '';
    document.getElementById('setRole').value = (user.role || 'customer').toUpperCase();
    document.getElementById('profilePic').textContent = user.name.charAt(0).toUpperCase();
}

function loadNotifications() {
    const prefs = JSON.parse(localStorage.getItem('notifPrefs_' + user.id) || '{}');
    document.getElementById('emailNotif').checked = prefs.email !== false;
    document.getElementById('smsNotif').checked = prefs.sms !== false;
    document.getElementById('serviceNotif').checked = prefs.service !== false;
    document.getElementById('marketingNotif').checked = prefs.marketing === true;
}

document.querySelectorAll('.set-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.set-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.set-section').forEach(s => s.classList.remove('active'));
        link.classList.add('active');
        document.getElementById(link.dataset.tab).classList.add('active');
    });
});

function saveProfile(e) {
    e.preventDefault();
    const name = document.getElementById('setName').value.trim();
    const email = document.getElementById('setEmail').value.trim();
    const phone = document.getElementById('setPhone').value.trim();
    const address = document.getElementById('setAddress').value.trim();

    if (!name || !email || !phone) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    Auth.update({ name, email, phone, address }).then(async (res) => {
        if (res.error) { showToast(res.error, 'error'); return; }
        localStorage.setItem('currentUser', JSON.stringify(res.user));
        user = res.user;
        document.getElementById('profilePic').textContent = name.charAt(0).toUpperCase();
        showToast('Profile updated successfully!');
    });
}

function changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('currentPass').value;
    const newPass = document.getElementById('newPass').value;
    const confirm = document.getElementById('confirmPass').value;

    if (newPass.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
    }
    if (newPass !== confirm) {
        showToast('New passwords do not match', 'error');
        return;
    }

    Auth.update({ name: user.name, password: newPass }).then((res) => {
        if (res.error) { showToast('Current password incorrect or update failed', 'error'); return; }
        e.target.reset();
        showToast('Password changed successfully!');
    });
}

function saveNotifications() {
    const prefs = {
        email: document.getElementById('emailNotif').checked,
        sms: document.getElementById('smsNotif').checked,
        service: document.getElementById('serviceNotif').checked,
        marketing: document.getElementById('marketingNotif').checked
    };
    localStorage.setItem('notifPrefs_' + user.id, JSON.stringify(prefs));
    showToast('Notification preferences saved!');
}

async function deleteAccount() {
    if (!confirm('Are you sure? This will permanently delete your account and ALL data.')) return;
    if (!confirm('This action cannot be undone. Confirm delete?')) return;

    const res = await Auth.deleteAccount();
    if (res.error) { showToast(res.error, 'error'); return; }
    localStorage.clear();
    showToast('Account deleted. Redirecting...', 'error');
    setTimeout(() => location.href = 'index.html', 1500);
}

function resetData() {
    if (!confirm('This will clear all your devices, services, and bills. Continue?')) return;
    if (!confirm('This cannot be undone. Confirm?')) return;
    showToast('Use Delete Account to clear all data, or go to My Devices to delete individual devices.', 'error');
}

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('amc_token');
    location.href = 'index.html';
}

async function loadProfile() {
    const res = await Auth.me();
    if (res.error || !res.user) return;
    user = res.user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    document.getElementById('setName').value = user.name || '';
    document.getElementById('setEmail').value = user.email || '';
    document.getElementById('setPhone').value = user.phone || '';
    document.getElementById('setAddress').value = user.address || '';
    document.getElementById('setRole').value = (user.role || 'customer').toUpperCase();
    document.getElementById('profilePic').textContent = (user.name || 'U').charAt(0).toUpperCase();
}

loadProfile();
loadNotifications();
