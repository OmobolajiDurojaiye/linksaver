from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify, current_app
from pkg.models import db, User, Link
from pkg.routes.auth import login_required
from sqlalchemy import or_
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

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

@dashboard_bp.route("/fetch-metadata", methods=['POST'])
@login_required
def fetch_metadata_for_url():
    """
    Fetches metadata (title, description, image) for a given URL.
    Accepts a JSON payload with a "url" key.
    """
    user = User.query.get(session['user_id'])
    if not user or not user.is_active:
        return jsonify({'error': 'Authentication required.'}), 401

    data = request.get_json()
    url_to_fetch = data.get('url')

    if not url_to_fetch:
        return jsonify({'error': 'URL is required.'}), 400

    try:
        # Basic scheme validation/addition
        if not (url_to_fetch.startswith('http://') or url_to_fetch.startswith('https://')):
            # Check if it looks like a domain before prepending http, to avoid http://my search term
            if '.' not in url_to_fetch.split('/')[0] or ' ' in url_to_fetch:
                 return jsonify({'error': 'Invalid URL format. Please provide a full URL like https://example.com'}), 400
            url_to_fetch = 'https://' + url_to_fetch # Default to https
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 LinkSaverClient/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        # Using a session for potential cookie handling and connection pooling if multiple requests were made
        with requests.Session() as s:
            response = s.get(url_to_fetch, headers=headers, timeout=10, allow_redirects=True)
        
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        content_type = response.headers.get('content-type', '').lower()
        if 'html' not in content_type:
            return jsonify({'error': 'URL does not point to an HTML page.'}), 400

        soup = BeautifulSoup(response.content, 'lxml') # Use lxml; fall back to 'html.parser' if lxml not installed

        metadata = {
            'title': '',
            'description': '',
            'image_url': ''
        }

        # Fetch Title (Order: <title>, og:title, twitter:title)
        if soup.title and soup.title.string:
            metadata['title'] = soup.title.string.strip()
        
        if not metadata['title']:
            og_title = soup.find('meta', property='og:title')
            if og_title and og_title.get('content'):
                metadata['title'] = og_title['content'].strip()
        
        if not metadata['title']:
            twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
            if twitter_title and twitter_title.get('content'):
                metadata['title'] = twitter_title['content'].strip()

        # Fetch Description (Order: meta description, og:description, twitter:description)
        meta_description = soup.find('meta', attrs={'name': 'description'})
        if meta_description and meta_description.get('content'):
            metadata['description'] = meta_description['content'].strip()
        
        if not metadata['description']:
            og_description = soup.find('meta', property='og:description')
            if og_description and og_description.get('content'):
                metadata['description'] = og_description['content'].strip()
        
        if not metadata['description']:
            twitter_description = soup.find('meta', attrs={'name': 'twitter:description'})
            if twitter_description and twitter_description.get('content'):
                metadata['description'] = twitter_description['content'].strip()
        
        # Fetch Image URL (Order: og:image, twitter:image, apple-touch-icon, icon)
        image_url_found = None
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            image_url_found = og_image['content']
        
        if not image_url_found:
            twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
            if twitter_image and twitter_image.get('content'):
                image_url_found = twitter_image['content']
        
        if not image_url_found:
            # Check for apple-touch-icon (often higher quality than favicon)
            apple_icon = soup.find('link', rel='apple-touch-icon')
            if apple_icon and apple_icon.get('href'):
                image_url_found = apple_icon['href']
        
        if not image_url_found:
            # Fallback to generic icon
            icon_link = soup.find('link', rel='icon')
            if icon_link and icon_link.get('href'):
                image_url_found = icon_link['href']

        if image_url_found:
            # Resolve relative URL to absolute using the final URL after redirects
            metadata['image_url'] = urljoin(response.url, image_url_found.strip())

        return jsonify(metadata), 200

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Fetching URL timed out.'}), 408
    except requests.exceptions.TooManyRedirects:
        return jsonify({'error': 'Too many redirects for the URL.'}), 400
    except requests.exceptions.RequestException as e:
        current_app.logger.warning(f"RequestException fetching metadata for {url_to_fetch}: {str(e)}")
        return jsonify({'error': f'Could not fetch URL. Please check the address and try again.'}), 400
    except Exception as e:
        current_app.logger.error(f"Unexpected error fetching metadata for {url_to_fetch}: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred while parsing metadata.'}), 500