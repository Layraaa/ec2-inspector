from .config import Config
from .database import init_db, db
from .models import Export, Graphics, History
from apscheduler.schedulers.background import BackgroundScheduler
import datetime

def initialize_db(app):
    app.config.from_object(Config)
    db.init_app(app)
    init_db(app)

def clean_old_rows(app):
  with app.app_context():
    limit = datetime.datetime.utcnow() - datetime.timedelta(hours=12)
    db.session.query(Export).filter(Export.timestamp < limit).delete()
    db.session.query(Graphics).filter(Graphics.timestamp < limit).delete()
    db.session.query(History).filter(History.timestamp < limit).delete()
    db.session.commit()

def scheduler(app):
  scheduler = BackgroundScheduler()
  scheduler.remove_all_jobs()
  scheduler.add_job(clean_old_rows, 'interval', args=[app], minutes=5)
  scheduler.start()