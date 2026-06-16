// State Management
let allNotes = [];
let selectedNoteIds = new Set();
let currentFilterType = 'all';
let currentSearchQuery = '';
let currentSortOrder = 'newest';

// DOM Elements
const notesList = document.getElementById('notes-list');
const feedLoader = document.getElementById('feed-loader');
const feedError = document.getElementById('feed-error');
const errorMessage = document.getElementById('error-message');
const feedEmpty = document.getElementById('feed-empty');

const btnRefresh = document.getElementById('btn-refresh');
const btnRetry = document.getElementById('btn-error-retry');
const refreshSpinner = document.getElementById('refresh-spinner');
const lastUpdatedTime = document.getElementById('last-updated-time');

const searchInput = document.getElementById('search-input');
const btnSearchClear = document.getElementById('btn-search-clear');
const filterTypesContainer = document.getElementById('filter-types-container');
const sortSelect = document.getElementById('sort-select');

// Sidebar nav
const navAll = document.getElementById('nav-all');
const navFeatures = document.getElementById('nav-features');
const navIssues = document.getElementById('nav-issues');
const navDeprecations = document.getElementById('nav-deprecations');

// Sidebar stats
const statTotal = document.getElementById('stat-total');
const statFeatCount = document.getElementById('stat-feat-count');
const statIssueCount = document.getElementById('stat-issue-count');

// Selection Drawer
const selectionDrawer = document.getElementById('selection-drawer');
const selectionCount = document.getElementById('selection-count');
const btnClearSelection = document.getElementById('btn-clear-selection');
const btnTweetSelected = document.getElementById('btn-tweet-selected');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const btnModalClose = document.getElementById('btn-modal-close');
const btnCopyTweet = document.getElementById('btn-copy-tweet');
const btnPublishTweet = document.getElementById('btn-publish-tweet');

// Toast
const toastNotify = document.getElementById('toast-notify');
const toastText = document.getElementById('toast-text');

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes(false);
    setupEventListeners();
});

// Setup Events
function setupEventListeners() {
    // Refresh actions
    btnRefresh.addEventListener('click', () => fetchReleaseNotes(true));
    btnRetry.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.trim().toLowerCase();
        btnSearchClear.style.display = currentSearchQuery ? 'block' : 'none';
        renderNotes();
    });
    
    btnSearchClear.addEventListener('click', () => {
        searchInput.value = '';
        currentSearchQuery = '';
        btnSearchClear.style.display = 'none';
        searchInput.focus();
        renderNotes();
    });
    
    // Sorting
    sortSelect.addEventListener('change', (e) => {
        currentSortOrder = e.target.value;
        renderNotes();
    });
    
    // Type Pills Filtering
    filterTypesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            document.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
            e.target.classList.add('active');
            currentFilterType = e.target.dataset.type;
            
            // Sync with sidebar nav
            syncSidebarActiveState(currentFilterType);
            renderNotes();
        }
    });

    // Sidebar navigation clicks
    navAll.addEventListener('click', (e) => {
        e.preventDefault();
        triggerFilterType('all');
    });
    navFeatures.addEventListener('click', (e) => {
        e.preventDefault();
        triggerFilterType('Feature');
    });
    navIssues.addEventListener('click', (e) => {
        e.preventDefault();
        triggerFilterType('Issue');
    });
    navDeprecations.addEventListener('click', (e) => {
        e.preventDefault();
        triggerFilterType('Deprecation');
    });

    // Multi-Selection actions
    btnClearSelection.addEventListener('click', clearSelection);
    btnTweetSelected.addEventListener('click', openCombinedTweetModal);

    // Modal close
    btnModalClose.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Tweet text area character counting
    tweetTextarea.addEventListener('input', () => {
        updateCharCounter();
    });

    // Copy & Publish
    btnCopyTweet.addEventListener('click', copyTweetToClipboard);
    btnPublishTweet.addEventListener('click', publishTweet);
}

// Sidebar Nav active styling sync
function syncSidebarActiveState(type) {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => item.classList.remove('active'));
    if (type === 'all') navAll.classList.add('active');
    else if (type === 'Feature') navFeatures.classList.add('active');
    else if (type === 'Issue') navIssues.classList.add('active');
    else if (type === 'Deprecation') navDeprecations.classList.add('active');
}

function triggerFilterType(type) {
    currentFilterType = type;
    document.querySelectorAll('.filter-pill').forEach(pill => {
        if (pill.dataset.type === type) pill.classList.add('active');
        else pill.classList.remove('active');
    });
    syncSidebarActiveState(type);
    renderNotes();
}

