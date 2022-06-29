from cgi import test
import os

from flask import Flask
from flask_jsglue import JSGlue

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=os.path.join(app.instance_path, 'fstest.sqlite')
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.update(test_config)
    
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    jsglue = JSGlue(app)    
    
    from . import db
    db.init_app(app)
    
    from . import home
    app.register_blueprint(home.bp)

    return app