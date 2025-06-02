from flask import Blueprint, request, redirect, url_for, flash, session
from functools import wraps
from pkg.models import db, User
from sqlalchemy.exc import IntegrityError
import re 

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

def login_required(f):
    """Decorator to require login"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'error')
            return redirect(url_for('main.index_page'))
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/signup', methods=['POST'])
def signup():
    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')
    confirm_password = request.form.get('confirm_password', '')

    if not all([name, email, password, confirm_password]):
        flash('All fields are required.', 'error')
        return redirect(url_for('main.index_page'))

    if password != confirm_password:
        flash('Passwords do not match.', 'error')
        return redirect(url_for('main.index_page'))

    if len(password) < 6:
        flash('Password must be at least 6 characters.', 'error')
        return redirect(url_for('main.index_page'))

    if User.query.filter_by(email=email).first():
        flash('Email already exists.', 'error')
        return redirect(url_for('main.index_page'))

    try:
        new_user = User(name=name, email=email)
        new_user.password = password  # This will hash the password via the property setter
        
        db.session.add(new_user)
        db.session.commit()
        
        # Add debug print to verify password hashing
        print(f"User created - Email: {email}")
        print(f"Password hash stored: {new_user._password_hash}")
        
        flash('Account created successfully.', 'success')
        return redirect(url_for('main.index_page', show_login='true'))
        
    except IntegrityError:
        db.session.rollback()
        flash('Email already exists.', 'error')
        return redirect(url_for('main.index_page'))
    except Exception as e:
        db.session.rollback()
        print(f"Signup error: {e}")
        flash('An error occurred during signup. Please try again.', 'error')
        return redirect(url_for('main.index_page'))


@auth_bp.route('/login', methods=['POST'])
def login():
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')

    print(f"Login attempt - Email: {email}, Password: {password}")

    if not email or not password:
        flash('Email and password are required.', 'error')
        return redirect(url_for('main.index_page'))

    user = User.query.filter_by(email=email).first()
    print(f"User found: {user}")

    if user:
        print(f"Stored password hash: {user._password_hash}")
        print(f"Password check result: {user.check_password(password)}")
        
        # Additional debug: try to verify the hash manually
        from werkzeug.security import check_password_hash
        manual_check = check_password_hash(user._password_hash, password)
        print(f"Manual password check: {manual_check}")

    if user and user.check_password(password):
        if not user.is_active:
            flash('Your account is inactive. Please contact support.', 'error')
            return redirect(url_for('main.index_page'))

        session['user_id'] = user.id
        session['user_name'] = user.name
        flash('Login successful! Welcome back.', 'success')
        return redirect(url_for('dashboard.index'))

    flash('Invalid email or password. Please try again.', 'error')
    return redirect(url_for('main.index_page'))


@auth_bp.route('/logout')
@login_required 
def logout():
    session.pop('user_id', None)
    session.pop('user_name', None)
    flash('You have been successfully logged out.', 'info')
    return redirect(url_for('main.index_page'))