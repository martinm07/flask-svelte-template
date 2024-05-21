from flask import Blueprint, request

from .extensions import db
from .models import User

bp = Blueprint("home", __name__)


@bp.route("/")
def index():
    return "HEllo"


@bp.route("/add_user", methods=["POST"])
def add_user():
    username: str = request.data.decode("utf-8")

    new_user = User(name=username)
    db.session.add(new_user)
    db.session.commit()

    return "", 201
