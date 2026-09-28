// assets/js/navigation.js

// Function to switch visible screen sections
function showScreen(screenId) {
    // Hide all view screens
    document.querySelectorAll('.view-screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }

    // Always keep the Staff Portal button visible if logged in as Staff
    updateStaffNavVisibility();
}

// Navigate to Main Student Dashboard
function goDashboard() {
    showScreen('screen-dashboard');
    if (typeof initDashboard === 'function') {
        initDashboard();
    }
    if (typeof loadStudentDrills === 'function') {
        loadStudentDrills();
    }
}

// Navigate to Staff Management Console
function openStaffDashboard() {
    showScreen('screen-staff-dashboard');
    if (typeof renderStaffDashboard === 'function') {
        renderStaffDashboard();
    } else if (typeof openStaffDashboardData === 'function') {
        openStaffDashboardData();
    }
}

// Navigate to Campus Safety Audit Survey
function openSurvey() {
    showScreen('screen-survey');
}

// Navigate to Emergency Helplines
function openHelplines() {
    showScreen('screen-helplines');
}

// Helper to keep Staff Portal button visible for Staff users across all views
function updateStaffNavVisibility() {
    const staffBtn = document.getElementById('staff-nav-btn');
    if (staffBtn) {
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'staff') {
            staffBtn.style.display = 'inline-block';
        } else {
            staffBtn.style.display = 'none';
        }
    }
}