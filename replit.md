# Project Overview

Flask-based AI Governance Health Check web app.

## Stack
- Python 3.11, Flask, Flask-Mail, Werkzeug
- SQLite (database.db)
- Templates in `templates/`, static assets in `static/`

## Run
- Workflow `Start application`: `python main.py` on port 5000 (host 0.0.0.0)

## Deployment
- Autoscale via gunicorn: `gunicorn --bind=0.0.0.0:5000 --reuse-port main:app`

## Optional Env Vars
- `SESSION_SECRET`, `MAIL_*`, `ADMIN_EMAIL`, `VITE_EMAILJS_*`
