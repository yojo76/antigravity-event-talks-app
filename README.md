# BigQuery Release Notes Hub & Tweet Composer

A web application designed to track, search, filter, and share Google Cloud BigQuery release notes on X (formerly Twitter). The application ingests the official BigQuery feed, segments combined updates into individual items, and provides a smart composer with automatic character-limit truncation.

---

## 🚀 Key Features

* **📰 Feed Segmentation**: Automatically splits daily aggregated release notes into separate cards (e.g. distinct *Features*, *Issues*, *Deprecations*) using HTML node traversing.
* **🔍 Search & Filter controls**: Filter updates dynamically by keyword or type badge, and sort by date (newest or oldest first).
* **💾 In-Memory Cache**: Caches feed responses locally for 5 minutes to limit unnecessary network requests, with support for manual bypassing.
* **🐦 Smart Tweet Composer**: Establishes pre-formatted draft cards for single updates or combined lists of updates.
* **📐 Twitter URL character adjustment**: Counts URLs as exactly 23 characters matching Twitter's URL-shortening policy (`t.co`), and automatically trims longer bodies to fit under the 280-character ceiling.
* **✨ Modern Aesthetics**: A responsive dark slate theme built using glassmorphic panels, CSS grid layouts, type badges, micro-animations, and CSS loader structures.

---

## 🛠️ Tech Stack

* **Backend**: Python 3.12+, Flask (Web server), BeautifulSoup4 (HTML parser), Requests (HTTP client), ElementTree (XML parsing).
* **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), FontAwesome Icons, Outfit & Plus Jakarta Sans Google Fonts.

---

## 📦 Installation & Local Setup

### Prerequisites
Make sure you have Python 3 and Git installed on your system.

### 1. Clone & Set Up Directory
Navigate to your project folder or clone it from GitHub:
```bash
git clone https://github.com/yojo76/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Install Dependencies
Install the required packages (`Flask`, `requests`, and `beautifulsoup4`):
```bash
pip install Flask requests beautifulsoup4
```

### 3. Run the Development Server
Launch the Flask server:
```bash
python app.py
```
By default, the server runs in debug mode on **`http://127.0.0.1:5000`**. Open this URL in your web browser.

---

## 📂 File Directory

* **[`app.py`](app.py)**: Backend API controller, parsing utility, cache layer, and server settings.
* **[`templates/index.html`](templates/index.html)**: Front-end semantic DOM, filters grid, select drawer, and composer modal structures.
* **[`static/css/style.css`](static/css/style.css)**: Core design system variables, dark themes, and responsive design systems.
* **[`static/js/app.js`](static/js/app.js)**: State controllers, event listeners, X web intent launcher, and URL character-checking algorithms.
* **[`.gitignore`](.gitignore)**: Local ignore configurations for Python virtual environments, OS metadata, and build resources.

---

## 📝 Usage Guide

1. **Browsing**: Card items are colored based on their update type (`Feature`, `Issue`, `Deprecation`, `Change`).
2. **Filtering**: Select the header navigation options or category pills to narrow down notes. Use the search input for keyword matching.
3. **Refreshing**: Click the **Refresh Feed** button in the header. The spinner will rotate while it fetches a fresh copy of the feed.
4. **Tweeting Single Notes**: Click the **Tweet** button at the bottom of any card. A modal opens with pre-loaded text, absolute URLs, and character counts.
5. **Tweeting Combined Notes**: Click any part of multiple cards to select them. A drawer slides up from the bottom. Click **Tweet Combined** to compile a bulleted digest of all selected cards.