// API Fetching
async function fetchReleaseNotes(forceRefresh = false) {
    showLoader(true);
    refreshSpinner.classList.add('spin');
    btnRefresh.disabled = true;
    
    try {
        const response = await fetch(`/api/notes?force_refresh=${forceRefresh}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(data.message);
        }
        
        allNotes = data.notes || [];
        lastUpdatedTime.textContent = `Last synced: ${data.updated_at}`;
        
        // Reset selections on fresh fetch
        selectedNoteIds.clear();
        updateSelectionDrawer();
        
        // Populate Sidebar stats
        updateSidebarStats();
        
        // Render
        renderNotes();
        showLoader(false);
    } catch (err) {
        console.error(err);
        showError(err.message);
    } finally {
        refreshSpinner.classList.remove('spin');
        btnRefresh.disabled = false;
    }
}

// Loader, Error, Empty State visibility helpers
function showLoader(visible) {
    if (visible) {
        feedLoader.style.display = 'flex';
        feedError.style.display = 'none';
        feedEmpty.style.display = 'none';
        notesList.style.display = 'none';
    } else {
        feedLoader.style.display = 'none';
    }
}

function showError(msg) {
    feedLoader.style.display = 'none';
    notesList.style.display = 'none';
    feedEmpty.style.display = 'none';
    
    errorMessage.textContent = msg;
    feedError.style.display = 'block';
}

function showEmpty(visible) {
    if (visible) {
        feedEmpty.style.display = 'block';
        notesList.style.display = 'none';
    } else {
        feedEmpty.style.display = 'none';
        notesList.style.display = 'flex';
    }
}

// Stats panel rendering
function updateSidebarStats() {
    statTotal.textContent = allNotes.length;
    const features = allNotes.filter(n => n.type === 'Feature').length;
    const issues = allNotes.filter(n => n.type === 'Issue').length;
    
    statFeatCount.textContent = features;
    statIssueCount.textContent = issues;
}

// Filter, Sort, Search, and Render Cards
function renderNotes() {
    // 1. Filter
    let filtered = allNotes;
    if (currentFilterType !== 'all') {
        filtered = filtered.filter(n => n.type === currentFilterType);
    }
    
    // 2. Search
    if (currentSearchQuery) {
        filtered = filtered.filter(n => {
            return n.date.toLowerCase().includes(currentSearchQuery) ||
                   n.type.toLowerCase().includes(currentSearchQuery) ||
                   n.text_content.toLowerCase().includes(currentSearchQuery);
        });
    }
    
    // 3. Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.iso_date || a.date);
        const dateB = new Date(b.iso_date || b.date);
        
        if (currentSortOrder === 'newest') {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    // Check empty
    if (filtered.length === 0) {
        showEmpty(true);
        return;
    }
    
    showEmpty(false);
    notesList.innerHTML = '';
    
    filtered.forEach(note => {
        const isSelected = selectedNoteIds.has(note.id);
        const typeClass = (note.type || '').toLowerCase();
        
        const card = document.createElement('article');
        card.className = `note-card ${isSelected ? 'selected' : ''}`;
        card.id = `card-${note.id}`;
        card.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        
        card.innerHTML = `
            <div class="card-header-details">
                <div class="header-left-meta">
                    <div class="note-checkbox" title="Select this update">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <span class="note-date">
                        <i class="fa-regular fa-calendar-days"></i>
                        <span>${note.date}</span>
                    </span>
                </div>
                <span class="type-badge ${typeClass}">${note.type}</span>
            </div>
            
            <div class="card-content">
                ${note.html_content}
            </div>
            
            <div class="card-actions">
                <button class="btn-card-action action-copy" data-id="${note.id}" title="Copy plaintext note">
                    <i class="fa-regular fa-copy"></i>
                    <span>Copy Text</span>
                </button>
                <button class="btn-card-action action-tweet" data-id="${note.id}" title="Compose a Tweet about this update">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Handle click card to toggle selection
        card.addEventListener('click', (e) => {
            // Prevent selection if clicking on links or buttons
            if (e.target.closest('a') || e.target.closest('.btn-card-action')) {
                return;
            }
            toggleSelection(note.id);
        });
        
        // Wire copy button
        card.querySelector('.action-copy').addEventListener('click', (e) => {
            e.stopPropagation();
            copyTextContent(note.text_content);
        });
        
        // Wire tweet button
        card.querySelector('.action-tweet').addEventListener('click', (e) => {
            e.stopPropagation();
            openSingleTweetModal(note);
        });
        
        notesList.appendChild(card);
    });
}

