import os
import sqlite3
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, g, abort

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DB_DIR, 'app.db')

app = Flask(__name__, static_folder='assets', static_url_path='/assets', template_folder='templates')
app.secret_key = 'dev-secret-change-this'  # change for production

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        os.makedirs(DB_DIR, exist_ok=True)
        db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        db.row_factory = sqlite3.Row
        g._database = db
    return db

def init_db():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        city TEXT,
        country TEXT,
        interest TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    db.commit()

@app.teardown_appcontext
def close_db(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

_db_initialized = False

@app.before_request
def startup():
    global _db_initialized
    if not _db_initialized:
        init_db()
        _db_initialized = True


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/plastic-pollution')
def plastic_page():
    return render_template('plastic-pollution.html')

@app.route('/coral-bleaching')
def coral_page():
    return render_template('coral-bleaching.html')

@app.route('/overfishing')
def overfishing_page():
    return render_template('overfishing.html')

@app.route('/ocean-temperature')
def temperature_page():
    return render_template('ocean-temperature.html')

@app.route('/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/about')
def about_page():
    return render_template('about.html')

@app.route('/join', methods=['GET', 'POST'])
def join():
    if request.method == 'POST':
        name = (request.form.get('name') or '').strip()
        email = (request.form.get('email') or '').strip().lower()
        city = (request.form.get('city') or '').strip()
        country = (request.form.get('country') or '').strip()
        interest = (request.form.get('interest') or '').strip()

        errors = []
        if not name:
            errors.append('Name is required.')
        if not email:
            errors.append('Email is required.')
        elif '@' not in email or len(email) < 5:
            errors.append('Enter a valid email address.')

        if errors:
            for e in errors:
                flash(e, 'danger')
            return render_template('join.html', form=request.form)

        db = get_db()
        cur = db.cursor()
        try:
            cur.execute(
                "INSERT INTO members (name, email, city, country, interest) VALUES (?, ?, ?, ?, ?)",
                (name, email, city, country, interest)
            )
            db.commit()
        except sqlite3.IntegrityError:
            flash('An account with this email already exists.', 'warning')
            return render_template('join.html', form=request.form)

        return redirect(url_for('join_success'))

    return render_template('join.html', form={})

@app.route('/join/success')
def join_success():
    return render_template('join-success.html')

@app.route('/members')
def members():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, name, email, city, country, interest, created_at FROM members ORDER BY created_at DESC")
    rows = cur.fetchall()
    return render_template('members.html', members=rows)

@app.route('/api/members', methods=['GET'])
def api_members():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, name, email, city, country, interest, created_at FROM members ORDER BY created_at DESC")
    rows = cur.fetchall()
    out = [dict(r) for r in rows]
    return jsonify({'data': out})


from flask import abort

legacy_map = {
    'index.html': 'index.html',
    'plastic-pollution.html': 'plastic-pollution.html',
    'coral-bleaching.html': 'coral-bleaching.html',
    'overfishing.html': 'overfishing.html',
    'ocean-temperature.html': 'ocean-temperature.html',
    'dashboard.html': 'dashboard.html',
    'about.html': 'about.html',
    'join.html': 'join.html',
    'join-success.html': 'join-success.html',
    'members.html': 'members.html'
}

@app.route('/<path:fname>')
def legacy(fname):
    if fname in legacy_map:
        return render_template(legacy_map[fname])
    abort(404)



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)


