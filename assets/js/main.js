// EduShield frontend ↔ FastAPI backend integration

const EDU_API_BASE_URL = window.API_BASE_URL || 'https://edushield-7uac.onrender.com';

let activeDisaster = null;
let userScores = {};
let currentQuestionIndex = 0;
let correctAnswersCount = 0;
let selectedAnswers = [];
let backendQuizzes = [];
let activeBackendQuiz = null;

function getAuthToken() {
    return localStorage.getItem('edushield_token');
}

function getBackendDisasterName(localItem) {
    if (!localItem) return '';
    const map = {
        earthquake: 'Earthquake',
        fire: 'Fire',
        flood: 'Flood',
        cyclone: 'Cyclone',
        lightning: 'Lightning',
        chemical: 'Chemical',
        landslide: 'Landslide',
        biological: 'Biological',
        radiological: 'Radiological'
    };
    return map[localItem.id] || localItem.title;
}

function findLocalDisasterByBackendName(name) {
    if (typeof disasterWorldData === 'undefined') return null;
    const target = String(name || '').trim().toLowerCase();
    const all = [
        ...(disasterWorldData.natural || []),
        ...(disasterWorldData.human || [])
    ];
    return all.find(item => {
        const backendName = getBackendDisasterName(item).toLowerCase();
        const title = String(item.title || '').toLowerCase();
        return backendName === target || title === target;
    }) || null;
}

async function fetchBackendQuizzes() {
    try {
        const response = await fetch(`${EDU_API_BASE_URL}/api/quizzes/`);
        const data = await response.json();
        if (!response.ok) {
            console.error('Quiz API error:', data);
            return [];
        }
        backendQuizzes = data.quizzes || [];
        return backendQuizzes;
    } catch (error) {
        console.error('Failed to load quizzes:', error);
        return [];
    }
}

async function fetchStudentResults() {
    const token = getAuthToken();
    if (!token) return [];

    try {
        const response = await fetch(`${EDU_API_BASE_URL}/api/student/results`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Student results API error:', data);
            return [];
        }
        return data.results || [];
    } catch (error) {
        console.error('Failed to load student results:', error);
        return [];
    }
}

