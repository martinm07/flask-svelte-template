from sqlalchemy import select

from flaskapp.extensions import db
from flaskapp.models import User


def test_index(client):
    response = client.get("/")
    assert response.data.lower() == b"hello"


def test_add_user(client):
    client.post("/add_user", data="sartre")
    rows = db.session.scalars(select(User)).all()
    assert len(rows) == 1
    assert rows[0].name == "sartre"
