from flask import Flask

from . import home
from .extensions import csrf, db, migrate


def create_app(test_config=None):
    app = Flask(__name__)
    # the python_dotenv package automatically loads ".*env" as environment variables
    app.config.from_prefixed_env()

    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    migrate.init_app(app)
    csrf.init_app(app)

    app.register_blueprint(home.bp)

    return app
