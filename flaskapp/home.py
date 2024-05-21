from flask import Blueprint, render_template, request

from .extensions import db
from .helper import cors_enabled
from .models import User

bp = Blueprint("home", __name__)


@bp.route("/")
def index():
    return "HEllo"


@bp.route("/add_user", methods=["OPTIONS", "POST"])
@cors_enabled(methods=["POST"])
def add_user():
    username: str = request.data.decode("utf-8")

    new_user = User(name=username)
    db.session.add(new_user)
    db.session.commit()

    return "", 201


@bp.route("/home")
def home():
    return render_template("intro/home.html")


@bp.route("/about")
def about():
    return render_template("intro/about.html")


@bp.route("/privacy")
def privacy():
    return render_template("intro/privacy.html")
