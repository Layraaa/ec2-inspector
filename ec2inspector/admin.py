import os
import pkg_resources
import configparser
import pwd
from .database.models import User, Profile, db
from .security import admin_required, limiter
from flask import render_template, flash, redirect, url_for, request
from werkzeug.security import generate_password_hash
from sqlalchemy import not_, select

def init_admin(app):
  # ADMIN FUNTIONS
  
  @app.route("/admin", methods=['GET'])
  @limiter.limit("60 per minute")
  @admin_required
  def admin():
    users_table = User.query.filter(not_(User.is_admin == True)).all() # Get all users from database except admin user
    profiles = Profile.query.all() # Get all profiles from database
  
    packages = ["flask", "flask_limiter", "flask_sqlalchemy", "werkzeug", "pyotp", "qrcode", "sqlalchemy"] # Array with packages
  
    packages_version = []
  
    for package in packages: # Get version of each package in array 
      try:
          version = pkg_resources.get_distribution(package).version
          packages_version.append({"package": package, "version": version})
      except:
          pass
  
    return render_template('login/admin.html', users=users_table, profiles=profiles, packages_version=packages_version)
  
  @app.route("/admin_createusers", methods=['POST'])
  @limiter.limit("30 per minute")
  @admin_required
  def admin_createusers():
    form_user = request.form.get("username")
    form_pass = request.form.get("password")
    form_ssm = 'ssmpermission' in request.form
    if request.method == 'POST':
      user = User.query.filter_by(username=form_user).first()
      if user: # Check if there is an user with that name in database
        flash([
          {'text': 'There is an account with that username', 'bold': False}
        ], 'error')
      else: # Create user
        user = User(username=form_user, password_hash=generate_password_hash(form_pass), ssm_permission=form_ssm ,is_admin=False)
        db.session.add(user)
        db.session.commit()
        flash([
          {'text': 'Created succesfully!', 'bold': False}
        ], 'success')
    return redirect(url_for('admin'))
  
  @app.route('/deleteuser', methods=['POST'])
  @limiter.limit("60 per minute")
  @admin_required
  def deleteuser():
    username = request.form.get('username')
    user = User.query.filter_by(username=username).first()
    user.profiles = []      # Erase permissions of that user
    db.session.delete(user) # Erase user from database
    db.session.commit()
    flash([
        {'text': 'User ', 'bold': False},
        {'text': username, 'bold': True},
        {'text': ' deleted succesfully!', 'bold': False}
    ], 'success')
    return redirect(url_for('admin'))
  
  @app.route('/deleteprofile', methods=['POST'])
  @limiter.limit("60 per minute")
  @admin_required
  def deleteprofile():
    profile = request.form.get('profile')
    profile = Profile.query.filter_by(id=profile).first()
    profile.users = []          # Erase permissions linked with that profile
    db.session.delete(profile)  # Erase profile from database
    db.session.commit()
    
    flash([
        {'text': 'Profile ', 'bold': False},
        {'text': profile.profile_name, 'bold': True},
        {'text': ' deleted succesfully!', 'bold': False}
    ], 'success')
    return redirect(url_for('admin'))
  
  @app.route('/updateprofiles', methods=['GET'])
  @limiter.limit("60 per minute")
  @admin_required
  def updateprofiles():
    def get_aws_profiles(user_home_dir):
      aws_files = [os.path.join(user_home_dir, ".aws/credentials")] # Load configurations
      config_file = os.path.join(user_home_dir, ".aws/config")
      profiles = {}
  
      config_parser = configparser.ConfigParser() # Read all configurations files
      if os.path.exists(config_file):
          config_parser.read(config_file)
  
      for aws_file in aws_files:
          if os.path.exists(aws_file):
              parser = configparser.ConfigParser()
              parser.read(aws_file)
              for section in parser.sections():
                  region = "-"
                  # Get the region from the config file. Handle the case where the profile does not have a corresponding region
                  if config_parser.has_section(section):
                      if config_parser.has_option(section, "region"):
                          region = config_parser.get(section, "region")
  
                  profiles[section] = region
  
      return profiles
  
    all_profiles = {}
  
    for user_info in pwd.getpwall(): # Get all users and some data from the user
      user_home_dir = user_info.pw_dir
      user_name = user_info.pw_name
      profiles = get_aws_profiles(user_home_dir)
      config_directory = os.path.join(user_home_dir, '.aws')
      if profiles:
        all_profiles[user_name] = (profiles, config_directory)
  
    for local_user, data in all_profiles.items(): 
      profiles, config_directory = data
      for profile, region in profiles.items():
  
          profile_id = f"{local_user}:{profile}"
          with app.app_context():
              if not Profile.query.filter_by(id=profile_id).first(): # Create and add profile
                  new_profile = Profile(
                      id=profile_id,
                      local_user_name=local_user,
                      config_directory=config_directory,
                      profile_name=profile,
                      default_region=region
                  )
                  
                  db.session.add(new_profile)
  
                  db.session.commit()
  
    flash([
      {'text': 'Profiles were updated!', 'bold': False}
    ], 'success')
  
    return redirect(url_for('admin'))
  
  @app.route('/add_permissions', methods=['GET'])
  @limiter.limit("60 per minute")
  @admin_required
  def add_permissions(): # Go to template for add permisions
    users_table = User.query.filter(not_(User.is_admin == True)).all()
    profiles = Profile.query.all()
    return render_template("login/add_permissions.html", users=users_table, profiles=profiles)
  
  @app.route('/erase_permission', methods=['POST'])
  @limiter.limit("60 per minute")
  @admin_required
  def erase_permission():
      user_id = request.form.get('user')
      profile_id = request.form.get('profile')
      
      user = db.session.query(User).filter(User.id == user_id).one_or_none()
      profile = db.session.query(Profile).filter(Profile.id == profile_id).one_or_none()
      
      if user is None or profile is None: # Check if user and profile exists
        flash([
          {'text': 'User or profile was not found', 'bold': False}
        ], 'error')
      else:
          try: # Try to remove permission
            user.profiles.remove(profile)
            db.session.commit()
            flash([
              {'text': 'Permission removed successfully', 'bold': False}
            ], 'success')
          except Exception as e:
            db.session.rollback()
            flash([
              {'text': 'Error trying to remove permissions', 'bold': False}
            ], 'error')
      return redirect(url_for('admin'))
  
  @app.route('/add_permission', methods=['POST'])
  @limiter.limit("60 per minute")
  @admin_required
  def add_permission():
      user_ids = request.form.getlist('user')
      counter = 0
      for user_id in user_ids:
        user = db.session.query(User).filter(User.id == user_id).one_or_none()
        if user is None: # Check if any user selected is created
          flash([
              {'text': 'User ', 'bold': False},
              {'text': user_id, 'bold': True},
              {'text': ' not found', 'bold': False}
            ], 'error')
          continue
        profile_ids = request.form.getlist('profiles')
        profiles = Profile.query.filter(Profile.id.in_(profile_ids)).all()
        for profile in profiles:
            if profile in user.profiles: # For each profile selected, create a link with each user
                stmt = select(User).where(User.id == user_id)
                result = db.session.execute(stmt)
                username = result.scalars().first()
                flash([
                    {'text': 'There was already had permits user ', 'bold': False},
                    {'text': username.username, 'bold': True},
                    {'text': ' with the profile ', 'bold': False},
                    {'text': profile.id, 'bold': True},
                ], 'error')
                continue
            try:
                user.profiles.append(profile)
                db.session.commit()
                counter += 1
            except Exception as e:
                db.session.rollback()
                stmt = select(User).where(User.id == user_id)
                result = db.session.execute(stmt)
                username = result.scalars().first()
                flash('There was an error between user ' + username.username + ' and profile ' + profile.id, 'error')
  
      flash([
          {'text': 'Added ', 'bold': False},
          {'text': str(counter), 'bold': True},
          {'text': ' permissions successfully!', 'bold': False}
      ], 'success')
      return redirect(url_for('admin'))