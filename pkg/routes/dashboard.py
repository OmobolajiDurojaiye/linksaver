from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from pkg.models import db, User, Link
from pkg.routes.auth import login_required
from sqlalchemy import or_

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@dashboard_bp.route("/")
@login_required
def index():
    """Dashboard main page - displays links, handles search and filter"""
    # Get current user from session
    user = User.query.get(session['user_id'])
    if not user or not user.is_active:
        flash('Please log in to access your dashboard.', 'error')
        return redirect(url_for('main.index_page'))
    
    # Get search and filter parameters
    search_term = request.args.get('search', '').strip()
    selected_category = request.args.get('category', '').strip()
    
    # Build query for user's links
    query = Link.query.filter_by(user_id=user.id, is_active=True)
    
    # Apply category filter
    if selected_category:
        query = query.filter(Link.category == selected_category)
    
    # Apply search filter
    if search_term:
        search_filter = or_(
            Link.title.ilike(f'%{search_term}%'),
            Link.description.ilike(f'%{search_term}%'),
            Link.url.ilike(f'%{search_term}%'),
            Link.keywords.ilike(f'%{search_term}%')
        )
        query = query.filter(search_filter)
    
    # Get filtered links
    links = query.order_by(Link.created_at.desc()).all()
    
    # Get unique categories for filter dropdown
    categories_query = (
        db.session.query(Link.category)
        .filter_by(user_id=user.id, is_active=True)
        .distinct()
        .all()
    )
    categories_for_filter = sorted([cat[0] for cat in categories_query if cat[0]])
    
    # Calculate stats
    total_links_count = Link.query.filter_by(user_id=user.id, is_active=True).count()
    
    category_stats = (
        db.session.query(Link.category, db.func.count(Link.id))
        .filter_by(user_id=user.id, is_active=True)
        .group_by(Link.category)
        .all()
    )
    
    categories_stats_dict = {
        cat_name or 'Uncategorized': count 
        for cat_name, count in category_stats
    }
    
    stats = {
        'total_links': total_links_count,
        'categories': categories_stats_dict
    }

    # Categories for modal dropdown (existing + default options)
    default_categories = ["work", "personal", "learning", "entertainment", "news", "shopping", "other"]
    modal_form_categories = sorted(list(set(categories_for_filter + default_categories)))

    return render_template(
        "users/dashboard.html", 
        user=user, 
        links=links, 
        categories_for_filter=categories_for_filter,
        stats=stats,
        search_term=search_term,
        selected_category=selected_category,
        modal_form_categories=modal_form_categories
    )


@dashboard_bp.route("/links/add", methods=['POST'])
@login_required
def add_link():
    """Add a new link"""
    user = User.query.get(session['user_id'])
    if not user or not user.is_active:
        flash('Please log in to add links.', 'error')
        return redirect(url_for('main.index_page'))
        
    try:
        # Get form data
        title = request.form.get('title', '').strip()
        url = request.form.get('url', '').strip()
        description = request.form.get('description', '').strip()
        category = request.form.get('category', '').strip()
        keywords_str = request.form.get('keywords', '').strip()

        # Validate required fields
        if not title or not url:
            flash('Title and URL are required.', 'error')
            return redirect(url_for('dashboard.index'))

        # Create new link
        new_link = Link(
            title=title,
            url=url,
            description=description if description else None,
            category=category if category else None,
            user_id=user.id
        )
        
        # Process keywords
        if keywords_str:
            keywords_list = [k.strip() for k in keywords_str.split(',') if k.strip()]
            new_link.set_keywords_list(keywords_list)
        
        # Save to database
        db.session.add(new_link)
        db.session.commit()
        flash('Link added successfully!', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to add link: {str(e)}', 'error')
    
    return redirect(url_for('dashboard.index'))


@dashboard_bp.route("/links/edit/<int:link_id>", methods=['POST'])
@login_required
def edit_link(link_id):
    """Edit an existing link"""
    user = User.query.get(session['user_id'])
    if not user or not user.is_active:
        flash('Please log in to edit links.', 'error')
        return redirect(url_for('main.index_page'))
        
    # Get the link (ensure it belongs to current user)
    link = Link.query.filter_by(id=link_id, user_id=user.id, is_active=True).first_or_404()

    try:
        # Get form data
        title = request.form.get('title', '').strip()
        url = request.form.get('url', '').strip()
        description = request.form.get('description', '').strip()
        category = request.form.get('category', '').strip()
        keywords_str = request.form.get('keywords', '').strip()

        # Validate required fields
        if not title or not url:
            flash('Title and URL are required.', 'error')
            return redirect(url_for('dashboard.index'))

        # Update link properties
        link.title = title
        link.url = url
        link.description = description if description else None
        link.category = category if category else None
        
        # Update keywords
        if 'keywords' in request.form:
            keywords_list = [k.strip() for k in keywords_str.split(',') if k.strip()]
            link.set_keywords_list(keywords_list)
        
        # Save changes
        db.session.commit()
        flash('Link updated successfully!', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to update link: {str(e)}', 'error')
    
    return redirect(url_for('dashboard.index'))


@dashboard_bp.route("/links/delete/<int:link_id>", methods=['POST'])
@login_required
def delete_link(link_id):
    """Delete a link (soft delete)"""
    user = User.query.get(session['user_id'])
    if not user or not user.is_active:
        flash('Please log in to delete links.', 'error')
        return redirect(url_for('main.index_page'))
        
    # Get the link (ensure it belongs to current user)
    link = Link.query.filter_by(id=link_id, user_id=user.id, is_active=True).first_or_404()
    
    try:
        # Soft delete (set is_active to False)
        link.is_active = False
        db.session.commit()
        flash('Link deleted successfully.', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to delete link: {str(e)}', 'error')
    
    return redirect(url_for('dashboard.index'))