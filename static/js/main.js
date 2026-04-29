const questions = [
    "1. Does your organisation maintain a formal register of all AI systems whether built in-house or procured, including their purpose, data inputs, risk level, and lifecycle stage?",
    "2. Has your organisation assigned clear ownership and accountability for AI governance, with named individuals responsible for overseeing both developed and deployed AI systems?",
    "3. Does your organisation have a formally approved AI policy that sets out its principles, values, and commitments for responsible AI covering both how you build and how you use AI systems?",
    "4. Have you conducted structured risk and impact assessments for your AI systems whether developed or procured that evaluate risks to fairness, bias, privacy, safety, and affected individuals including vulnerable groups?",
    "5. Does your organisation have a documented AI competency or training programme ensuring that staff including developers, procurement teams, and end users understand their responsibilities for responsible AI use?",
    "6. Do you have documentation covering how your AI systems are designed, trained, or configured; how decisions are made; and how data is sourced, governed, and validated whether for systems you build or procure?",
    "7. Have you defined where human oversight is required in your AI workflows, and do you assess and manage AI-related risks from third-party suppliers, vendors, or AI platforms you rely on?",
    "8. Has your organisation identified all applicable legal, regulatory, and contractual obligations relevant to your AI systems whether you build or buy and documented how you comply with them?",
    "9. If an AI system you developed or deployed failed, caused harm, or produced biased outputs, do you have a documented incident response and corrective action process, and are lessons fed back into governance?",
    "10. Are your AI governance practices regularly reviewed against measurable objectives, and are your board or senior leadership kept informed of AI risks, performance, and compliance with a clear plan to improve?"
];

const assuranceTiers = [
    { id: 'comprehensive', name: 'Comprehensive AI Assurance', description: "An end-to-end review of your AI systems, covering technical, ethical, and compliance perspectives. We assess model design, data inputs, outcomes, documentation, and governance to ensure accountability across the lifecycle." },
    { id: 'enterprise', name: 'Enterprise AI Portfolio Review', description: "A strategic assessment of your organization's entire AI ecosystem. We evaluate how each AI initiative aligns with your business goals, ethics, and regulatory expectations, ensuring consistency and trust across all deployments." },
    { id: 'due-diligence', name: 'Pre-Investment AI Due Diligence', description: "For VCs/PEs evaluating AI start-ups. We provide expert evaluation of AI products, data quality, and governance maturity to support informed investment decisions." },
    { id: 'regulatory', name: 'Regulatory Readiness Assessment', description: "We benchmark your AI operations against emerging AI governance and compliance standards (such as ISO/IEC 42001, EU AI Act, and OECD AI Principles)." },
    { id: 'framework', name: 'Responsible AI Framework Implementation', description: "We help organizations design and deploy AI frameworks that embed fairness, accountability, and transparency into their AI development and use." },
    { id: 'training', name: 'AI Training & Capacity Building', description: "We empower your teams with the knowledge and skills to manage AI responsibly through tailored workshops, training sessions, and certification programs." }
];

let currentUser = null;
let latestScore = null;

function getRecommendedTierIds(score) {
    if (score === null || score === undefined) return null;
    if (score >= 8) return ['enterprise', 'comprehensive'];
    if (score >= 5) return ['framework', 'regulatory'];
    if (score >= 3) return ['training', 'framework'];
    return ['comprehensive', 'framework'];
}

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    renderQuestions();

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);

    const healthCheckForm = document.getElementById('health-check-form');
    if (healthCheckForm) healthCheckForm.addEventListener('submit', handleHealthCheckSubmit);

    const assuranceRequestForm = document.getElementById('assurance-request-form');
    if (assuranceRequestForm) assuranceRequestForm.addEventListener('submit', handleAssuranceRequest);

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.pw-toggle');
        if (!btn) return;
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '🙈';
            btn.classList.add('active');
            btn.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            btn.textContent = '👁';
            btn.classList.remove('active');
            btn.setAttribute('aria-label', 'Show password');
        }
    });

    showLogin();
});

