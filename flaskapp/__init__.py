import os
from pathlib import Path

from flask import Flask, request, send_file

from . import home
from .extensions import csrf, db, migrate


def get_public_files(public_root: str):
    public_files = []
    for root, _, files in os.walk(public_root):
        for file in files:
            path = Path(os.path.join(root, file)).relative_to(public_root)
            public_files.append(str(path))
    return public_files


def create_app(test_config=None):
    app = Flask(__name__)
    # the python_dotenv package automatically loads ".*env" as environment variables
    app.config.from_prefixed_env()

    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    # IMP: Remove this if you have a real database hooked up!
    with app.app_context():
        db.create_all()

    migrate.init_app(app)
    csrf.init_app(app)

    app.register_blueprint(home.bp)

    PUBLIC_ROOT = os.path.abspath(os.path.join(app.config.get("APP"), "public"))
    public_files = get_public_files(PUBLIC_ROOT)

    @app.before_request
    def check_public_files():
        if any(x == request.path[1:] for x in public_files):
            return send_file(os.path.join(PUBLIC_ROOT, request.path[1:]))

    return app
