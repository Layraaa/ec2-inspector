import os
from flask import Flask
from flask_compress import Compress
from .database import initialize_db, clean_old_rows, scheduler
from .security import init_security
from .login import init_login
from .admin import init_admin
from .ec2inspector import init_ec2inspector
from .ssm import init_ssm

app = Flask(__name__, template_folder='../templates', static_folder='../static')
app.secret_key = "s!T1shX6(cPP7Lo>8YHy%}67]5:!-Pp6"
Compress(app)

initialize_db(app)
clean_old_rows(app)
scheduler(app)
init_security(app)
init_login(app)
init_admin(app)
init_ec2inspector(app)
init_ssm(app)