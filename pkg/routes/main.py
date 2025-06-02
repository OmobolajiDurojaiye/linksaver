from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from pkg.models import db, User

main_bp = Blueprint("main", __name__, url_prefix="/")

@main_bp.route("/")
def index_page():
    return render_template("main/index.html")

