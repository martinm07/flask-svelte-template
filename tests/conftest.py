import os
from warnings import warn

import pytest
from dotenv import load_dotenv
from sqlalchemy.orm import scoped_session, sessionmaker

from flaskapp import create_app
from flaskapp.extensions import csrf, db

load_dotenv()

DB_CONN = os.environ.get("TEST_DATABASE_URI")
if not DB_CONN:
    warn(
        'TEST_DATABASE_URI not found. You must export a \
        database connection string to the environment variable \
        TEST_DATABASE_URI in order to run tests. Resorting to \
        default value "sqlite+pysqlite:///:memory:".',
        RuntimeWarning,
    )
    DB_CONN = "sqlite+pysqlite:///:memory:"


@pytest.fixture(scope="session", autouse=True)
def database(app):
    """
    Return database object with all tables from the schema generated.

    TO THOSE IMPLEMENTING THIS FUNCTION
    ---
    You may want to do stuff with your specific database engine (e.g SQLite, MySQL, PostgreSQL, etc.)
    like creating/deleting the database for/after the tests, or making sure it's clean by
    deleting any tables. For example, here's something for MySQL:

    ```python
    import mysql.connector # pip install mysql-connector-python
    import sqlalchemy as sa

    DB_OPTS = sa.engine.url.make_url(DB_CONN).translate_connect_args()

    test_db = mysql.connector.connect(
        host=DB_OPTS.get("host"),
        user=DB_OPTS.get("username"),
        password=DB_OPTS.get("password"),
    )
    dbname = DB_OPTS.get("database")

    cursor = test_db.cursor()

    cursor.execute("SHOW DATABASES")
    if next((x for x in cursor if x[0] == dbname), -1) == -1:
        cursor.execute("CREATE DATABASE " + dbname)
    # Potentially unread results in cursor
    cursor.reset()

    # [...]

    cursor.execute("DROP DATABASE " + dbname)
    cursor.close()
    ```
    """
    # Engine-specific setup

    with app.app_context():
        db.create_all()
    yield db

    # Cleanup


@pytest.fixture(scope="session")
def app():
    """
    Return an instance of the Flask app
    """
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": DB_CONN})

    for bp in app.iter_blueprints():
        csrf.exempt(bp)

    return app


@pytest.fixture(autouse=True)
def enable_transactional_tests(app):
    """https://docs.sqlalchemy.org/en/20/orm/session_transaction.html#joining-a-session-into-an-external-transaction-such-as-for-test-suites"""
    with app.app_context():
        connection = db.engine.connect()
    transaction = connection.begin()

    db.session = scoped_session(
        session_factory=sessionmaker(
            bind=connection, join_transaction_mode="create_savepoint"
        )
    )

    yield

    db.session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="session")
def client(app):
    """
    Return an instance of flask.testing.FlaskClient
    """
    return app.test_client()


@pytest.fixture(scope="session")
def runner(app):
    """
    Return an instance of flask.testing.FlaskCliRunner
    """
    return app.test_cli_runner()
