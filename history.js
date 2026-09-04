const user = JSON.parse(localStorage.getItem('currentUser'));
const token = localStorage.getItem('amc_token');
if (!user || !token) location.href = 'index.html';

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));

let allServices = [];

function getServices() {
    return allServices.filter(s => s.status === 'completed');
}

function loadYearFilter() {
    const years = [...new Set(getServices().map(s => new Date(s.date).getFullYear()))].sort((a,b) => b-a);
    const sel = document.getElementById('filterYear');
    years.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; sel.appendChild(o); });
}

function renderHistory() {
    const search = document.getElementById('searchHistory').value.toLowerCase();
    const year = document.getElementById('filterYear').value;
    let services = getServices();
    if (year) services = services.filter(s => new Date(s.date).getFullYear() == year);
    if (search) services = services.filter(s => s.device_name.toLowerCase().includes(search));
    services.sort((a,b) => new Date(b.date) - new Date(a.date));

    const list = document.getElementById('historyList');
    if (services.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:40px">No service history found.</p>';
        return;
    }
    let totalSpent = services.reduce((sum,s) => sum + (s.cost || 0), 0);
    list.innerHTML = `
        <div style="background:white;padding:20px;border-radius:10px;margin-bottom:20px">
            <h3>Total: ${services.length} services | Spent: ₹${totalSpent}</h3>
        </div>
        <table class="data-table" style="width:100%;background:white;border-radius:10px;overflow:hidden">
            <thead>
                <tr><th>Date</th><th>Device</th><th>Service</th><th>Technician</th><th>Cost</th><th>Receipt</th></tr>
            </thead>
            <tbody>
                ${services.map(s => `
                    <tr>
                        <td>${new Date(s.date).toLocaleDateString()}</td>
                        <td>${s.device_name}</td>
                        <td>${s.type || 'Service'}</td>
                        <td>${s.technician || '-'}</td>
                        <td>₹${s.cost || 0}</td>
                        <td><button onclick="downloadReceipt(${s.id})" class="btn" style="padding:6px 12px;font-size:12px"><i class="fas fa-download"></i></button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function downloadReceipt(id) {
    const s = getServices().find(x => x.id === id);
    if (!s) return;
    const receipt = `<html><head><title>Receipt</title></head>
    <body><h1>AMC NP - Receipt</h1>
    <p><b>Date:</b> ${new Date(s.date).toLocaleDateString()}</p>
    <p><b>Device:</b> ${s.device_name}</p>
    <p><b>Service:</b> ${s.type || 'Service'}</p>
    <p><b>Cost:</b> ₹${s.cost || 0}</p></body></html>`;
    const win = window.open('', '', 'width=400,height=400');
    win.document.write(receipt); win.print();
}

async function loadData() {
    const res = await Services.list();
    if (!res.error) { allServices = res.services; loadYearFilter(); renderHistory(); }
}

loadData();
