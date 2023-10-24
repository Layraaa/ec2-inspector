import os

class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:////var/lib/ec2inspector.db'
    SECRET_KEY = os.urandom(16).hex()
    SQLALCHEMY_TRACK_MODIFICATIONS = False