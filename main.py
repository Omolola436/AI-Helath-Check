from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
from functools import wraps
import sqlite3
import datetime
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SESSION_SECRET', 'dev-secret-key')

# Email configuration
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', True)
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

mail = Mail(app)

DB_NAME = "database.db"


# =========================
# DATABASE INITIALIZATION
# =========================
def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            organization TEXT NOT NULL,
            date_joined TEXT
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS health_check_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            message TEXT,
            next_step TEXT,
            date_submitted TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS upgrade_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            service_type TEXT,
            date_submitted TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            date_joined TEXT
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            actor_id INTEGER,
            actor_email TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT
        )
    ''')

    # Seed default admin if none exists
    c.execute('SELECT COUNT(*) FROM admins')
    if c.fetchone()[0] == 0:
        admin_email = os.environ.get('DEFAULT_ADMIN_EMAIL', 'admin@example.com')
        admin_name = os.environ.get('DEFAULT_ADMIN_NAME', 'Administrator')
        admin_password = os.environ.get('DEFAULT_ADMIN_PASSWORD', 'admin123')
        c.execute('''
            INSERT INTO admins (name, email, password, date_joined)
            VALUES (?, ?, ?, ?)
        ''', (admin_name, admin_email, generate_password_hash(admin_password),
              datetime.datetime.now().isoformat()))

    conn.commit()
    conn.close()


def log_audit(actor_type, actor_id, actor_email, action, details=None):
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute('''
            INSERT INTO audit_logs
                (timestamp, actor_type, actor_id, actor_email, action, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (datetime.datetime.now().isoformat(), actor_type, actor_id,
              actor_email, action, details, request.remote_addr if request else None))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Audit log error: {e}")


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get('admin_id'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return wrapper


# =========================
# HOME
# =========================
@app.route('/')
def index():
    return render_template('index.html',
        emailjs_service_id=os.environ.get('VITE_EMAILJS_SERVICE_ID', 'service_ac69gqr'),
        emailjs_template_id=os.environ.get('VITE_EMAILJS_TEMPLATE_ID', 'template_fc24l0f'),
        emailjs_public_key=os.environ.get('VITE_EMAILJS_PUBLIC_KEY', 'ym1IhNMnZepEsUCJi')
    )


# =========================
# REGISTER
# =========================
@app.route('/register', methods=['POST'])
def register():
    data = request.json

    name = data.get('name')
    email = data.get('email')
    plain_password = data.get('password')
    organization = data.get('organization')

    if not name or not email or not plain_password or not organization:
        return jsonify({"error": "All fields are required"}), 400

    password = generate_password_hash(plain_password)

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # check if user exists
    c.execute('SELECT id FROM users WHERE email = ?', (email,))
    if c.fetchone():
        conn.close()
        return jsonify({"error": "User already exists"}), 409

    c.execute('''
        INSERT INTO users (name, email, password, organization, date_joined)
        VALUES (?, ?, ?, ?, ?)
    ''', (name, email, password, organization, datetime.datetime.now().isoformat()))

    user_id = c.lastrowid

    conn.commit()
    conn.close()

    # OPTIONAL: auto-login after register
    session['user_id'] = user_id
    session['user_name'] = name
    session['user_email'] = email
    session['user_organization'] = organization

    log_audit('user', user_id, email, 'REGISTER', f'Organization: {organization}')

    return jsonify({
        "success": True,
        "message": "Account created successfully"
    })


# =========================
# LOGIN
# =========================
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('SELECT id, name, email, organization, password FROM users WHERE email = ?', (email,))
    user = c.fetchone()

    conn.close()

    if not user:
        log_audit('user', None, email, 'LOGIN_FAILED', 'User not found')
        return jsonify({"error": "User not found"}), 404

    if not check_password_hash(user[4], password):
        log_audit('user', user[0], user[2], 'LOGIN_FAILED', 'Invalid password')
        return jsonify({"error": "Invalid credentials"}), 401

    session['user_id'] = user[0]
    session['user_name'] = user[1]
    session['user_email'] = user[2]
    session['user_organization'] = user[3]

    log_audit('user', user[0], user[2], 'LOGIN_SUCCESS')

    return jsonify({
        "success": True,
        "user_id": user[0],
        "user_name": user[1],
        "user_email": user[2],
        "user_organization": user[3]
    })


# =========================
# LOGOUT
# =========================
@app.route('/logout', methods=['POST'])
def logout():
    if session.get('user_id'):
        log_audit('user', session.get('user_id'), session.get('user_email'), 'LOGOUT')
    session.clear()
    return jsonify({"success": True})


# =========================
# HEALTH CHECK
# =========================
@app.route('/submit-health-check', methods=['POST'])
def submit_health_check():
    data = request.json

    if not data or 'answers' not in data:
        return jsonify({"error": "No answers provided"}), 400

    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    answers = data.get('answers', [])

    score = sum(1 for a in answers if a == 'Yes')

    if score >= 8:
        message = "Strong foundations in place.\n\nYour organization has established key governance structures for managing AI risks and ensuring responsible use of artificial intelligence."
        next_step = "Enterprise AI Portfolio Review\nAI Audit & Assurance"
    elif score >= 5:
        message = "Progressing but governance gaps exist.\n\nYour organization has taken steps toward responsible AI use, but several governance, oversight, and risk management areas require improvement."
        next_step = "Responsible AI Framework Implementation\nRegulatory Readiness Assessment"
    elif score >= 3:
        message = "Early stage with key risks.\n\nYour organization is beginning to adopt AI technologies but lacks structured governance, risk management, and oversight processes."
        next_step = "AI Governance Foundations Program\nAI Training and Capacity Building"
    else:
        message = "Urgent attention required.\n\nYour organization may be exposed to significant operational, ethical, and regulatory risks related to AI use."
        next_step = "Comprehensive AI Assurance\nAI Incident Response Planning"

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('''
        INSERT INTO health_check_results (user_id, score, message, next_step, date_submitted)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, score, message, next_step, datetime.datetime.now().isoformat()))

    conn.commit()
    conn.close()

    log_audit('user', user_id, session.get('user_email'),
              'HEALTH_CHECK_SUBMITTED', f'Score: {score}/10')

    return jsonify({
        "score": score,
        "message": message,
        "next_step": next_step
    })


# =========================
# LATEST RESULTS
# =========================
@app.route('/get-latest-results', methods=['GET'])
def get_latest_results():
    user_id = session.get('user_id')

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('''
        SELECT score, message, next_step, date_submitted
        FROM health_check_results
        WHERE user_id = ?
        ORDER BY date_submitted DESC
        LIMIT 1
    ''', (user_id,))

    result = c.fetchone()
    conn.close()

    if result:
        return jsonify({
            "score": result[0],
            "message": result[1],
            "next_step": result[2],
            "date_submitted": result[3]
        })

    return jsonify({"error": "No results found"}), 404


# =========================
# REQUEST ASSURANCE
# =========================
@app.route('/request-assurance', methods=['POST'])
def request_assurance():
    data = request.json

    user_id = session.get('user_id')
    service_type = data.get('service_type')
    email = data.get('email')
    organization = data.get('organization')
    user_name = session.get('user_name')

    if not user_id or not service_type or not email or not organization:
        return jsonify({"error": "Missing required fields"}), 400

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('''
        INSERT INTO upgrade_requests (user_id, service_type, date_submitted)
        VALUES (?, ?, ?)
    ''', (user_id, service_type, datetime.datetime.now().isoformat()))

    conn.commit()
    conn.close()

    log_audit('user', user_id, email, 'SERVICE_REQUEST', f'Service: {service_type}')

    # EMAIL NOTIFICATION (optional)
    try:
        admin_email = os.environ.get('ADMIN_EMAIL')

        if admin_email:
            subject = f"New AI Assurance Service Request: {service_type}"
            body = f"""
New Service Request Received

Service: {service_type}

User Information:
- Name: {user_name}
- Email: {email}
- Organization: {organization}

Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

            msg = Message(subject=subject, recipients=[admin_email], body=body)
            mail.send(msg)

    except Exception as e:
        print(f"Email error: {e}")

    return jsonify({"success": True, "message": "Request submitted successfully"})


# =========================
# USER FORGOT PASSWORD
# =========================
@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    new_password = data.get('password')

    if not name or not email or not new_password:
        return jsonify({"error": "All fields are required"}), 400

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('SELECT id, name FROM users WHERE email = ?', (email,))
    row = c.fetchone()

    if not row or row[1].strip().lower() != name.lower():
        conn.close()
        return jsonify({"error": "No matching account found"}), 404

    c.execute('UPDATE users SET password = ? WHERE id = ?',
              (generate_password_hash(new_password), row[0]))
    conn.commit()
    conn.close()

    log_audit('user', row[0], email, 'PASSWORD_RESET')

    return jsonify({"success": True, "message": "Password updated"})


# =========================
# ADMIN ROUTES
# =========================
@app.route('/admin', methods=['GET'])
def admin_login():
    if session.get('admin_id'):
        return redirect(url_for('admin_dashboard'))
    return render_template('admin_login.html')


@app.route('/admin/login', methods=['POST'])
def admin_login_submit():
    email = request.form.get('email', '').strip()
    password = request.form.get('password', '')

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('SELECT id, name, email, password FROM admins WHERE email = ?', (email,))
    admin = c.fetchone()
    conn.close()

    if not admin or not check_password_hash(admin[3], password):
        log_audit('admin', admin[0] if admin else None, email,
                  'LOGIN_FAILED', 'Invalid credentials')
        flash('Invalid admin credentials', 'error')
        return redirect(url_for('admin_login'))

    session['admin_id'] = admin[0]
    session['admin_name'] = admin[1]
    session['admin_email'] = admin[2]
    log_audit('admin', admin[0], admin[2], 'LOGIN_SUCCESS')
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/logout', methods=['POST', 'GET'])
def admin_logout():
    if session.get('admin_id'):
        log_audit('admin', session.get('admin_id'),
                  session.get('admin_email'), 'LOGOUT')
    session.pop('admin_id', None)
    session.pop('admin_name', None)
    session.pop('admin_email', None)
    return redirect(url_for('admin_login'))


@app.route('/admin/forgot-password', methods=['GET', 'POST'])
def admin_forgot_password():
    if request.method == 'GET':
        return render_template('admin_forgot.html')

    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip()
    new_password = request.form.get('password', '')

    if not name or not email or not new_password:
        flash('All fields are required', 'error')
        return redirect(url_for('admin_forgot_password'))

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('SELECT id, name FROM admins WHERE email = ?', (email,))
    row = c.fetchone()

    if not row or row[1].strip().lower() != name.lower():
        conn.close()
        flash('No matching admin account found', 'error')
        return redirect(url_for('admin_forgot_password'))

    c.execute('UPDATE admins SET password = ? WHERE id = ?',
              (generate_password_hash(new_password), row[0]))
    conn.commit()
    conn.close()

    log_audit('admin', row[0], email, 'PASSWORD_RESET')

    flash('Password reset successfully. Please log in.', 'success')
    return redirect(url_for('admin_login'))


@app.route('/admin/audit')
@admin_required
def admin_audit():
    action_filter = request.args.get('action', '').strip()
    actor_filter = request.args.get('actor', '').strip()

    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    query = '''SELECT timestamp, actor_type, actor_id, actor_email,
                      action, details, ip_address
               FROM audit_logs WHERE 1=1'''
    params = []
    if action_filter:
        query += ' AND action = ?'
        params.append(action_filter)
    if actor_filter:
        query += ' AND actor_type = ?'
        params.append(actor_filter)
    query += ' ORDER BY id DESC LIMIT 500'

    c.execute(query, params)
    logs = c.fetchall()

    c.execute('SELECT DISTINCT action FROM audit_logs ORDER BY action')
    actions = [r[0] for r in c.fetchall()]

    conn.close()

    log_audit('admin', session.get('admin_id'), session.get('admin_email'),
              'VIEW_AUDIT_TRAIL')

    return render_template('admin_audit.html', logs=logs, actions=actions,
                           action_filter=action_filter, actor_filter=actor_filter,
                           admin_name=session.get('admin_name'))


@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('''
        SELECT u.id, u.name, u.email, u.organization, u.date_joined,
               (SELECT COUNT(*) FROM health_check_results h WHERE h.user_id = u.id),
               (SELECT COUNT(*) FROM upgrade_requests r WHERE r.user_id = u.id)
        FROM users u
        ORDER BY u.date_joined DESC
    ''')
    users = c.fetchall()

    conn.close()
    return render_template('admin_dashboard.html', users=users,
                           admin_name=session.get('admin_name'))


@app.route('/admin/user/<int:user_id>')
@admin_required
def admin_user_detail(user_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute('SELECT id, name, email, organization, date_joined FROM users WHERE id = ?',
              (user_id,))
    user = c.fetchone()

    if not user:
        conn.close()
        return "User not found", 404

    c.execute('''SELECT score, message, next_step, date_submitted
                 FROM health_check_results WHERE user_id = ?
                 ORDER BY date_submitted DESC''', (user_id,))
    health_checks = c.fetchall()

    c.execute('''SELECT service_type, date_submitted FROM upgrade_requests
                 WHERE user_id = ? ORDER BY date_submitted DESC''', (user_id,))
    requests_list = c.fetchall()

    conn.close()

    log_audit('admin', session.get('admin_id'), session.get('admin_email'),
              'VIEW_USER_DETAIL', f'User ID: {user_id}, Email: {user[2]}')

    return render_template('admin_user_detail.html', user=user,
                           health_checks=health_checks, requests_list=requests_list)


# =========================
# RUN APP
# =========================
if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)