// Initialize Dashboard from MongoDB/FastAPI
async function initDashboard() {
    // Render the disaster portal cards immediately from the frontend data.
    // This keeps the Disaster World interface visible even when the backend
    // is temporarily unavailable; backend data is then layered on top.
    renderDashboardCards();

    const token = getAuthToken();

    if (!token) {
        console.warn('No authentication token found.');
        updateOverallScore();
        return;
    }

    try {
        const [dashboardResponse, results, quizzes] = await Promise.all([
            fetch(`${EDU_API_BASE_URL}/api/student/dashboard`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetchStudentResults(),
            fetchBackendQuizzes()
        ]);

        const dashboardData = await dashboardResponse.json();

        if (!dashboardResponse.ok) {
            console.error('Dashboard API error:', dashboardData);
            if (dashboardResponse.status === 401) {
                logout();
            }
            return;
        }

        // Build module scores from backend results.
        // The latest result for a disaster is shown on its portal card.
        userScores = {};
        results.forEach(result => {
            const localItem = findLocalDisasterByBackendName(result.disaster);
            if (localItem && userScores[localItem.id] === undefined) {
                userScores[localItem.id] = Number(result.percentage) || 0;
            }
        });

        renderDashboardCards();

        const scoreEl = document.getElementById('total-score');
        if (scoreEl) {
            scoreEl.innerText = `${Number(dashboardData.preparedness_score) || 0}%`;
        }

        const quizCountEl = document.getElementById('quizzes-completed');
        if (quizCountEl) {
            quizCountEl.innerText = Number(dashboardData.quizzes_completed) || 0;
        }

        const averageScoreEl = document.getElementById('average-score');
        if (averageScoreEl) {
            averageScoreEl.innerText = `${Number(dashboardData.average_score) || 0}%`;
        }

        const levelEl = document.getElementById('preparedness-level');
        if (levelEl) levelEl.innerText = dashboardData.level || 'Beginner';
        const completedEl = document.getElementById('disasters-completed');
        if (completedEl) completedEl.innerText = Number(dashboardData.disasters_completed) || 0;
        const totalModules = (disasterWorldData.natural || []).length + (disasterWorldData.human || []).length;
        const completedModules = Number(dashboardData.disasters_completed) || 0;
        const progress = totalModules ? Math.min(100, Math.round(completedModules / totalModules * 100)) : 0;
        const progressEl = document.getElementById('learning-progress');
        const progressBar = document.getElementById('learning-progress-bar');
        if (progressEl) progressEl.innerText = `${progress}%`;
        if (progressBar) progressBar.style.width = `${progress}%`;
        const label = document.getElementById('dashboard-progress-label');
        if (label) label.innerText = `${completedModules}/${totalModules} modules`;
        const naturalProgress = document.getElementById('natural-progress');
        const humanProgress = document.getElementById('human-progress');
        const naturalCount = (disasterWorldData.natural || []).filter(x => userScores[x.id] !== undefined).length;
        const humanCount = (disasterWorldData.human || []).filter(x => userScores[x.id] !== undefined).length;
        if (naturalProgress) naturalProgress.innerText = `${Math.round(naturalCount / Math.max(1,(disasterWorldData.natural||[]).length) * 100)}%`;
        if (humanProgress) humanProgress.innerText = `${Math.round(humanCount / Math.max(1,(disasterWorldData.human||[]).length) * 100)}%`;
        renderStudentInsights(dashboardData, results);
        loadStudentRankingPreview();

        console.log('Dashboard loaded from backend:', dashboardData);
        console.log('Backend quizzes loaded:', quizzes.length);
        console.log('Backend student results loaded:', results.length);

    } catch (error) {
        // Keep the local disaster cards visible if the backend is offline.
        // The cards remain fully usable for opening the learning modules.
        console.error('Failed to load dashboard from backend; using local disaster cards:', error);
        renderDashboardCards();
        updateOverallScore();
    }
}

function renderDashboardCards() {
    if (typeof disasterWorldData === 'undefined') return;

    const renderCategory = (list, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        list.forEach(item => {
            const card = document.createElement('div');
            card.className = 'portal-card';
            card.onclick = () => launchJourney(item.id);

            const score = userScores[item.id] !== undefined
                ? `${userScores[item.id]}%`
                : 'Not Started';

            const disasterBackgrounds = {
                earthquake: 'assets/images/disasters/earthquake.png',
                flood: 'assets/images/disasters/flood.png',
                cyclone: 'assets/images/disasters/cyclone.png',
                fire: 'assets/images/disasters/fire-accident.png',
                chemical: 'assets/images/disasters/chemical-gas.png',
                radiological: 'assets/images/disasters/radiological.png',
                // Reuse the closest available cinematic scenes for modules
                // that do not yet have a dedicated image in h(1).zip.
                landslide: 'assets/images/disasters/landslide.png',
                biological: 'assets/images/disasters/biological.png'
            };

            const backgroundImage = disasterBackgrounds[item.id];

            card.innerHTML = `
                <div class="portal-card-bg" style="background-image:url('${backgroundImage}')"></div>
                <div class="portal-card-overlay"></div>
                <div class="portal-card-content">
                    <div class="portal-badge" style="color: ${item.color}">${score}</div>
                    <div class="card-icon" style="background: rgba(255,255,255,0.08); color: ${item.color}">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <h3 style="font-size: 1.25rem;">${item.title}</h3>
                    <p style="color: rgba(255,255,255,0.82); font-size: 0.9rem;">${item.desc}</p>
                    <span class="card-learn-more">EXPLORE →</span>
                </div>
            `;

            container.appendChild(card);
        });
    };

    renderCategory(disasterWorldData.natural || [], 'grid-natural');
    renderCategory(disasterWorldData.human || [], 'grid-human');
}

// Return to Dashboard & Reset Background Video
function clearDisasterBackground() {
    document.body.classList.remove(
        'bg-earthquake','bg-fire','bg-flood','bg-cyclone',
        'bg-landslide','bg-biological','bg-radiological','bg-chemical'
    );
}

function setDisasterBackground(id) {
    clearDisasterBackground();
    const key = String(id || '').toLowerCase();
    const supported = ['earthquake','fire','flood','cyclone','landslide','biological','radiological','chemical'];
    const fx = document.getElementById('disaster-fx');
    if (!fx) return;

    if (!supported.includes(key)) {
        fx.innerHTML = '';
        return;
    }

    document.body.classList.add(`bg-${key}`);

    // Build lightweight moving particles in the background. These are DOM
    // elements (not video/canvas-heavy media) so the effect stays fast.
    const configs = {
        earthquake: ['dust','dust','dust','crack','crack'],
        fire: Array(18).fill('ember'),
        flood: Array(8).fill('wave-line'),
        cyclone: Array(7).fill('wind'),
        landslide: Array(16).fill('rock'),
        biological: Array(18).fill('cell'),
        radiological: ['radar','radar','pulse','pulse','pulse'],
        chemical: Array(14).fill('gas')
    };

    fx.innerHTML = (configs[key] || []).map((type, i) =>
        `<span class="fx-${type}" style="--i:${i};" aria-hidden="true"></span>`
    ).join('');
}

function goDashboard() {
    clearDisasterBackground();
    showScreen('screen-dashboard');
    initDashboard();
}

async function launchJourney(id) {
    if (typeof disasterWorldData === 'undefined') return;

    const item =
        (disasterWorldData.natural || []).find(x => x.id === id) ||
        (disasterWorldData.human || []).find(x => x.id === id);

    if (!item) return;

    currentQuestionIndex = 0;
    correctAnswersCount = 0;
    selectedAnswers = [];
    activeDisaster = item;
    setDisasterBackground(item.id);

    // Use the backend quiz question set when one exists. This keeps the
    // submitted answer count exactly synchronized with MongoDB.
    if (backendQuizzes.length === 0) {
        await fetchBackendQuizzes();
    }

    const backendName = getBackendDisasterName(item).toLowerCase();
    activeBackendQuiz = backendQuizzes.find(q => {
        const backendDisaster = String(q.disaster || '').trim().toLowerCase();
        const localTitle = String(item.title || '').trim().toLowerCase();
        const localId = String(item.id || '').trim().toLowerCase();

        return backendDisaster === backendName ||
               backendDisaster === localTitle ||
               backendDisaster === localId ||
               backendDisaster.replace(/\s*\/\s*/g, ' / ') === localTitle;
    }) || null;

    if (activeBackendQuiz && Array.isArray(activeBackendQuiz.questions)) {
        activeDisaster = {
            ...item,
            questions: activeBackendQuiz.questions.map(question => ({
                q: question.question,
                opts: (question.options || []).map(text => ({ text, correct: false }))
            }))
        };
    }

    const journeyTitle = document.getElementById('journey-title');
    if (journeyTitle) journeyTitle.innerText = item.title;

    const learnDesc = document.getElementById('learn-desc');
    const learnHazards = document.getElementById('learn-hazards');
    if (learnDesc) learnDesc.innerText = item.learn || '';
    if (learnHazards) {
        learnHazards.innerHTML = (item.hazards || [])
            .map(h => `<li>${h}</li>`).join('');
    }

    const prepChecklist = document.getElementById('prep-checklist');
    const prepAvoid = document.getElementById('prep-avoid');
    if (prepChecklist) {
        prepChecklist.innerHTML = (item.checklist || [])
            .map(c => `<li><i class="fa-solid fa-check" style="color: var(--accent-green);"></i> ${c}</li>`)
            .join('');
    }
    if (prepAvoid) {
        prepAvoid.innerHTML = (item.avoid || [])
            .map(a => `<li><i class="fa-solid fa-xmark" style="color: var(--accent-red);"></i> ${a}</li>`)
            .join('');
    }

    loadCurrentQuestion();
    switchStage('01');
    showScreen('screen-journey');
}

function loadCurrentQuestion() {
    if (!activeDisaster || !activeDisaster.questions) return;

    const qData = activeDisaster.questions[currentQuestionIndex];
    if (!qData) return;

    const qEl = document.getElementById('sim-question');
    if (qEl) qEl.innerText = qData.q;

    const simOpts = document.getElementById('sim-options');
    if (!simOpts) return;

    simOpts.innerHTML = '';

    (qData.opts || []).forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'sim-btn';
        btn.innerText = opt.text;
        btn.onclick = () => selectSimOption(activeBackendQuiz ? null : opt.correct, index);
        simOpts.appendChild(btn);
    });
}

