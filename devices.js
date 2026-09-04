const user = JSON.parse(localStorage.getItem('currentUser'));
const token = localStorage.getItem('amc_token');
if (!user || !token) location.href = 'index.html';

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));

let allDevices = [];

function getIcon(type) {
    const icons = { TV: '📺', AC: '❄️', FRIDGE: '🧊', WASHING: '🌀', MICROWAVE: '📦', LAPTOP: '💻', HEATER: '🔥', FAN: '💨' };
    return icons[type] || '🔌';
}

function getCustomTypes() {
    return JSON.parse(localStorage.getItem('customDeviceTypes') || '[]');
}

function refreshTypeDropdowns() {
    const customTypes = getCustomTypes();
    const dType = document.getElementById('dType');
    const filterType = document.getElementById('filterType');
    if (!dType) return;
    customTypes.forEach(t => {
        if (![...dType.options].some(o => o.value === t.value)) {
            const opt = document.createElement('option');
            opt.value = t.value; opt.textContent = t.label;
            const otherOpt = dType.querySelector('option[value="OTHER"]');
            if (otherOpt) dType.insertBefore(opt, otherOpt);
            else dType.appendChild(opt);
        }
        if (filterType && ![...filterType.options].some(o => o.value === t.value)) {
            const fopt = document.createElement('option');
            fopt.value = t.value; fopt.textContent = t.label;
            filterType.appendChild(fopt);
        }
    });
}

function openAddTypeModal() {
    const modal = document.getElementById('addTypeModal');
    if (!modal) { console.error('addTypeModal not found in HTML'); alert('Add Type modal not found. Please refresh the page.'); return; }
    document.getElementById('newTypeInput').value = '';
    modal.classList.add('active');
    setTimeout(() => document.getElementById('newTypeInput').focus(), 100);
}

function closeAddTypeModal() {
    document.getElementById('addTypeModal').classList.remove('active');
}

function saveNewType() {
    try {
        const input = document.getElementById('newTypeInput');
        const name = input.value.trim();
        if (!name) { alert('Please enter a type name'); return; }
        if (name.length < 2) { alert('Type name too short'); return; }
        const value = name.toUpperCase().replace(/\s+/g, '_');
        const customTypes = getCustomTypes();
        if (customTypes.some(t => t.value === value)) { alert('This type already exists'); return; }
        customTypes.push({ value, label: name });
        localStorage.setItem('customDeviceTypes', JSON.stringify(customTypes));

        const dType = document.getElementById('dType');
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = name;
        const otherOpt = dType.querySelector('option[value="OTHER"]');
        if (otherOpt) dType.insertBefore(opt, otherOpt);
        else dType.appendChild(opt);
        dType.value = value;

        const filterType = document.getElementById('filterType');
        if (filterType) {
            const fopt = document.createElement('option');
            fopt.value = value;
            fopt.textContent = name;
            filterType.appendChild(fopt);
        }

        closeAddTypeModal();
        alert('Type "' + name + '" added successfully!');
    } catch (err) {
        console.error('saveNewType error:', err);
        alert('Error: ' + err.message);
    }
}

