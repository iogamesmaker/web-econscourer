// Constants
const PAGE_SIZE = 50;
const CACHE_SIZE = 5; // Number of days to keep in memory

// Cache for data
const dataCache = new Map();

// Current state
let currentDate = new Date();
let currentTab = 'summary';
let currentPage = 1;

// Initialize the application
async function init() {
    setupEventListeners();
    await loadLatestData();
    updateDatePicker();
}

// Set up event listeners
function setupEventListeners() {
    // Date navigation
    document.getElementById('prev-day').addEventListener('click', () => navigateDay(-1));
    document.getElementById('next-day').addEventListener('click', () => navigateDay(1));
    document.getElementById('date-picker').addEventListener('change', handleDatePick);
    document.getElementById('go-to-latest').addEventListener('click', loadLatestData);

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Search and filters
    document.getElementById('ships-search').addEventListener('input', debounce(handleShipsSearch, 300));
    document.getElementById('ships-sort').addEventListener('change', handleShipsSort);
    document.getElementById('log-search').addEventListener('input', debounce(handleLogSearch, 300));
    document.getElementById('log-type-filter').addEventListener('change', handleLogFilter);
}

// Load data for a specific date
async function loadData(date) {
    const dateStr = formatDate(date);

    // Check cache first
    if (dataCache.has(dateStr)) {
        return dataCache.get(dateStr);
    }

    showLoading(true);

    try {
        // Load summary.json first as it's smaller
        const summaryResponse = await fetch(`data/${dateStr}/summary.json`);
        if (!summaryResponse.ok) throw new Error('Data not available');
        const summary = await summaryResponse.json();

        // Store in cache and clean old entries
        dataCache.set(dateStr, { summary });
        cleanCache();

        showLoading(false);
        return { summary };
    } catch (error) {
        showLoading(false);
        showError(`Failed to load data for ${dateStr}`);
        throw error;
    }
}

// Load ships data on demand
async function loadShipsData(date) {
    const dateStr = formatDate(date);
    const cached = dataCache.get(dateStr);

    if (cached && cached.ships) {
        return cached.ships;
    }

    showLoading(true);

    try {
        const response = await fetch(`data/${dateStr}/ships.json.gz`);
        if (!response.ok) throw new Error('Ships data not available');

        const ships = await response.json();

        // Update cache
        if (cached) {
            cached.ships = ships;
        } else {
            dataCache.set(dateStr, { ships });
        }

        showLoading(false);
        return ships;
    } catch (error) {
        showLoading(false);
        showError('Failed to load ships data');
        throw error;
    }
}

// Load log data on demand with pagination
async function loadLogData(date, page = 1) {
    const dateStr = formatDate(date);
    const cached = dataCache.get(dateStr);

    if (cached && cached.log && cached.log[page]) {
        return cached.log[page];
    }

    showLoading(true);

    try {
        const response = await fetch(`data/${dateStr}/log.json.gz`);
        if (!response.ok) throw new Error('Log data not available');

        const log = await response.json();

        // Paginate the log data
        const paginatedLog = {};
        const totalPages = Math.ceil(log.length / PAGE_SIZE);

        for (let i = 0; i < totalPages; i++) {
            const start = i * PAGE_SIZE;
            paginatedLog[i + 1] = log.slice(start, start + PAGE_SIZE);
        }

        // Update cache
        if (cached) {
            cached.log = paginatedLog;
        } else {
            dataCache.set(dateStr, { log: paginatedLog });
        }

        showLoading(false);
        return paginatedLog[page];
    } catch (error) {
        showLoading(false);
        showError('Failed to load log data');
        throw error;
    }
}

// Clean old entries from cache
function cleanCache() {
    if (dataCache.size > CACHE_SIZE) {
        const oldestKey = Array.from(dataCache.keys())[0];
        dataCache.delete(oldestKey);
    }
}

// UI update functions
function updateSummaryView(summary) {
    const container = document.getElementById('summary-data');
    // Render summary data...
}

function updateShipsView(ships) {
    const container = document.getElementById('ships-data');
    // Render ships with virtual scrolling...
}

function updateLogView(logEntries) {
    const container = document.getElementById('log-data');
    // Render log entries with pagination...
}

// Helper functions
function formatDate(date) {
    return `${date.getUTCFullYear()}_${date.getUTCMonth() + 1}_${date.getUTCDate()}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.getElementById('data-view').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);

// Export functions for testing
export {
    loadData,
    loadShipsData,
    loadLogData,
    formatDate,
        cleanCache
};
