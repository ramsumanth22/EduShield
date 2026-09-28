// EduShield authentication: Student + Staff role-based login/register.

const API_BASE_URL = 'http://127.0.0.1:8000';

let isRegister = false;
let currentUser = null;
let selectedAuthRole = 'student';

function selectAuthRole(role) {
    selectedAuthRole = role === 'staff' ? 'staff' : 'student';

    const roleEl = document.getElementById('input-role');
    if (roleEl) roleEl.value = selectedAuthRole;

    const studentBtn = document.getElementById('role-student-btn');
    const staffBtn = document.getElementById('role-staff-btn');

    if (studentBtn && staffBtn) {
        studentBtn.className = selectedAuthRole === 'student' ? 'btn-submit' : 'btn-outline';
        staffBtn.className = selectedAuthRole === 'staff' ? 'btn-submit' : 'btn-outline';
        studentBtn.style.margin = '0';
        staffBtn.style.margin = '0';
    }

    updateAuthForm();
}

function toggleAuthMode() {
    isRegister = !isRegister;
    clearAuthError();
    updateAuthForm();
}

function updateAuthForm() {
    const titleEl = document.getElementById('auth-title');
    const subEl = document.getElementById('auth-sub');
    const nameGroup = document.getElementById('group-name');
    const classGroup = document.getElementById('group-class');
    const codeGroup = document.getElementById('group-staff-code');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');

    const roleName = selectedAuthRole === 'staff' ? 'Staff' : 'Student';

    if (titleEl) titleEl.innerText = isRegister ? `Create ${roleName} Account` : `${roleName} Login`;
    if (subEl) subEl.innerText = isRegister
        ? `Register as a ${roleName.toLowerCase()} to use EduShield`
        : `Log in to your ${roleName.toLowerCase()} account`;

    if (nameGroup) nameGroup.style.display = isRegister ? 'block' : 'none';
    if (classGroup) classGroup.style.display = isRegister ? 'block' : 'none';
    if (codeGroup) codeGroup.style.display = isRegister && selectedAuthRole === 'staff' ? 'block' : 'none';
    if (submitBtn) submitBtn.innerText = isRegister ? 'Create Account' : 'Login';

    if (toggleText) {
        toggleText.innerHTML = isRegister
            ? 'Already have an account? <span onclick="toggleAuthMode()" style="color:var(--accent-blue); cursor:pointer; text-decoration:underline;">Login</span>'
            : 'Don\'t have an account? <span onclick="toggleAuthMode()" style="color:var(--accent-blue); cursor:pointer; text-decoration:underline;">Register</span>';
    }
}

async function handleAuth(e) {
    if (e?.preventDefault) e.preventDefault();

    try {
        const role = selectedAuthRole;
        const email = document.getElementById('input-email')?.value.trim().toLowerCase() || '';
        const password = document.getElementById('input-password')?.value || '';
        const name = document.getElementById('input-name')?.value.trim() || '';
        const className = document.getElementById('input-class')?.value.trim() || '';
        const staffCode = document.getElementById('input-staff-code')?.value || '';

        if (!email || !password) {
            showAuthError('Please enter your email and password.');
            return;
        }

        if (isRegister && !name) {
            showAuthError('Please enter your full name.');
            return;
        }

        if (isRegister && role === 'student' && !className) {
            showAuthError('Please enter your class.');
            return;
        }

        if (isRegister && role === 'staff' && !staffCode) {
            showAuthError('Please enter the staff registration code.');
            return;
        }

        let response;

        if (isRegister) {
            response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    role,
                    class_name: className || null,
                    staff_code: staffCode || null
                })
            });
        } else {
            response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            showAuthError(data.detail || (isRegister ? 'Registration failed.' : 'Login failed.'));
            return;
        }

        if (isRegister) {
            alert(`${role === 'staff' ? 'Staff' : 'Student'} account created successfully. Please log in.`);
            clearAuthInputs();
            toggleAuthMode();
            return;
        }

        localStorage.setItem('edushield_token', data.access_token);

        currentUser = {
            id: data.user?.id || '',
            name: data.user?.name || email.split('@')[0],
            email: data.user?.email || email,
            role: data.user?.role || role,
            class_name: data.user?.class_name || null
        };

        localStorage.setItem('edushield_user', JSON.stringify(currentUser));
        updateLoggedInNav();

        if (currentUser.role === 'staff') {
            if (typeof openStaffDashboard === 'function') openStaffDashboard();
            else if (typeof showScreen === 'function') showScreen('screen-staff-dashboard');
        } else {
            if (typeof goDashboard === 'function') goDashboard();
            else if (typeof showScreen === 'function') showScreen('screen-dashboard');
        }
    } catch (error) {
        console.error('Auth System Error:', error);
        showAuthError('Cannot connect to EduShield. Make sure the FastAPI backend is running on port 8000.');
    }
}

function updateLoggedInNav() {
    const userDisp = document.getElementById('user-display');
    const userNav = document.getElementById('user-nav');
    const staffBtn = document.getElementById('staff-nav-btn');

    if (userDisp && currentUser) userDisp.innerText = `👤 ${currentUser.name} (${currentUser.role.toUpperCase()})`;
    if (userNav) userNav.style.display = 'flex';
    if (staffBtn) staffBtn.style.display = currentUser?.role === 'staff' ? 'inline-block' : 'none';
}

function showAuthError(msg) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.innerText = msg;
        errorEl.style.display = 'block';
    } else alert(msg);
}

function clearAuthError() {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.innerText = '';
        errorEl.style.display = 'none';
    }
}

function clearAuthInputs() {
    ['input-name', 'input-class', 'input-staff-code', 'input-email', 'input-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function getAuthToken() {
    return localStorage.getItem('edushield_token');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('edushield_token');
    localStorage.removeItem('edushield_user');

    const userNav = document.getElementById('user-nav');
    if (userNav) userNav.style.display = 'none';

    clearAuthInputs();
    if (typeof showScreen === 'function') showScreen('screen-auth');
}

function restoreAuthSession() {
    const token = getAuthToken();
    const savedUser = localStorage.getItem('edushield_user');
    if (!token || !savedUser) return false;

    try {
        currentUser = JSON.parse(savedUser);
        selectedAuthRole = currentUser.role === 'staff' ? 'staff' : 'student';
        updateLoggedInNav();
        return true;
    } catch (error) {
        console.error('Session restore error:', error);
        logout();
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    selectAuthRole('student');
    if (restoreAuthSession()) {
        if (currentUser.role === 'staff' && typeof openStaffDashboard === 'function') openStaffDashboard();
        else if (typeof goDashboard === 'function') goDashboard();
    }
});
