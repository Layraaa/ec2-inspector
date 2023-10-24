from flask import session, request, render_template, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
from datetime import datetime, timedelta
from .database.models import User, db

# Login security
def login_required(f):
  @wraps(f)
  def decorated_function(*args, **kwargs):
    if session.get('username') is None:  # Check if user is logged in
      path = request.path
      return render_template('login/404.html', path=path), 404

    user = User.query.filter_by(username=session.get('username')).first()
    if user is None: # Check if user is in database
      path = request.path
      return render_template('login/404.html', path=path), 404
    
    if user.otp_enabled and not session.get('2fa_complete', False): # Check if user completed 2FA
      path = request.path
      return render_template('login/404.html', path=path), 404

    return f(*args, **kwargs)

  return decorated_function

def admin_required(f):
  @wraps(f)
  def decorated_function(*args, **kwargs):
    if session.get('username') is None: # Check if user is logged in
      path = request.path
      return render_template('login/404.html', path=path), 404

    user = User.query.filter_by(username=session.get('username')).first()
    if user is None or not user.is_admin:  # Check if user is admin
      path = request.path
      return render_template('login/404.html', path=path), 404

    if user.otp_enabled and not session.get('2fa_complete', False): # Check if user completed 2FA
      path = request.path
      return render_template('login/404.html', path=path), 404

    return f(*args, **kwargs)

  return decorated_function

def ssm_enabled(f):
  @wraps(f)
  def decorated_function(*args, **kwargs):

    if session.get('ssm_enabled') != True:
      return jsonify({"error": "Not enough permises"}), 400

    return f(*args, **kwargs)
  
  return decorated_function

# Limiter
limiter = Limiter(
  key_func=get_remote_address,
  storage_uri="memory://"
)

def init_security(app):
  # Flask security
  @app.teardown_appcontext
  def teardown_db(exception=None):
    db.session.remove()

  # Init app on limiter
  limiter.init_app(app)

  #app.config['SESSION_COOKIE_SECURE'] = True
  app.config['SESSION_COOKIE_HTTPONLY'] = True
  app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

  # Request security
  # Kill session after 12 hours
  @app.before_request
  def make_session_permanent():
      session.permanent = True
      now = datetime.now()
      session.modified = True
      session['last_activity'] = now.strftime('%Y-%m-%d %H:%M:%S')

  @app.after_request
  def check_activity(response):
      last_activity = session.get('last_activity')
      if last_activity is not None:
          last_activity = datetime.strptime(last_activity, '%Y-%m-%d %H:%M:%S')
          session_timeout = timedelta(hours=12)
          if datetime.now() - last_activity > session_timeout:
              session.clear()
      return response

  # HTTP Headers
  @app.after_request
  def apply_caching(response):
      response.headers.remove('Server')
      response.headers["Server"] = "Apache"
      # Check if the request was made over HTTPS
      if request.is_secure:
          # Apply HSTS only over HTTPS
          response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
          
          # Ensure cookies are sent only over HTTPS
          response.headers["Set-Cookie"] = "Secure"

          # Force cookie by SSL
          app.config['SESSION_COOKIE_SECURE'] = True
          
      # Apply other headers regardless of HTTPS
      response.headers["X-Frame-Options"] = "DENY"
      response.headers["X-XSS-Protection"] = "1; mode=block"
      response.headers["X-Content-Type-Options"] = "nosniff"
      response.headers["Referrer-Policy"] = "no-referrer"
      response.headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' data:"
      
      return response

  @app.errorhandler(404)
  def page_not_found(e):
    path = request.path
    return render_template('login/404.html', path=path), 404