function render() {
    const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const type = document.getElementById('filterType')?.value || '';
    const devices = allDevices.filter(d =>
        (!type || d.type === type) &&
        ((d.brand || '').toLowerCase().includes(search) ||
         (d.model || '').toLowerCase().includes(search) ||
         (d.serial || '').toLowerCase().includes(search) ||
         (d.address || '').toLowerCase().includes(search) ||
         (d.mobile || '').includes(search))
    );

    const tbody = document.getElementById('deviceTable');
    if (!tbody) return;

    if (devices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#999">No devices found. Click "Add Device" to start.</td></tr>';
        return;
    }

    tbody.innerHTML = devices.map((d, i) => {
        let endDate = d.next_service ? new Date(d.next_service) : null;
        if (!endDate && d.purchase_date) {
            const p = new Date(d.purchase_date);
            p.setMonth(p.getMonth() + (d.warranty || 12));
            endDate = p;
        }
        const daysLeft = endDate ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;
        const daysLabel = daysLeft > 0 ? `${daysLeft} days left` : 'Expired';
        const daysClass = daysLeft > 30 ? 'days-green' : (daysLeft > 7 ? 'days-orange' : 'days-red');

        return `
            <tr>
                <td>${i + 1}</td>
                <td><b>${d.owner_name || 'Me'}</b></td>
                <td><b>${d.brand || ''} ${d.model || ''}</b><br><small style="color:#888">${d.type || ''}</small></td>
                <td>${d.serial || '-'}</td>
                <td>${d.mobile || '-'}</td>
                <td>${d.address || '-'}</td>
                <td>${endDate ? endDate.toLocaleDateString() : '-'} <span class="days-badge ${daysClass}">${daysLabel}</span></td>
                <td class="action-cell">
                    <button onclick="viewDevice(${d.id})" class="action-btn" title="View"><i class="fas fa-eye"></i></button>
                    ${user.role === 'admin' ? `
                        <button onclick="editDevice(${d.id})" class="action-btn" title="Edit"><i class="fas fa-pen"></i></button>
                        <button onclick="deleteDevice(${d.id})" class="action-btn danger" title="Delete"><i class="fas fa-trash"></i></button>
                    ` : ''}
                    ${user.role === 'admin' || user.role === 'customer' ? `
                        <button onclick="openRenewModal(${d.id})" class="action-btn" style="color:#11998e" title="Renew Service"><i class="fas fa-sync-alt"></i></button>
                        <button onclick="viewRenewals(${d.id})" class="action-btn" style="color:#667eea" title="Renewal History"><i class="fas fa-history"></i></button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Device';
    document.getElementById('deviceId').value = '';
    document.querySelector('#deviceModal form').reset();
    document.getElementById('deviceModal').classList.add('active');
}
function closeModal() { document.getElementById('deviceModal').classList.remove('active'); }

async function saveDevice(e) {
    e.preventDefault();
    const id = document.getElementById('deviceId').value;
    const data = {
        type: document.getElementById('dType').value,
        brand: document.getElementById('dBrand').value,
        model: document.getElementById('dModel').value,
        serial: document.getElementById('dSerial').value,
        address: document.getElementById('dAddress').value,
        mobile: document.getElementById('dMobile').value,
        purchase_date: document.getElementById('dPurchase').value,
        warranty: parseInt(document.getElementById('dWarranty').value) || 12
    };
    let result;
    if (id) {
        result = await Devices.update(id, data);
    } else {
        result = await Devices.add(data);
    }
    if (result.error) { alert(result.error); return; }
    closeModal();
    e.target.reset();
    await loadData();
    alert(id ? 'Device updated!' : 'Device added!');
}

async function deleteDevice(id) {
    if (!confirm('Delete this device?')) return;
    const result = await Devices.delete(id);
    if (result.error) { alert(result.error); return; }
    await loadData();
}

function viewDevice(id) {
    window.location.href = 'device-detail.html?id=' + id;
}

function editDevice(id) {
    const d = allDevices.find(x => x.id === id);
    if (!d) return;
    refreshTypeDropdowns();
    document.getElementById('modalTitle').textContent = 'Edit Device';
    document.getElementById('deviceId').value = d.id;
    const dType = document.getElementById('dType');
    if (![...dType.options].some(o => o.value === d.type)) {
        const opt = document.createElement('option');
        opt.value = d.type; opt.textContent = d.type;
        dType.insertBefore(opt, dType.querySelector('option[value="OTHER"]'));
    }
    dType.value = d.type || 'TV';
    document.getElementById('dBrand').value = d.brand || '';
    document.getElementById('dModel').value = d.model || '';
    document.getElementById('dSerial').value = d.serial || '';
    document.getElementById('dMobile').value = d.mobile || '';
    document.getElementById('dAddress').value = d.address || '';
    document.getElementById('dPurchase').value = d.purchase_date || '';
    document.getElementById('dWarranty').value = d.warranty || 12;
    document.getElementById('deviceModal').classList.add('active');
}

async function loadData() {
    refreshTypeDropdowns();
    const res = await Devices.list();
    if (res.error) {
        console.error('Load error:', res.error);
        return;
    }
    allDevices = res.devices || [];
    render();
}

const newTypeInput = document.getElementById('newTypeInput');
if (newTypeInput) {
    newTypeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveNewType(); }
    });
}

