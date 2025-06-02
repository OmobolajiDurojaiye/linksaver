from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    _password_hash = db.Column('password_hash', db.String(255), nullable=False)  # Increased from 128 to 255
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)

    @property
    def password(self):
        raise AttributeError("Password is write-only.")

    @password.setter
    def password(self, plain_text_password):
        self._password_hash = generate_password_hash(plain_text_password)

    def check_password(self, password):
        return check_password_hash(self._password_hash, password)



class Link(db.Model):
    __tablename__ = 'links'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    url = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))  # Added category field
    keywords = db.Column(db.Text)  # Store as comma-separated values
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def get_keywords_list(self):
        """Get keywords as a list"""
        if not self.keywords:
            return []
        return [keyword.strip() for keyword in self.keywords.split(',') if keyword.strip()]
    
    def set_keywords_list(self, keywords_list):
        """Set keywords from a list"""
        if keywords_list:
            self.keywords = ', '.join([keyword.strip() for keyword in keywords_list if keyword.strip()])
        else:
            self.keywords = None
    
    def to_dict(self):
        """Convert link to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'url': self.url,
            'description': self.description,
            'category': self.category,
            'keywords': self.get_keywords_list(),
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active
        }
    
    def __repr__(self):
        return f"<Link {self.title}>"

# Add the relationship back to User after both models are defined
User.links = db.relationship('Link', backref='user', lazy=True, cascade='all, delete-orphan')