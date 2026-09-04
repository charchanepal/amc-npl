const user = JSON.parse(localStorage.getItem('currentUser'));
const token = localStorage.getItem('amc_token');
if (!user || !token) location.href = 'index.html';

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));

let allDevices = [];
let allBookings = [];

async function loadDevices() {
    const res = await Devices.list();
    if (res.error) return;
    allDevices = res.devices;
    const sel = document.getElementById('bDevice');
    sel.innerHTML = '<option value="">-- Choose Device --</option>';
    allDevices.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.brand} ${d.model} (${d.type})`;
        sel.appendChild(opt);
    });
}

async function bookService(e) {
    e.preventDefault();
    const deviceId = parseInt(document.getElementById('bDevice').value);
    const device = allDevices.find(d => d.id === deviceId);
    if (!device) { alert('Select a device'); return; }

    const data = {
        device_id: deviceId,
        device_name: `${device.brand} ${device.model}`,
        type: document.getElementById('bType').value,
        date: document.getElementById('bDate').value,
        time_slot: document.getElementById('bTime').value,
        issue: document.getElementById('bIssue').value
    };

    const result = await Services.book(data);
    if (result.error) { alert(result.error); return; }
    e.target.reset();
    await loadBookings();
    alert('Service booked successfully!');
}

async function loadBookings() {
    const res = await Services.list();
    if (res.error) return;
    allBookings = res.services.filter(s => s.status === 'pending');
    const list = document.getElementById('bookingsList');
    if (allBookings.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:30px">No active bookings.</p>';
        return;
    }
    list.innerHTML = allBookings.map(s => `
        <div class="card" style="margin-bottom:15px">
            <h3>${s.device_name} - ${s.type}</h3>
            <p><b>Date:</b> ${new Date(s.date).toLocaleDateString()} at ${s.time_slot || ''}</p>
            <p><b>Issue:</b> ${s.issue || '-'}</p>
            ${s.technician ? `<p><b>Technician:</b> ${s.technician}</p>` : ''}
            <span class="status pending">${s.status}</span>
        </div>
    `).join('');
}

loadDevices();
loadBookings();