function openRenewModal(deviceId) {
    const d = allDevices.find(x => x.id === deviceId);
    if (!d) return;
    let endDate = d.next_service ? new Date(d.next_service) : null;
    if (!endDate && d.purchase_date) {
        const p = new Date(d.purchase_date);
        p.setMonth(p.getMonth() + (d.warranty || 12));
        endDate = p;
    }
    const days = endDate ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

    document.getElementById('renewDeviceId').value = deviceId;
    document.getElementById('renewDeviceInfo').innerHTML = `
        <b>${d.brand} ${d.model}</b> (${d.type})<br>
        <small>Current end: ${endDate ? endDate.toLocaleDateString() : 'N/A'} (${days > 0 ? days + ' days left' : 'Expired'})</small>
    `;
    document.getElementById('renewPlan').value = '';
    document.getElementById('renewMonths').value = 12;
    document.getElementById('renewAmount').value = 1500;
    document.getElementById('renewNotes').value = '';
    document.getElementById('customDuration').style.display = 'none';
    document.getElementById('renewModal').classList.add('active');
}

function closeRenewModal() {
    document.getElementById('renewModal').classList.remove('active');
}

function updateRenewCost() {
    const sel = document.getElementById('renewPlan');
    const opt = sel.options[sel.selectedIndex];
    const customBox = document.getElementById('customDuration');
    if (sel.value === 'Custom') {
        customBox.style.display = 'block';
    } else {
        customBox.style.display = 'none';
        if (opt.dataset.months) {
            document.getElementById('renewMonths').value = opt.dataset.months;
            document.getElementById('renewAmount').value = opt.dataset.cost;
        }
    }
}

async function submitRenewal(e) {
    e.preventDefault();
    const deviceId = parseInt(document.getElementById('renewDeviceId').value);
    const plan = document.getElementById('renewPlan');
    const planValue = plan.value;
    if (!planValue) { alert('Please select a plan'); return; }
    if (!deviceId || isNaN(deviceId)) { alert('Invalid device. Please refresh the page and try again.'); return; }

    const device = allDevices.find(d => d.id === deviceId);
    if (!device) { alert('This device no longer exists or you do not have access. Refreshing device list...'); await loadData(); return; }

    let data = { plan_type: planValue };
    if (planValue === 'Custom') {
        data.duration_months = parseInt(document.getElementById('renewMonths').value);
        data.amount = parseFloat(document.getElementById('renewAmount').value) || 0;
        if (!data.duration_months || data.duration_months < 1) { alert('Invalid duration'); return; }
    } else {
        const opt = plan.options[plan.selectedIndex];
        data.duration_months = parseInt(opt.dataset.months);
        data.amount = parseFloat(opt.dataset.cost) || 0;
    }
    data.notes = document.getElementById('renewNotes').value;

    const res = await Devices.renew(deviceId, data);
    if (res.error || res.status === 404) {
        if ((res.error && (res.error.includes('not found') || res.error.includes('not yours'))) || res.status === 404) {
            alert('This device is no longer accessible. Refreshing list...');
            closeRenewModal();
            await loadData();
        } else {
            alert(res.error || 'Failed to renew service');
        }
        return;
    }
    closeRenewModal();
    const newDate = new Date(res.renewal.new_end_date);
    alert('Service renewed!\n\nNew end date: ' + newDate.toLocaleDateString() + '\nNew warranty: ' + res.new_warranty + ' months\n\nBill generated (if amount > 0).');
    await loadData();
}

async function viewRenewals(deviceId) {
    const d = allDevices.find(x => x.id === deviceId);
    if (!d) return;
    const res = await Devices.renewals(deviceId);
    document.getElementById('renewalsDeviceInfo').innerHTML = `<b>${d.brand} ${d.model}</b> (${d.type})`;
    const list = document.getElementById('renewalsList');
    if (res.error || !res.renewals || res.renewals.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:30px">No renewals yet.</p>';
    } else {
        list.innerHTML = '<table class="data-table" style="width:100%"><thead><tr><th>Plan</th><th>Duration</th><th>Amount</th><th>New End Date</th><th>Status</th></tr></thead><tbody>' +
            res.renewals.map(r => `
                <tr>
                    <td><b>${r.plan_type}</b><br><small style="color:#888">${new Date(r.created_at).toLocaleDateString()}</small></td>
                    <td>${r.duration_months} months</td>
                    <td>₹${r.amount}</td>
                    <td>${new Date(r.new_end_date).toLocaleDateString()}</td>
                    <td><span class="status ${r.payment_status === 'paid' ? 'completed' : 'pending'}">${r.payment_status}</span></td>
                </tr>
            `).join('') + '</tbody></table>';
    }
    document.getElementById('renewalsModal').classList.add('active');
}

function closeRenewalsModal() {
    document.getElementById('renewalsModal').classList.remove('active');
}

loadData();