// =========================
// AUTH TABS
// =========================
function setActiveTab(activeId) {
    ['tab-login', 'tab-register', 'tab-forgot'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    const active = document.getElementById(activeId);
    if (active) active.classList.add('active');
}

function hideAllAuthForms() {
    ['login-form', 'register-form', 'forgot-form'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function showLogin() {
    hideAllAuthForms();
    document.getElementById('login-form').classList.remove('hidden');
    setActiveTab('tab-login');
}

function showRegister() {
    hideAllAuthForms();
    document.getElementById('register-form').classList.remove('hidden');
    setActiveTab('tab-register');
}

function showForgot() {
    hideAllAuthForms();
    document.getElementById('forgot-form').classList.remove('hidden');
    setActiveTab('tab-forgot');
}

// =========================
// SESSION
// =========================
function checkLoginStatus() {
    const userData = sessionStorage.getItem('user');
    if (userData) {
        currentUser = JSON.parse(userData);
        showApp();
    } else {
        showLoginModal();
    }
}

function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('main-content').classList.add('hidden');
}

function showApp() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    resetHealthCheck();
    resetReports();
    showPage('health-check');
    loadReports();
}

function resetHealthCheck() {
    document.getElementById('results-container').classList.add('hidden');
    document.getElementById('health-check-container').classList.remove('hidden');
    const form = document.getElementById('health-check-form');
    if (form) form.reset();
    document.querySelectorAll('#health-check-form input[type="radio"]').forEach(r => { r.checked = false; });
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Assessment';
    }
}

function resetReports() {
    const noReports = document.getElementById('no-reports');
    const reportsList = document.getElementById('reports-list');
    if (noReports) noReports.classList.remove('hidden');
    if (reportsList) {
        reportsList.classList.add('hidden');
        reportsList.innerHTML = '';
    }
}

// =========================
// LOGIN / REGISTER / FORGOT
// =========================
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
            currentUser = {
                id: data.user_id,
                name: data.user_name,
                email: data.user_email,
                organization: data.user_organization
            };
            sessionStorage.setItem('user', JSON.stringify(currentUser));
            showApp();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred while logging in. Please try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const organization = document.getElementById('register-organization').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, organization, password })
        });
        const data = await response.json();

        if (response.ok) {
            alert('Account created successfully! Please log in.');
            showLogin();
            document.getElementById('register-form').reset();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred during registration.');
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const name = document.getElementById('forgot-name').value;
    const email = document.getElementById('forgot-email').value;
    const password = document.getElementById('forgot-password').value;

    try {
        const res = await fetch('/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            alert('Password reset successfully. Please log in.');
            showLogin();
            document.getElementById('forgot-form').reset();
        } else {
            alert(data.error || 'Reset failed');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred while resetting password.');
    }
}

async function logout() {
    try {
        await fetch('/logout', { method: 'POST' });
    } catch (err) {
        console.error(err);
    }
    sessionStorage.removeItem('user');
    currentUser = null;
    latestScore = null;
    showLoginModal();
    document.getElementById('login-form').reset();
}

// =========================
// PAGE NAVIGATION
// =========================
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => section.classList.add('hidden'));
    document.querySelectorAll('.nav-link:not(.locked)').forEach(link => link.classList.remove('active'));

    const pageMap = {
        'dashboard': 'dashboard-page',
        'health-check': 'health-check-page',
        'governance': 'governance-page',
        'reports': 'reports-page'
    };
    const pageElement = document.getElementById(pageMap[pageId]);
    if (pageElement) {
        pageElement.classList.remove('hidden');
        document.querySelectorAll('.nav-link').forEach(link => {
            const t = link.textContent.trim();
            if ((pageId === 'dashboard' && t === 'Dashboard') ||
                (pageId === 'health-check' && t === 'AI Health Check') ||
                (pageId === 'governance' && t === 'Governance Framework') ||
                (pageId === 'reports' && t === 'Reports')) {
                link.classList.add('active');
            }
        });
    }
}