function switchStage(stageNum) {
    document.querySelectorAll('.stage-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.stage-content').forEach(c => c.classList.remove('active'));

    const activeTab = document.getElementById(`tab-${stageNum}`);
    const activeStage = document.getElementById(`stage-${stageNum}`);

    if (activeTab) activeTab.classList.add('active');
    if (activeStage) activeStage.classList.add('active');

    if (stageNum === '03' && activeDisaster && typeof init3DScene === 'function') {
        if (typeof scene === 'undefined' || !scene) init3DScene();
        if (typeof loadDisaster3DModel === 'function') loadDisaster3DModel(activeDisaster.id);
    } else if (typeof stop3DScene === 'function') {
        stop3DScene();
    }
}

function selectSimOption(isCorrect, selectedIndex) {
    if (!activeDisaster || !activeDisaster.questions) return;

    if (isCorrect === true) correctAnswersCount++;
    selectedAnswers.push(selectedIndex);
    currentQuestionIndex++;

    if (currentQuestionIndex < activeDisaster.questions.length) {
        loadCurrentQuestion();
    } else {
        calculateFinalScore();
        switchStage('04');
    }
}

async function calculateFinalScore() {
    if (!activeDisaster || !activeDisaster.questions?.length) return;

    const totalQ = activeDisaster.questions.length;
    const accuracy = activeBackendQuiz
        ? null
        : Math.round((correctAnswersCount / totalQ) * 100);

    const evalAcc = document.getElementById('eval-acc');
    const evalGrade = document.getElementById('eval-grade');
    const statusEl = document.getElementById('eval-status');

    if (accuracy !== null) {
        if (evalAcc) evalAcc.innerText = `${accuracy}%`;
        if (evalGrade) evalGrade.innerText = `${accuracy} / 100`;

        if (statusEl) {
            statusEl.innerText = accuracy >= 70 ? 'WELL PREPARED' : 'NEEDS REVISION';
            statusEl.style.color = accuracy >= 70
                ? 'var(--accent-green)'
                : 'var(--accent-red)';
        }

        // Show local score immediately while the backend saves the official result.
        userScores[activeDisaster.id] = accuracy;
    } else if (statusEl) {
        statusEl.innerText = 'CALCULATING...';
    }

    const token = getAuthToken();
    if (!token) {
        alert('Your login session is missing. Please log in again.');
        return;
    }

    // IMPORTANT: use backend quiz ID, not the frontend disaster ID.
    const backendDisasterName = getBackendDisasterName(activeDisaster).toLowerCase();
    const quiz = activeBackendQuiz || backendQuizzes.find(q =>
        String(q.disaster || '').toLowerCase() === backendDisasterName
    );

    if (!quiz) {
        console.warn(`No backend quiz exists yet for ${activeDisaster.title}.`);
        alert(`${activeDisaster.title} content is available in the 3D world, but its backend quiz has not been added yet.`);
        return;
    }

    console.log('Submitting quiz to backend:', {
        quizId: quiz.id,
        answers: selectedAnswers
    });

    try {
        const response = await fetch(
            `${EDU_API_BASE_URL}/api/quizzes/${quiz.id}/submit`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ answers: selectedAnswers })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Quiz submission failed:', data);
            if (response.status === 401) {
                alert('Your session expired. Please log in again.');
                logout();
                return;
            }
            alert(data.detail || 'Quiz submission failed.');
            return;
        }

        console.log('Quiz submitted successfully:', data);

        if (typeof data.percentage === 'number') {
            userScores[activeDisaster.id] = data.percentage;
            if (evalAcc) evalAcc.innerText = `${data.percentage}%`;
            if (evalGrade) evalGrade.innerText = `${data.percentage} / 100`;
        }

        if (data.feedback && statusEl) {
            statusEl.innerText = data.feedback;
        }

        console.log('Quiz saved to MongoDB successfully.');

        // Refresh MongoDB-backed dashboard data so completion, averages,
        // badges and module progress are immediately reflected.
        await initDashboard();

    } catch (error) {
        console.error('Cannot connect to EduShield server:', error);
        alert(
            'Cannot connect to the EduShield server.\n\n' +
            'Check that FastAPI is running at https://edushield-7uac.onrender.com and that the frontend is opened through a local web server (not file://).'
        );
    }
}

