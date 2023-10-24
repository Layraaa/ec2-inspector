import base64
import random
import string
import uuid
from io import BytesIO
from datetime import datetime
from .database.models import User, Profile, Permissions, Export, Graphics, History, db
from ec2inspector.security import login_required, limiter
import pyotp
import qrcode
from PIL import Image, ImageDraw, ImageFont
from flask import session, render_template, request, redirect, url_for, flash
from werkzeug.security import check_password_hash
from botocore.session import Session as BotocoreSession
import botocore
import boto3

def init_login(app):
  # LOGIN FUNCTIONS
  
  # Login page
  @app.route("/", methods=['GET'])
  @limiter.limit("10 per minute")
  def index():
    # Create a random string
    random_number = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    session['random_number'] = random_number
  
    # Create an image with the random string
    img = Image.new('RGB', (150, 45), color=(73, 109, 137))
    d = ImageDraw.Draw(img)
  
    font = ImageFont.truetype("static/login/arial.ttf", 20)
    d.text((10, 10), random_number, fill=(255, 255, 0), font=font)
  
    # Save the image and encode it in base64
    img_io = BytesIO()
    img.save(img_io, 'JPEG')
    img_io.seek(0)
  
    captcha = base64.b64encode(img_io.getvalue()).decode()
  
    img.close()
  
    return render_template('login/index.html', captcha=captcha)
  
  # Login process step
  @app.route("/login", methods=['GET', 'POST'])
  @limiter.limit("10 per minute")
  def login():
    if request.method == 'GET': # If user tries to enter in login, error 404
      path = request.path
      return render_template('login/404.html', path=path), 404
    
    if session.get('random_number') is None:
      flash([
        {'text': 'Something went wrong. Please try again', 'bold': False}
      ], 'error')
      return redirect(url_for('index'))

    captcha = request.form.get('captcha')
    if captcha == session['random_number']: # Check if captcha was correct
      form_user = request.form.get("username")
      form_pass = request.form.get("password")
      user = User.query.filter_by(username=form_user).first()
      if user and check_password_hash(user.password_hash, form_pass): # Check if credentials were correct
        session['username'] = form_user
        if user.otp_enabled: # Check if user has enabled 2FA
          return redirect(url_for('auth_otp')) # If user has enabled 2FA, redirect for enter the code
        else:
          return redirect(url_for('setup_otp')) # If user has not enabled 2FA, ask if want enable it
      else:
        flash([
          {'text': 'Invalid credentials. Please try again', 'bold': False}
        ], 'error')
  
    else:
      flash([
        {'text': 'Invalid credentials. Please try again', 'bold': False}
      ], 'error')
      
    return redirect(url_for("index"))
  
  @app.route("/setup_otp", methods=['GET', 'POST'])
  @limiter.limit("10 per minute")
  def setup_otp():
    if session.get('username') is None: # If user is not logged in, 404 error
      path = request.path
      return render_template('login/404.html', path=path), 404
  
    user = User.query.filter_by(username=session.get('username')).first()
  
    if user.otp_code is None: # If user has no OTP Code, create one
      user.otp_code = pyotp.random_base32()
      db.session.commit()
    else: # If user has one configured, check if it was completed before
      if session.get('2fa_complete') == True:
        return redirect(url_for('redirect_on_login'))
  
    if request.method == 'POST':
      if request.form.get("activate") == "Yes": # If user want to activate, redirect to 2FA form
        user.otp_enabled = True
        db.session.commit()
        return redirect(url_for('auth_otp'))
      else: # Else, check if user is admin or not, and redirect to admin pannel or EC2 Inspector pannel
        user.otp_code = None
        user.otp_enabled = False
        db.session.commit()
        return redirect(url_for('redirect_on_login'))
  
    # Create the code, and provising URI
    totp_auth = pyotp.totp.TOTP(user.otp_code).provisioning_uri(name=user.username, issuer_name='EC2 Inspector')
  
    # Create an image and the totp_auth data
    img = qrcode.QRCode(
      version=1,
      error_correction=qrcode.constants.ERROR_CORRECT_L,
      box_size=10,
      border=0,
    )
    img.add_data(totp_auth)
  
    # Fill image
    qr_image = img.make_image(fill='black', back_color='white')
  
    buffered = BytesIO()
    qr_image.save(buffered)
  
    img_str = base64.b64encode(buffered.getvalue())
    img_str = img_str.decode()
  
    return render_template('login/setup_otp.html', secret_key=user.otp_code, qr=img_str)
  
  @app.route("/login/auth", methods=['GET', 'POST'])
  @limiter.limit("10 per minute")
  def auth_otp():
    if session.get('username') is None: # If user is not logged in, 404 error
      path = request.path
      return render_template('login/404.html', path=path), 404
    
    user = User.query.filter_by(username=session.get('username')).first()
    if user.otp_enabled is False:
      return redirect(url_for('redirect_on_login')) # If user is logged in and not enabled 2FA, check if user is admin or not, and redirect to admin pannel or EC2 Inspector pannel
    
    if request.method == 'POST': # If request is a POST, check if user completed 2FA successfuly
      totp_instance = pyotp.TOTP(user.otp_code)
      valid = totp_instance.verify(request.form.get("otp"))
      if valid:
        session['2fa_complete'] = True
        return redirect(url_for('redirect_on_login'))
      else:
        flash([
          {'text': 'Invalid code. Please try again', 'bold': False}
        ], 'error')
        return redirect(url_for('auth_otp')) # If code is incorrect, go back to 2FA form 
    else:
      return render_template('login/login_auth.html')
  
  @app.route("/redirect_on_login", methods=['GET'])
  @limiter.limit("10 per minute")
  @login_required
  def redirect_on_login():
      user = User.query.filter_by(username=session.get('username')).first()
      if user.is_admin: # Check if user is an admin user
          return redirect(url_for('admin'))
      else:
          return redirect(url_for('welcome'))
  
  @app.route("/logout", methods=['GET'])
  @limiter.limit("10 per minute")
  @login_required
  def logout(): # Logout, erase database data and erase session
    user = User.query.filter_by(username=session.get('username')).first()
    if not user.is_admin:
      if 'uuid' in session and session['uuid']:
        # Delete exports
        exports = Export.query.filter_by(id=session['uuid']).all()
        for export in exports:
          db.session.delete(export)

        # Delete graphics
        graphics = Graphics.query.filter_by(id=session['uuid']).all()
        for graphic in graphics:
          db.session.delete(graphic)

        # Delete history
        history = History.query.filter_by(id=session['uuid']).all()
        for row in history:
          db.session.delete(row)

        db.session.commit()

        session.clear()
        flash([
          {'text': 'Logged out succesfully!', 'bold': False}
        ], 'success')
        return redirect(url_for('index'))
      elif len(user.profiles) > 0: # Logout from /welcome
        session.clear()
        flash([
          {'text': 'Logged out succesfully!', 'bold': False}
        ], 'success')
        return redirect(url_for('index'))
      else:
        session.clear()
        flash([
          {'text': 'You don\'t have permissions to access any profile', 'bold': True}
        ], 'error')
        return redirect(url_for('index'))
    else:
      session.clear()
      flash([
        {'text': 'Logged out succesfully!', 'bold': False}
      ], 'success')
      return redirect(url_for('index'))
  
  @app.route("/welcome", methods=['GET'])
  @login_required
  def welcome(): # Access to EC2 Inspector
    user = User.query.filter_by(username=session.get('username')).first()
    if len(user.profiles) > 0:
      session['ssm_enabled'] = user.ssm_permission
      return render_template('ec2inspector/welcome.html', user=user)
    else:
      return redirect(url_for('logout'))
  
  @app.route("/ec2inspector", methods=['GET', 'POST'])
  @login_required
  def ec2inspector(): 
    if request.method == 'POST':
      
      if not 'uuid' in session and not session.get('uuid'):
        session['uuid'] = str(uuid.uuid4())

      user = User.query.filter_by(username=session.get('username')).first()
      username = user.username
      selectedprofile_id = request.form.get("selectedprofile")

      selected_profile = db.session.query(Profile).filter(Profile.id == selectedprofile_id).one_or_none()

      if selected_profile in user.profiles:
        session['credentials_file'] = selected_profile.config_directory + "/credentials"
        session['config_file'] = selected_profile.config_directory + "/config"
        session['selectedprofile'] = selected_profile.profile_name
        session['local_user'] = selected_profile.local_user_name
    else:
      username = session.get('username')
          
    if 'selectedprofile' not in session or not session.get('selectedprofile'):
      flash([
          {'text': 'Select a profile', 'bold': False}
        ], 'error')
      return redirect(url_for('welcome'))

    try:
      botocore_session = BotocoreSession()
      botocore_session.set_config_variable('credentials_file', session.get('credentials_file'))
      botocore_session.set_config_variable('config_file', session.get('config_file'))

      boto3_session = boto3.Session(botocore_session=botocore_session, profile_name=session.get('selectedprofile'))

      client=boto3_session.client(service_name='ec2')
      all_regions=client.describe_regions()
      regions = [region['RegionName'] for region in all_regions['Regions']]
    except botocore.exceptions.ClientError as e:
      if e.response['Error']['Code'] == 'AuthFailure':
        flash([
          {'text': 'Authentication error. Choose another profile or try again', 'bold': False}
        ], 'error')
        return redirect(url_for('welcome'))

    starttime = (lambda date: date.strftime("%Y-%m-%d %H:%M:%S"))(datetime.now())

    return render_template('ec2inspector/index.html', len = len(regions), regions=regions, username=username, starttime=starttime, ssm_enabled=session['ssm_enabled'])