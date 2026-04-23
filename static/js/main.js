const questions = [
    "1. Does your organisation maintain a formal register of all AI systems  whether built in-house or procured , including their purpose, data inputs, risk level, and lifecycle stage?",
    "2. Has your organisation assigned clear ownership and accountability for AI governance, with named individuals responsible for overseeing both developed and deployed AI systems?",
    "3. Does your organisation have a formally approved AI policy that sets out its principles, values, and commitments for responsible AI  covering both how you build and how you use AI systems?",
    "4. Have you conducted structured risk and impact assessments for your AI systems whether developed or procured  that evaluate risks to fairness, bias, privacy, safety, and affected individuals including vulnerable groups?",
    "5. Does your organisation have a documented AI competency or training programme ensuring that staff  including developers, procurement teams, and end users  understand their responsibilities for responsible AI use?",
    "6. Do you have documentation covering how your AI systems are designed, trained, or configured; how decisions are made; and how data is sourced, governed, and validated  whether for systems you build or procure?",
    "7. Have you defined where human oversight is required in your AI workflows, and do you assess and manage AI-related risks from third-party suppliers, vendors, or AI platforms you rely on?",
    "8. Has your organisation identified all applicable legal, regulatory, and contractual obligations relevant to your AI systems  whether you build or buy  and documented how you comply with them?",
    "9. If an AI system you developed or deployed failed, caused harm, or produced biased outputs, do you have a documented incident response and corrective action process, and are lessons fed back into governance?",
    "10. Are your AI governance practices regularly reviewed against measurable objectives, and are your board or senior leadership kept informed of AI risks, performance, and compliance  with a clear plan to improve?"
];

const assuranceTiers = [
    {
        id: 'comprehensive',
        name: 'Comprehensive AI Assurance',
        description: 'End-to-end AI system review across ethics, risk, and compliance.'
    },
    {
        id: 'enterprise',
        name: 'Enterprise AI Portfolio Review',
        description: 'Assessment of all AI systems across your organisation.'
    },
    {
        id: 'due-diligence',
        name: 'Pre-Investment AI Due Diligence',
        description: 'Evaluation of AI startups and products for investors.'
    },
    {
        id: 'regulatory',
        name: 'Regulatory Readiness Assessment',
        description: 'Benchmarking against AI laws and standards.'
    },
    {
        id: 'framework',
        name: 'Responsible AI Framework Implementation',
        description: 'Build governance frameworks for responsible AI.'
    },
    {
        id: 'training',
        name: 'AI Training & Capacity Building',
        description: 'Train teams on responsible AI practices.'
    }
];

let currentUser = null;

// =========================
// INIT
// =========================
document.addEventListener('DOMContentLoaded', () => {

    // check stored session
    const userData = sessionStorage.getItem('user');
    if (userData) {
        currentUser = JSON.parse(userData);
        showApp();
    } else {
        document.getElementById('login-modal').classList.remove('hidden');
    }

    renderQuestions();

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);

    const healthForm = document.getElementById('health-check-form');
    if (healthForm) healthForm.addEventListener('submit', handleHealthCheckSubmit);

    const assuranceForm = document.getElementById('assurance-request-form');
    if (assuranceForm) assuranceForm.addEventListener('submit', handleAssuranceRequest);
});

function showForgot() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('forgot-form').classList.remove('hidden');
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
        } else {
            alert(data.error || 'Reset failed');
        }
    } catch (err) {
        console.error(err);
        alert('Reset error');
    }
}

// =========================
// TOGGLE LOGIN / REGISTER
// =========================
function showLogin() {
    document.getElementById("login-form").classList.remove("hidden");
    document.getElementById("register-form").classList.add("hidden");
}

function showRegister() {
    document.getElementById("register-form").classList.remove("hidden");
    document.getElementById("login-form").classList.add("hidden");
}

// =========================
// LOGIN (FIXED)
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
        alert('Login error');
    }
}

// =========================
// REGISTER (FIXED)
// =========================
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
            alert("Account created successfully!");
            showLogin();
        } else {
            alert(data.error || 'Registration failed');
        }

    } catch (err) {
        console.error(err);
        alert('Registration error');
    }
}

// =========================
// SHOW APP
// =========================
function showApp() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('sidebar').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    showPage('health-check');
}

// =========================
// LOGOUT
// =========================
async function logout() {
    await fetch('/logout', { method: 'POST' });
    sessionStorage.removeItem('user');
    location.reload();
}

// =========================
// QUESTIONS
// =========================
function renderQuestions() {
    const container = document.getElementById('questions-container');

    questions.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'question-card';

        div.innerHTML = `
            <p>${q}</p>
            <label><input type="radio" name="q${i}" value="Yes" required> Yes</label>
            <label><input type="radio" name="q${i}" value="Not Sure"> Not Sure</label>
            <label><input type="radio" name="q${i}" value="No"> No</label>
        `;

        container.appendChild(div);
    });
}

// =========================
// HEALTH CHECK
// =========================
async function handleHealthCheckSubmit(e) {
    e.preventDefault();

    const answers = [];

    for (let i = 0; i < questions.length; i++) {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        if (selected) answers.push(selected.value);
    }

    const res = await fetch('/submit-health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
    });

    const data = await res.json();

    if (res.ok) {
        alert(`Score: ${data.score}`);
    } else {
        alert(data.error);
    }
}

// =========================
// ASSURANCE REQUEST
// =========================
async function handleAssuranceRequest(e) {
    e.preventDefault();

    const service_type = e.target.dataset.serviceName;
    const email = document.getElementById('assurance-email').value;
    const organization = document.getElementById('assurance-org').value;

    const res = await fetch('/request-assurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_type, email, organization })
    });

    const data = await res.json();

    if (res.ok) {
        alert("Request submitted successfully");
    } else {
        alert(data.error);
    }
}