async function openEmergencyKit() {
    showScreen('screen-emergency-kit');
    await renderEmergencyKit();
}

const DEFAULT_KIT_ITEMS = ['Drinking water','First-aid kit','Flashlight','Whistle','Power bank / batteries','Essential medicines','Emergency contact card','Important documents','Non-perishable snacks','Face mask','Small radio','Hand sanitizer'];

async function renderEmergencyKit() {
    const grid = document.getElementById('kit-check-grid');
    if (!grid) return;
    let items = DEFAULT_KIT_ITEMS;
    let saved = {};
    const token = getAuthToken();

    try {
        if (token) {
            const response = await fetch(`${EDU_API_BASE_URL}/api/student/emergency-kit`, {
                headers: {'Authorization': `Bearer ${token}`}
            });
            if (response.ok) {
                const data = await response.json();
                items = data.items || items;
                saved = data.checked || {};
            } else {
                saved = JSON.parse(localStorage.getItem('edushield_kit') || '{}');
            }
        } else {
            saved = JSON.parse(localStorage.getItem('edushield_kit') || '{}');
        }
    } catch (error) {
        saved = JSON.parse(localStorage.getItem('edushield_kit') || '{}');
    }

    grid.innerHTML = items.map((item, i) =>
        `<label class="kit-check-item"><input type="checkbox" data-kit-index="${i}" ${saved[i] ? 'checked' : ''}><span>${escapeStaffText(item)}</span></label>`
    ).join('');

    grid.querySelectorAll('input').forEach(input => input.addEventListener('change', async () => {
        const state = {};
        grid.querySelectorAll('input').forEach(box => { state[box.dataset.kitIndex] = box.checked; });
        localStorage.setItem('edushield_kit', JSON.stringify(state));
        await saveEmergencyKitToBackend(state);
        updateKitScore(items.length);
    }));
    updateKitScore(items.length);
}

