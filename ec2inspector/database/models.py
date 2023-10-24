import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import relationship

db = SQLAlchemy()

# Tables configuration
Permissions = db.Table('permissions',
  db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
  db.Column('profile_id', db.Integer, db.ForeignKey('profiles.id'), primary_key=True)
)

class User(db.Model):
  __tablename__ = 'users'
  id = db.Column(db.Integer, primary_key=True)
  username = db.Column(db.String(40), unique=True, nullable=False)
  password_hash = db.Column(db.String(120), nullable=False)
  otp_code = db.Column(db.String(16), nullable=True)
  otp_enabled = db.Column(db.Boolean, default=False)
  ssm_permission = db.Column(db.Boolean, default=False)
  is_admin = db.Column(db.Boolean, default=False)

  profiles = relationship("Profile", secondary=Permissions, back_populates="users")

class Profile(db.Model):
  __tablename__ = 'profiles'
  id = db.Column(db.String(80), primary_key=True)
  local_user_name = db.Column(db.String(40), nullable=False)
  config_directory = db.Column(db.String(200), nullable=False)
  profile_name = db.Column(db.String(40), nullable=False)
  default_region = db.Column(db.String(30), nullable=False)

  users = relationship("User", secondary=Permissions, back_populates="profiles")

class Export(db.Model):
  __tablename__ = 'export'
  id = db.Column(db.String(36), primary_key=True)
  instances = db.Column(db.JSON, nullable=True)
  images = db.Column(db.JSON, nullable=True)
  network_interfaces = db.Column(db.JSON, nullable=True)
  security_groups = db.Column(db.JSON, nullable=True)
  subnets = db.Column(db.JSON, nullable=True)
  vpcs = db.Column(db.JSON, nullable=True)
  volumes = db.Column(db.JSON, nullable=True)
  timestamp = db.Column(db.DateTime, default=datetime.datetime.now())

class Graphics(db.Model):
  __tablename__ = 'graphics'
  primarykey = db.Column(db.Integer, primary_key=True)
  id = db.Column(db.String(36), primary_key=False)
  title = db.Column(db.String(20))
  region = db.Column(db.String(20))
  graphic = db.Column(db.BLOB, nullable=True)
  timestamp = db.Column(db.DateTime, default=datetime.datetime.now())

class History(db.Model):
  __tablename__ = 'history'
  primarykey = db.Column(db.Integer, primary_key=True)
  id = db.Column(db.String(36))
  date = db.Column(db.DateTime, nullable=False)
  instance_id = db.Column(db.String(19), nullable=False)
  event = db.Column(db.String(80), nullable=False)
  details = db.Column(db.String(80), nullable=False)
  timestamp = db.Column(db.DateTime, default=datetime.datetime.now())