// Selection Logic
function toggleSelection(noteId) {
    if (selectedNoteIds.has(noteId)) {
        selectedNoteIds.delete(noteId);
        document.getElementById(`card-${noteId}`)?.classList.remove('selected');
    } else {
        selectedNoteIds.add(noteId);
        document.getElementById(`card-${noteId}`)?.classList.add('selected');
    }
    updateSelectionDrawer();
}

function clearSelection() {
    selectedNoteIds.clear();
    document.querySelectorAll('.note-card').forEach(card => card.classList.remove('selected'));
    updateSelectionDrawer();
}

function updateSelectionDrawer() {
    const count = selectedNoteIds.size;
    selectionCount.textContent = `${count} update${count !== 1 ? 's' : ''} selected`;
    
    if (count > 0) {
        selectionDrawer.classList.add('show');
    } else {
        selectionDrawer.classList.remove('show');
    }
}

// Twitter Length Estimator (URLs count as 23 characters)
function calculateTweetLength(text) {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    let length = text.length;
    
    urls.forEach(url => {
        length = length - url.length + 23;
    });
    
    return length;
}

// Tweet Draft Generation & Automatic Truncation
function openSingleTweetModal(note) {
    const header = `📢 [${note.type}] BigQuery Update (${note.date}):\n`;
    const footer = `\n\nRead details: ${note.url}\n#BigQuery #GoogleCloud`;
    
    // Generate draft body
    let body = note.text_content;
    
    // Character checks
    const targetLimit = 280;
    const headerLen = calculateTweetLength(header);
    const footerLen = calculateTweetLength(footer);
    const maxBodyLen = targetLimit - headerLen - footerLen;
    
    if (calculateTweetLength(header + body + footer) > targetLimit) {
        // Truncate the body text and add ellipsis
        body = body.slice(0, maxBodyLen - 3) + '...';
    }
    
    const fullTweet = header + body + footer;
    
    tweetTextarea.value = fullTweet;
    openTweetModal();
}

function openCombinedTweetModal() {
    if (selectedNoteIds.size === 0) return;
    
    const selectedNotes = allNotes.filter(n => selectedNoteIds.has(n.id));
    
    const header = `📢 BigQuery Releases Summary:\n`;
    const footer = `\n\nFull release notes: https://cloud.google.com/bigquery/docs/release-notes\n#BigQuery #GoogleCloud`;
    
    let body = '';
    
    // Build bullet points
    selectedNotes.forEach(note => {
        // Take a condensed snippet of the update
        let textSnippet = note.text_content;
        // Strip out specific URL inserts for the overview bullet points to save space
        textSnippet = textSnippet.replace(/\s*\(https?:\/\/[^\)]+\)/g, '');
        
        if (textSnippet.length > 70) {
            textSnippet = textSnippet.slice(0, 67) + '...';
        }
        
        body += `• [${note.type}] ${textSnippet}\n`;
    });
    
    const targetLimit = 280;
    const headerLen = calculateTweetLength(header);
    const footerLen = calculateTweetLength(footer);
    const maxBodyLen = targetLimit - headerLen - footerLen;
    
    if (calculateTweetLength(header + body + footer) > targetLimit) {
        // If bullet list exceeds, slice it line by line or character by character
        body = body.slice(0, maxBodyLen - 3) + '...';
    }
    
    const fullTweet = header + body + footer;
    tweetTextarea.value = fullTweet;
    openTweetModal();
}

// Modal Handlers
function openTweetModal() {
    tweetModal.classList.add('show');
    updateCharCounter();
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.remove('show');
}

function updateCharCounter() {
    const text = tweetTextarea.value;
    const length = calculateTweetLength(text);
    
    charCounter.textContent = `${length} / 280`;
    
    charCounter.classList.remove('warning', 'exceeded');
    if (length > 250 && length <= 280) {
        charCounter.classList.add('warning');
    } else if (length > 280) {
        charCounter.classList.add('exceeded');
    }
}

// Share Actions
function publishTweet() {
    const text = tweetTextarea.value;
    const tweetUrl = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank');
}

function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    copyTextContent(text, "Tweet copied to clipboard!");
}

function copyTextContent(text, successMsg = "Copied to clipboard!") {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast("Failed to copy text");
    });
}

// Toast notification helper
let toastTimeout;
function showToast(msg) {
    toastText.textContent = msg;
    toastNotify.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastNotify.classList.remove('show');
    }, 3000);
}
