from getpass import getpass
import os
import sys
import re
import pyotp
from .models import db, User
from werkzeug.security import generate_password_hash

def create_admin_user(username, pswd, otp_code=None, otp_enabled=False):
    user = User(username=username, password_hash=generate_password_hash(pswd), 
                otp_code=otp_code, otp_enabled=otp_enabled, 
                ssm_permission=False, is_admin=True)
    db.session.add(user)
    db.session.commit()

def create_db(app, username, pswd, otp_code, otp_enabled):
    with app.app_context():
        db.create_all()
        user = User(username=username, password_hash=generate_password_hash(pswd), otp_code=otp_code, otp_enabled=otp_enabled, ssm_permission=False, is_admin=True)
        db.session.add(user)
        db.session.commit()
        
def init_db(app):

    if not os.path.exists('/var/lib/ec2inspector.db'):
        print(" _____ ____ ____    ___                           _")
        print("| ____/ ___|___ \  |_ _|_ __  ___ _ __   ___  ___| |_ ___  _ __")
        print("|  _|| |     __) |  | || '_ \/ __| '_ \ / _ \/ __| __/ _ \| '__|")
        print("| |__| |___ / __/   | || | | \__ \ |_) |  __/ (__| || (_) | |")
        print("|_____\____|_____| |___|_| |_|___/ .__/ \___|\___|\__\___/|_|")
        print("                                |_|")
        print("Made by @Layraaa | v1.0")
        print("https://github.com/Layraaa/ec2-inspector")
        print("")
        print("Administrator user creation")

        while True:
            username = str(input("Username (Default: admin) -> ") or "admin")
            if username == "":
                continue
            else:
                break
        
        while True:
            pswd = getpass('Password -> ')
            if pswd == "":
                continue
            elif len(pswd) < 8 or not re.search(r"\d", pswd) or not re.search(r"[a-zA-Z]", pswd) or not re.search(r"\W", pswd):
                print("Password must contain 8 or more characters. At least a letter, number and special character")
                continue
            else:
                break
        
        while True:
            verifypswd = getpass('Verify password -> ')
            if verifypswd == "":
                continue
            elif len(verifypswd) < 8 or not re.search(r"\d", verifypswd) or not re.search(r"[a-zA-Z]", verifypswd) or not re.search(r"\W", verifypswd):
                print("Password must contain 8 or more characters. At least a letter, number and special character")
                continue
            elif pswd != verifypswd:
                print("")
                print("Passwords doesn't match!")
                print("")
                exit()
            else:
                print("")
                print("Passwords matchs!")
                print("")
                break

        while True:
            download = input("Do you want create a two factor authentication for administrator user? (Highly recommended) [Yes/No] -> ") or "Yes"

            if download.capitalize() == "Yes":

                otp_enabled = True
                otp_code = pyotp.random_base32()

                print ("")
                print("This is the Key you need to add on your Authenticator App: " + otp_code)

                tries = 3

                while tries != 0:

                    verificationcode = input("Put the authenticator code -> ")

                    totp_instance = pyotp.TOTP(otp_code)
                    valid = totp_instance.verify(verificationcode)

                    if valid:
                        print("")
                        print("Perfect! Now the database will be created...")
                        create_db(app, username, pswd, otp_code, otp_enabled)
                        print("")
                        print("Thanks for install EC2 Inspector!")
                        print("Made by @Layraaa | v1.0")
                        print("https://github.com/Layraaa/ec2-inspector")
                        exit()
                    else:
                        tries = tries - 1
                        print(str("Authentication code is not correct, you have " + str(tries) + " left"))
                        continue

                print("Exiting...")
                exit()

            elif download.capitalize() == "No":
                otp_enabled = False
                otp_code = None

                print("")
                print("Perfect! Now the database will be created...")
                create_db(app, username, pswd, otp_code, otp_enabled)
                print("")
                print("Thanks for install EC2 Inspector!")
                print("Made by @Layraaa | v1.0")
                print("https://github.com/Layraaa/ec2-inspector")
                exit()
            else:
                print("Enter Yes or No")
                continue
    else:
        if not os.access('/var/lib/ec2inspector.db', os.R_OK):
            print("Error: No read permissions in database")
            sys.exit(1)
        if not os.access('/var/lib/ec2inspector.db', os.W_OK):
            print("Error: No write permissions in database")
            sys.exit(1)
