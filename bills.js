const user = JSON.parse(localStorage.getItem('currentUser'));
const token = localStorage.getItem('amc_token');
if (!user || !token) location.href = 'index.html';

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
if (closeSidebar) closeSidebar.addEventListener('click', () => sidebar.classList.remove('active'));

let currentBillId = null;
let allBills = [];

function updateStats() {
    const paid = allBills.filter(b => b.status === 'paid');
    const pending = allBills.filter(b => b.status !== 'paid');
    document.getElementById('paidCount').textContent = paid.length;
    document.getElementById('pendingCount').textContent = pending.length;
    document.getElementById('totalPaid').textContent = '₹' + paid.reduce((s,b) => s + b.amount, 0);
    document.getElementById('totalDue').textContent = '₹' + pending.reduce((s,b) => s + b.amount, 0);
}

function renderBills() {
    const search = document.getElementById('searchBill').value.toLowerCase();
    const status = document.getElementById('filterStatus').value;
    let bills = allBills;
    if (status) bills = bills.filter(b => b.status === status);
    if (search) bills = bills.filter(b => b.bill_no.toLowerCase().includes(search) || b.device_name.toLowerCase().includes(search));
    bills.sort((a,b) => new Date(b.date) - new Date(a.date));

    const list = document.getElementById('billsList');
    if (bills.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:40px">No bills found.</p>';
        return;
    }
    list.innerHTML = bills.map(b => {
        const statusClass = b.status === 'paid' ? 'completed' : (b.status === 'overdue' ? 'due' : 'pending');
        return `
            <div class="bill-row">
                <div class="bill-info">
                    <div class="bill-no">${b.bill_no}</div>
                    <div class="bill-device">${b.device_name} - ${b.service_type || 'Service'}</div>
                    <div class="bill-date">${new Date(b.date).toLocaleDateString()}</div>
                </div>
                <div class="bill-amount">₹${b.amount}</div>
                <div><span class="status ${statusClass}">${b.status}</span></div>
                <div class="bill-actions">
                    <button onclick="viewBill(${b.id})" class="btn" style="padding:6px 12px;font-size:12px"><i class="fas fa-eye"></i></button>
                    ${b.status !== 'paid' ? `<button onclick="openPayModal(${b.id})" class="btn" style="padding:6px 12px;font-size:12px;background:#11998e"><i class="fas fa-credit-card"></i> Pay</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function viewBill(id) {
    const bill = allBills.find(b => b.id === id);
    if (!bill) return;
    alert(`Bill: ${bill.bill_no}\nDevice: ${bill.device_name}\nService: ${bill.service_type}\nAmount: ₹${bill.amount}\nDate: ${new Date(bill.date).toLocaleDateString()}\nStatus: ${bill.status.toUpperCase()}`);
}

function openPayModal(id) {
    currentBillId = id;
    const bill = allBills.find(b => b.id === id);
    document.getElementById('payBillDetails').innerHTML = `
        <div style="background:#f9fafb;padding:15px;border-radius:8px;margin-bottom:15px">
            <p><b>Bill No:</b> ${bill.bill_no}</p>
            <p><b>Device:</b> ${bill.device_name}</p>
            <p style="font-size:20px;color:#667eea;margin-top:10px"><b>Amount: ₹${bill.amount}</b></p>
        </div>
    `;
    document.getElementById('payModal').classList.add('active');
}

function closePayModal() { document.getElementById('payModal').classList.remove('active'); currentBillId = null; }

async function processPayment() {
    if (!currentBillId) return;
    const method = document.querySelector('input[name="payMethod"]:checked').value;
    const result = await Bills.pay(currentBillId, method);
    if (result.error) { alert(result.error); return; }
    closePayModal();
    await loadData();
    alert('Payment successful!');
}

async function loadData() {
    const res = await Bills.list();
    if (res.error) { alert('Failed to load bills'); return; }
    allBills = res.bills;
    updateStats();
    renderBills();
}

loadData();
