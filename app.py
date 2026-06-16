import os
import re
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # 5 minutes cache

# Global cache dictionary
_cache = {
    "data": None,
    "last_fetched": 0
}

def clean_html_to_text(html_content):
    """Converts HTML release note content into clean plain text for drafting tweets."""
    if not html_content:
        return ""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Replace relative links with absolute Google Cloud links
    for a in soup.find_all('a'):
        href = a.get('href', '')
        if href:
            if href.startswith('/'):
                href = 'https://cloud.google.com' + href
            a.replace_with(f"{a.get_text()} ({href})")
            
    text = soup.get_text(separator=' ').strip()
    # Collapse multiple whitespaces and newlines
    text = re.sub(r'\s+', ' ', text)
    return text

def parse_feed():
    """Fetches and parses the BigQuery release notes Atom feed."""
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
    except Exception as e:
        raise RuntimeError(f"Failed to fetch feed: {str(e)}")

    try:
        # Parse Atom Feed XML
        # Atom feed uses namespace: http://www.w3.org/2005/Atom
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        feed_title = root.find('atom:title', ns)
        feed_title = feed_title.text if feed_title is not None else "BigQuery Release Notes"
        
        notes = []
        
        for entry in root.findall('atom:entry', ns):
            entry_id = entry.find('atom:id', ns)
            entry_id = entry_id.text if entry_id is not None else ""
            
            title = entry.find('atom:title', ns)
            date_str = title.text if title is not None else "Unknown Date"
            
            updated_el = entry.find('atom:updated', ns)
            updated_str = updated_el.text if updated_el is not None else ""
            
            link_el = entry.find("atom:link[@rel='alternate']", ns)
            if link_el is None:
                link_el = entry.find("atom:link", ns)
            
            link_url = link_el.get('href', '') if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Segment content_html using BeautifulSoup
            soup = BeautifulSoup(content_html, 'html.parser')
            updates = []
            current_type = None
            current_content_parts = []
            
            for child in soup.contents:
                if isinstance(child, str) and not child.strip():
                    continue
                if child.name == 'h3':
                    if current_type is not None:
                        html_snippet = ''.join(str(c) for c in current_content_parts).strip()
                        updates.append({
                            "type": current_type,
                            "html": html_snippet,
                            "text": clean_html_to_text(html_snippet)
                        })
                    current_type = child.get_text().strip()
                    current_content_parts = []
                else:
                    current_content_parts.append(child)
                    
            if current_type is not None:
                html_snippet = ''.join(str(c) for c in current_content_parts).strip()
                updates.append({
                    "type": current_type,
                    "html": html_snippet,
                    "text": clean_html_to_text(html_snippet)
                })
            elif content_html.strip():
                # Fallback if no <h3> headings exist in entry content
                updates.append({
                    "type": "Update",
                    "html": content_html.strip(),
                    "text": clean_html_to_text(content_html.strip())
                })
                
            # Add each update as a separate release note record
            for idx, update in enumerate(updates):
                notes.append({
                    "id": f"{entry_id}#{idx}",
                    "date": date_str,
                    "iso_date": updated_str,
                    "type": update["type"],
                    "html_content": update["html"],
                    "text_content": update["text"],
                    "url": link_url
                })
                
        return {
            "title": feed_title,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),
            "notes": notes
        }
    except Exception as e:
        raise RuntimeError(f"Failed to parse XML: {str(e)}")

def get_notes(force_refresh=False):
    """Retrieves release notes from cache or fetches them if expired/requested."""
    now = time.time()
    if force_refresh or _cache["data"] is None or (now - _cache["last_fetched"]) > CACHE_DURATION:
        try:
            data = parse_feed()
            _cache["data"] = data
            _cache["last_fetched"] = now
        except Exception as e:
            # If fetch fails but we have cached data, fall back to cache
            if _cache["data"] is not None:
                return _cache["data"]
            raise e
    return _cache["data"]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def api_notes():
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    try:
        data = get_notes(force_refresh=force_refresh)
        return jsonify(data)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