// =========================
// HEALTH CHECK
// =========================
function renderQuestions() {
    const container = document.getElementById('questions-container');
    if (!container) return;
    questions.forEach((qText, index) => {
        const questionId = `q${index}`;
        const card = document.createElement('div');
        card.className = 'question-card';
        card.innerHTML = `
            <div class="question-text">${qText}</div>
            <div class="options-group">
                <label class="radio-option"><input type="radio" name="${questionId}" value="Yes" required> Yes</label>
                <label class="radio-option"><input type="radio" name="${questionId}" value="Not Sure"> Not Sure</label>
                <label class="radio-option"><input type="radio" name="${questionId}" value="No"> No</label>
            </div>`;
        container.appendChild(card);
    });
}

async function handleHealthCheckSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    const answers = [];
    for (let i = 0; i < questions.length; i++) {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        if (selected) answers.push(selected.value);
    }

    try {
        const response = await fetch('/submit-health-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers })
        });
        if (!response.ok) throw new Error('Failed to submit assessment');

        const data = await response.json();
        displayResults(data);
        loadReports();
    } catch (err) {
        console.error(err);
        alert('An error occurred while processing your assessment. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Assessment';
    }
}

function displayResults(data) {
    latestScore = data.score;
    document.getElementById('health-check-container').classList.add('hidden');
    document.getElementById('results-container').classList.remove('hidden');
    document.getElementById('score-value').textContent = `${data.score} / 10`;
    document.getElementById('result-text').textContent = data.message;

    const stepsList = document.getElementById('next-steps-list');
    stepsList.innerHTML = '';
    data.next_step.split('\n').forEach(step => {
        if (step.trim()) {
            const li = document.createElement('li');
            li.textContent = step;
            stepsList.appendChild(li);
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadReports() {
    try {
        const response = await fetch('/get-latest-results');
        if (response.ok) {
            const data = await response.json();
            displayReports(data);
        }
    } catch (err) {
        console.error('Error loading reports:', err);
    }
}

function displayReports(data) {
    const noReports = document.getElementById('no-reports');
    const reportsList = document.getElementById('reports-list');
    if (data && data.score !== undefined) {
        latestScore = data.score;
        noReports.classList.add('hidden');
        reportsList.classList.remove('hidden');
        reportsList.innerHTML = `
            <div class="report-card">
                <div class="report-header">
                    <h3>Latest Assessment Report</h3>
                    <span class="report-date">${new Date(data.date_submitted).toLocaleDateString()}</span>
                </div>
                <div class="report-score">
                    <span class="score-label">Your Score:</span>
                    <span class="score-value">${data.score} / 10</span>
                </div>
                <div class="report-message">
                    <p>${data.message}</p>
                </div>
                <div class="report-recommendations">
                    <h4>Recommended Next Steps</h4>
                    <ul>
                        ${data.next_step.split('\n').map(s => s.trim() ? `<li>${s}</li>` : '').join('')}
                    </ul>
                </div>
            </div>`;
    }
}

// =========================
// ASSURANCE
// =========================
function showAssuranceTiers() {
    showAllServices();
}

function showAllServices() {
    document.getElementById('assurance-modal-title').textContent = 'AI Services';
    document.getElementById('assurance-modal-subtitle').textContent =
        "Browse all our services and request the one that fits your organization's needs.";
    renderAssuranceTiers(assuranceTiers);
    document.getElementById('assurance-modal').classList.remove('hidden');
}

async function showRecommendedServices() {
    if (latestScore === null || latestScore === undefined) {
        try {
            const response = await fetch('/get-latest-results');
            if (response.ok) {
                const data = await response.json();
                if (data && data.score !== undefined) latestScore = data.score;
            }
        } catch (err) {
            console.error('Error fetching latest score:', err);
        }
    }

    const recommendedIds = getRecommendedTierIds(latestScore);

    if (!recommendedIds) {
        document.getElementById('assurance-modal-title').textContent = 'Take the Health Check First';
        document.getElementById('assurance-modal-subtitle').textContent =
            'Complete the AI Health Check so we can recommend the service best suited to your organization. Meanwhile, here are all our services:';
        renderAssuranceTiers(assuranceTiers);
    } else {
        const recommended = assuranceTiers.filter(t => recommendedIds.includes(t.id));
        document.getElementById('assurance-modal-title').textContent = 'Recommended for You';
        document.getElementById('assurance-modal-subtitle').textContent =
            `Based on your score of ${latestScore}/10, we recommend the following service${recommended.length > 1 ? 's' : ''}.`;
        renderAssuranceTiers(recommended);
    }

    document.getElementById('assurance-modal').classList.remove('hidden');
}

function hideAssuranceTiers() {
    document.getElementById('assurance-modal').classList.add('hidden');
}

function renderAssuranceTiers(tiers) {
    const container = document.getElementById('tiers-container');
    container.innerHTML = '';
    (tiers || assuranceTiers).forEach(tier => {
        const card = document.createElement('div');
        card.className = 'tier-card';
        card.innerHTML = `
            <h3>${tier.name}</h3>
            <p>${tier.description}</p>
            <button class="btn-primary" onclick="selectAssuranceTier('${tier.id}', '${tier.name.replace(/'/g, "\\'")}')">Select Service</button>`;
        container.appendChild(card);
    });
}

function selectAssuranceTier(tierId, tierName) {
    const tier = assuranceTiers.find(t => t.id === tierId);
    document.getElementById('assurance-service-title').textContent = tier.name;
    document.getElementById('assurance-service-description').textContent = tier.description;
    document.getElementById('selected-service').textContent = tier.name;
    const form = document.getElementById('assurance-request-form');
    form.dataset.serviceId = tierId;
    form.dataset.serviceName = tierName;
    document.getElementById('assurance-email').value = currentUser ? currentUser.email : '';
    document.getElementById('assurance-org').value = currentUser ? currentUser.organization : '';
    hideAssuranceTiers();
    document.getElementById('assurance-request-modal').classList.remove('hidden');
}

function hideAssuranceRequest() {
    document.getElementById('assurance-request-modal').classList.add('hidden');
    document.getElementById('assurance-request-form').classList.remove('hidden');
    document.getElementById('assurance-success').classList.add('hidden');
}

async function handleAssuranceRequest(e) {
    e.preventDefault();
    const form = document.getElementById('assurance-request-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn ? submitBtn.textContent : '';
    const serviceType = form.dataset.serviceName;
    const email = document.getElementById('assurance-email').value;
    const organization = document.getElementById('assurance-org').value;

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
    }

    try {
        const response = await fetch('/request-assurance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ service_type: serviceType, email, organization })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');

        // Show the success message immediately — don't make the user wait
        // for the third-party email send.
        document.getElementById('assurance-request-form').classList.add('hidden');
        document.getElementById('assurance-success').classList.remove('hidden');
        setTimeout(hideAssuranceRequest, 3000);

        // Fire EmailJS in the background; failures are logged silently.
        if (window.emailjs && window.EMAILJS_SERVICE_ID && window.EMAILJS_TEMPLATE_ID) {
            emailjs.send(window.EMAILJS_SERVICE_ID, window.EMAILJS_TEMPLATE_ID, {
                from_name: currentUser ? currentUser.name : 'Unknown',
                from_email: email,
                organization,
                service_type: serviceType,
                reply_to: email,
                message: `New AI Assurance service request received.\n\nService: ${serviceType}\nName: ${currentUser ? currentUser.name : 'Unknown'}\nEmail: ${email}\nOrganization: ${organization}\nDate: ${new Date().toLocaleString()}`
            }).catch(emailErr => console.warn('Email notification failed:', emailErr));
        }
    } catch (err) {
        console.error(err);
        alert(err.message || 'An error occurred while submitting your request.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel || 'Request This Service';
        }
    }
}

// =========================
// UPGRADE MODAL
// =========================
function showUpgradeModal() {
    document.getElementById('upgrade-modal').classList.remove('hidden');
}

function hideUpgradeModal() {
    document.getElementById('upgrade-modal').classList.add('hidden');
}

window.onclick = function(event) {
    ['assurance-modal', 'assurance-request-modal', 'upgrade-modal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) modal.classList.add('hidden');
    });
};
