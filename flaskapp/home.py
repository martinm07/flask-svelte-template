from flask import (
    Blueprint, render_template
)

bp = Blueprint('home', __name__)

@bp.route('/')
@bp.route('/home')
def home():
    return render_template('intro/home.html')

@bp.route('/about')
def about():
    return render_template('intro/about.html')