async function saveEmergencyKitToBackend(state) {
    const token = getAuthToken();
    if (!token) return;
    try {
        await fetch(`${EDU_API_BASE_URL}/api/student/emergency-kit`, {
            method: 'PUT',
            headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
            body: JSON.stringify({checked: state})
        });
    } catch (error) {
        console.warn('Emergency kit save unavailable:', error);
    }
}

function updateKitScore(total) {
    const state = JSON.parse(localStorage.getItem('edushield_kit') || '{}');
    const done = Object.values(state).filter(Boolean).length;
    const el = document.getElementById('kit-score');
    if (el) el.innerText = `${total ? Math.round(done / total * 100) : 0}%`;
}

async function loadStudentDrills() {
    const box = document.getElementById('student-drills');
    if (!box) return;
    box.innerHTML = '<span class="empty-insight">Loading drills...</span>';
    const token = getAuthToken();
    try {
        const response = await fetch(`${EDU_API_BASE_URL}/api/student/drills`, {
            headers: token ? {'Authorization': `Bearer ${token}`} : {}
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Unable to load drills');
        const drills = data.drills || [];
        box.innerHTML = drills.length ? drills.map(drill =>
            `<div class="drill-item"><div class="drill-date"><b>${escapeStaffText(drill.date)}</b><small>${escapeStaffText(drill.type)}</small></div><div class="drill-main"><b>${escapeStaffText(drill.title)}</b><small>School preparedness activity</small></div><span class="drill-status">${escapeStaffText(drill.status)}</span></div>`
        ).join('') : '<span class="empty-insight">No drills scheduled.</span>';
    } catch (error) {
        console.warn('Drills unavailable:', error);
        box.innerHTML = '<span class="empty-insight">Drills are temporarily unavailable.</span>';
    }
}

async function openStudentRankings() {
    showScreen('screen-student-rankings');
    const token = getAuthToken();
    const list = document.getElementById('student-full-ranking');
    if (!token) return;
    if (list) list.innerHTML = '<p class="staff-muted">Loading leaderboard...</p>';
    try {
        const response = await fetch(`${EDU_API_BASE_URL}/api/student/ranking`, {headers:{'Authorization':`Bearer ${token}`}});
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Unable to load ranking');
        const points = document.getElementById('student-points');
        const message = document.getElementById('student-ranking-message');
        if (points) points.innerText = Number(data.points)||0;
        if (message) message.innerText = data.rank ? `You are #${data.rank} of ${data.total_students} students · ${data.percentile}th percentile.` : 'Complete a quiz to enter the leaderboard.';
        if (list) list.innerHTML = (data.leaderboard||[]).map((student,index)=>{
            const me = String(student.id) === String(currentUser?.id);
            return `<div class="student-full-rank ${me?'is-me':''}"><span class="rank-num">${index<3?['🥇','🥈','🥉'][index]:'#'+student.rank}</span><div><b>${escapeStaffText(student.name||'Student')}${me?' · YOU':''}</b><small>${Number(student.quizzes_completed)||0} quizzes · ${Number(student.average_score)||0}% average</small></div><span class="rank-points">${Number(student.points)||0} pts</span></div>`;
        }).join('') || '<p class="staff-muted">No students found.</p>';
    } catch (error) {
        console.error('Ranking error:', error);
        if (list) list.innerHTML = '<p class="staff-muted">Unable to load leaderboard. Check the backend connection.</p>';
    }
}

function renderStudentInsights(dashboardData, results) {
    const badges = dashboardData?.badges || [];
    const badgeBox = document.getElementById('student-achievements');
    if (badgeBox) {
        badgeBox.innerHTML = badges.length ? badges.slice(0,5).map((badge,index)=>`<div class="achievement-item"><div><span class="badge-icon">${['🛡️','🔥','🌊','🌍','🏆'][index%5]}</span><div><b>${escapeStaffText(badge.name)}</b><small>${escapeStaffText(badge.description||'Achievement unlocked.')}</small></div></div><span>✓</span></div>`).join('') : '<span class="empty-insight">Complete a quiz to unlock your first badge.</span>';
    }
    const recentBox = document.getElementById('student-recent-results');
    if (recentBox) {
        recentBox.innerHTML = results.length ? results.slice(0,5).map(result=>`<div class="recent-result-item"><div><b>${escapeStaffText(result.quiz_title||'Quiz')}</b><small>${escapeStaffText(result.disaster||'')} · ${result.completed_at?new Date(result.completed_at).toLocaleDateString():''}</small></div><span class="result-score">${Number(result.percentage)||0}%</span></div>`).join('') : '<span class="empty-insight">No quiz results yet.</span>';
    }
    const map = document.getElementById('student-preparedness-map');
    if (map && typeof disasterWorldData !== 'undefined') {
        const all = [...(disasterWorldData.natural||[]), ...(disasterWorldData.human||[])];
        map.innerHTML = all.map(item=>{
            const score = userScores[item.id] !== undefined ? Number(userScores[item.id]) : 0;
            const label = userScores[item.id] !== undefined ? `${score}%` : 'Not started';
            return `<div class="preparedness-module"><div class="preparedness-module-top"><b>${escapeStaffText(item.title)}</b><span>${label}</span></div><small>${score>=80?'Strong readiness':score>=60?'Good — keep improving':userScores[item.id]!==undefined?'Needs practice':'Start module'}</small><div class="module-track"><i style="width:${Math.max(0,Math.min(100,score))}%"></i></div></div>`;
        }).join('');
    }
}

async function loadStudentRankingPreview() {
    const token = getAuthToken();
    if (!token) return;
    try {
        const response = await fetch(`${EDU_API_BASE_URL}/api/student/ranking`, {headers:{'Authorization':`Bearer ${token}`}});
        if (!response.ok) return;
        const data = await response.json();
        const rank = document.getElementById('student-rank-value');
        const points = document.getElementById('student-rank-points');
        const percentile = document.getElementById('student-percentile');
        if (rank) rank.innerText = data.rank ? `#${data.rank}` : '—';
        if (points) points.innerText = Number(data.points)||0;
        if (percentile) percentile.innerText = data.rank ? `${Number(data.percentile)||0}%` : '—';
    } catch (e) { console.warn('Ranking preview unavailable:', e); }
}

function finishJourney() {
    goDashboard();
}

function updateOverallScore() {
    const scoreEl = document.getElementById('total-score');
    if (!scoreEl) return;

    const keys = Object.keys(userScores);
    if (keys.length === 0) {
        scoreEl.innerText = '0%';
        return;
    }

    const total = keys.reduce((acc, k) => acc + (Number(userScores[k]) || 0), 0);
    const avg = Math.round(total / keys.length);
    scoreEl.innerText = `${avg}%`;
}

// Staff console remains frontend-local because the current backend has no staff-management API.
// --------------------------------
// STAFF DASHBOARD - BACKEND
// --------------------------------

async function openStaffDashboard() {
    showScreen('screen-staff-dashboard');
    const tableBody = document.getElementById('staff-student-table');
    const token = getAuthToken();
    if (!tableBody || !token) { alert('Your login session is missing. Please log in again.'); return; }
    tableBody.innerHTML = '<tr><td colspan="8" style="padding:2rem;text-align:center;color:var(--text-sub);">Loading student data...</td></tr>';
    try {
        const response = await fetch(`${EDU_API_BASE_URL}/api/staff/dashboard`, {headers:{'Authorization':`Bearer ${token}`}});
        const data = await response.json();
        if (!response.ok) { if(response.status===401){logout();return;} alert(data.detail||'Failed to load staff dashboard.'); return; }

        const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.innerText=value;};
        setText('stat-total-students', data.total_students||0);
        setText('stat-active-students', data.active_students||0);
        setText('stat-total-completed', data.total_completed_quizzes||0);
        setText('stat-avg-score', `${Number(data.average_score)||0}%`);
        setText('stat-high-performers', data.high_performers||0);
        setText('stat-needs-training', data.needs_training||0);
        setText('stat-readiness-level', data.readiness||'NO DATA');
        const readiness=document.getElementById('stat-readiness-level');
        if(readiness) readiness.style.color=data.readiness==='HIGH READINESS'?'var(--accent-green)':data.readiness==='CRITICAL RISK'?'var(--accent-red)':'var(--accent-orange)';

        const students=data.students||[];
        tableBody.innerHTML=students.length?students.map(student=>{
            const status=student.status||'Unrated';
            const cls=status==='Excellent'?'status-excellent':status==='Pass'?'status-pass':status==='Needs Training'?'status-training':'status-unrated';
            return `<tr class="student-row" data-status="${status}">
                <td><b>#${student.rank||'-'}</b></td>
                <td><div class="student-cell"><b>${escapeStaffText(student.name||'Student')}</b><small>${escapeStaffText(student.email||'')}</small></div></td>
                <td>${Number(student.quizzes_completed)||0}</td><td>${Number(student.disasters_completed)||0}</td>
                <td><b>${Number(student.average_score)||0}%</b></td><td><span class="status-pill ${cls}">${status}</span></td>
                <td><b>${Number(student.points)||0}</b></td>
                <td><div class="staff-action"><button class="btn-outline" onclick="viewStudentDetails('${student.id}')">View</button><button class="btn-outline" onclick="resetStudentScore('${student.id}','${escapeStaffAttr(student.name||'Student')}')">Reset</button></div></td>
            </tr>`;
        }).join(''):'<tr><td colspan="8" style="padding:2rem;text-align:center;color:var(--text-sub);">No registered students found.</td></tr>';

        const rankings=data.rankings||[];
        document.getElementById('staff-rankings').innerHTML=rankings.length?rankings.map((student,index)=>`<div class="ranking-item"><span class="rank-badge">${index<3?['🥇','🥈','🥉'][index]:'#'+(index+1)}</span><div><div class="rank-name">${escapeStaffText(student.name||'Student')}</div><div class="rank-meta">${Number(student.average_score)||0}% average · ${Number(student.quizzes_completed)||0} quizzes</div></div><div class="rank-score">${Number(student.points)||0}<span class="rank-points">points</span></div></div>`).join(''):'<p class="staff-muted">No quiz results yet.</p>';

        const breakdown=data.disaster_breakdown||[];
        document.getElementById('staff-disaster-breakdown').innerHTML=breakdown.length?breakdown.map(item=>{const pct=Math.max(0,Math.min(100,Number(item.average_score)||0));return `<div class="disaster-bar-row"><div class="disaster-bar-top"><span>${escapeStaffText(item.disaster)}</span><b>${pct}%</b></div><div class="disaster-bar-track"><i class="disaster-bar-fill" style="width:${pct}%"></i></div><div class="disaster-bar-meta">${Number(item.completed)||0} completion(s)</div></div>`}).join(''):'<p class="staff-muted">No completed quizzes yet.</p>';
        filterStudentRoster();
    } catch(error) { console.error(error); tableBody.innerHTML='<tr><td colspan="8" style="padding:2rem;text-align:center;color:var(--accent-red);">Cannot connect to the EduShield server.</td></tr>'; }
}

function escapeStaffText(value){const d=document.createElement('div');d.textContent=String(value??'');return d.innerHTML;}
function escapeStaffAttr(value){return String(value??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');}

function filterStudentRoster(){
    const q=(document.getElementById('staff-search-input')?.value||'').trim().toLowerCase();
    const status=(document.getElementById('staff-status-filter')?.value||'all');
    document.querySelectorAll('.student-row').forEach(row=>{
        const matchesText=row.innerText.toLowerCase().includes(q);
        const matchesStatus=status==='all'||row.dataset.status===status;
        row.style.display=matchesText&&matchesStatus?'':'none';
    });
}

async function viewStudentDetails(studentId){
    const modal=document.getElementById('staff-student-modal'); const box=document.getElementById('staff-student-details'); const token=getAuthToken();
    if(!modal||!box||!token)return;
    modal.classList.add('show'); modal.setAttribute('aria-hidden','false'); box.innerHTML='<p class="staff-muted">Loading student performance...</p>';
    try{
        const response=await fetch(`${EDU_API_BASE_URL}/api/staff/students/${studentId}`,{headers:{'Authorization':`Bearer ${token}`}});
        const data=await response.json(); if(!response.ok){box.innerHTML=`<p class="staff-muted">${escapeStaffText(data.detail||'Unable to load student.')}</p>`;return;}
        const s=data.student||{}; const results=data.results||[];
        box.innerHTML=`<div class="detail-header"><span class="section-kicker">STUDENT PROFILE</span><h2>${escapeStaffText(s.name||'Student')}</h2><p>${escapeStaffText(s.email||'')} · ${escapeStaffText(s.status||'Unrated')}</p></div>
        <div class="detail-stat-grid"><div class="detail-stat"><small>Preparedness</small><b>${Number(data.preparedness_score)||0}%</b></div><div class="detail-stat"><small>Average Score</small><b>${Number(data.average_score)||0}%</b></div><div class="detail-stat"><small>Quizzes</small><b>${Number(data.quizzes_completed)||0}</b></div><div class="detail-stat"><small>Points</small><b>${Number(data.points)||0}</b></div></div>
        <h3 style="margin:1rem 0 .7rem">Quiz History</h3><div class="detail-results">${results.length?results.map(r=>`<div class="detail-result"><div><b>${escapeStaffText(r.quiz_title||'Quiz')}</b><small>${escapeStaffText(r.disaster||'')} · ${r.completed_at?new Date(r.completed_at).toLocaleString():''}</small></div><div class="detail-result-score">${Number(r.percentage)||0}%</div></div>`).join(''):'<p class="staff-muted">No quizzes completed yet.</p>'}</div>`;
    }catch(e){console.error(e);box.innerHTML='<p class="staff-muted">Cannot connect to the EduShield server.</p>';}
}
function closeStudentDetails(){const m=document.getElementById('staff-student-modal');if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true');}}

// --------------------------------
// RESET STUDENT RESULTS - BACKEND
// --------------------------------

async function resetStudentScore(studentId, studentName) {

    const confirmed = confirm(
        `Are you sure you want to reset all quiz scores for ${studentName}?`
    );

    if (!confirmed) return;

    const token = getAuthToken();

    if (!token) {
        alert('Your login session is missing. Please log in again.');
        return;
    }

    try {

        const response = await fetch(
            `${EDU_API_BASE_URL}/api/staff/students/${studentId}/results`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        console.log('Reset student response:', data);

        if (!response.ok) {

            if (response.status === 401) {
                alert('Your session has expired. Please log in again.');
                logout();
                return;
            }

            if (response.status === 403) {
                alert('Staff access required.');
                return;
            }

            alert(
                data.detail ||
                'Failed to reset student quiz results.'
            );

            return;
        }

        alert(
            `${studentName}'s quiz results have been reset successfully.`
        );

        // Reload Staff dashboard from MongoDB
        await openStaffDashboard();

    } catch (error) {

        console.error(
            'Failed to reset student results:',
            error
        );

        alert(
            'Cannot connect to the EduShield server.'
        );
    }
}


function submitSurvey(e) {
    if (e && e.preventDefault) e.preventDefault();
    alert('Safety Audit Submitted Successfully!');
    goDashboard();
}

// Phase 6: load preparedness events when dashboard is opened.
