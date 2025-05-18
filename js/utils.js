// utils.js - Utility functions

// Get UTC date components
export function getUTCDateComponents(date) {
    return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1, // 1-based month
        day: date.getUTCDate(),
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes(),
        seconds: date.getUTCSeconds()
    };
}

export function updateStatus(message, progress) {
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');

    statusText.textContent = message;
    progressBar.style.width = `${progress}%`;
}

export function getDateComponents(date) {
    return {
        year: date.getUTCFullYear(),
        monthJS: date.getUTCMonth(), // 0-based month (JavaScript native)
        monthHuman: date.getUTCMonth() + 1, // 1-based month (human-readable)
        day: date.getUTCDate(),
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes(),
        seconds: date.getUTCSeconds()
    };
}

export function showNotice(message, type = 'info') {
    const noticeDiv = document.createElement('div');
    noticeDiv.className = type;
    noticeDiv.textContent = message;

    const content = document.querySelector('.content');
    content.insertBefore(noticeDiv, content.firstChild);

    setTimeout(() => {
        noticeDiv.remove();
    }, 5000);
}

export function parseApiDate(dateStr) {
    const [year, month, day] = dateStr.split('_').map(Number);
    // Note: month - 1 because we need to convert from 1-based to 0-based for JavaScript
    return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(date) {
    return `${date.getUTCFullYear()}_${date.getUTCMonth() + 1}_${date.getUTCDate()}`;
}

// Format a date for display (YYYY-MM-DD HH:MM:SS)
export function formatDisplayDate(date) {
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
        return new Date(timestamp * 1000).toISOString().replace('T', ' ').substr(0, 19);
    } catch {
        return 'Invalid time';
    }
}

// Validate a date string
export function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Update the timestamp display
export function updateTimestamp() {
    const now = new Date();
    const display = `${formatDisplayDate(now)} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
    document.getElementById('lastUpdate').textContent =
    `Current Date and Time (UTC): ${display}`;
}

function pad(num) {
    return String(num).padStart(2, '0');
}

export function formatZone(zone) {
    const zoneMap = {
        "Super Special Event Zone": "Mosaic",
        "Freeport I": "FP I",
        "Freeport II": "FP II",
        "Freeport III": "FP III",
        "The Nest": "Freeport",
        "Hummingbird": "Hummbird"
    };
    return zoneMap[zone] || zone;
}

export function formatEntity(entity) {
    if (!entity) return '?';

    const botMap = {
        "block - flux": "Flux mine",
        "block - iron": "Iron mine",
        "bot - zombie": "Vult Bot",
        "bot - zombie tank": "Vult Bot 2",
        "bot - zombie hunter": "Vult Yank",
        "bot - zombie boss": "Vult Boss",
        "bot - green roamer": "Green bot",
        "bot - red hunter": "Red Hunter",
        "bot - yellow rusher": "YellowRush",
        "bot - blue melee": "Blue Spike",
        "bot - red sentry": "Red Sentry",
        "bot - orange fool": "Orange Fool",
        "bot - yellow hunter": "Hunter bot",
        "bot - red sniper": "Red Sniper",
        "bot - aqua shielder": "Shield bot",
        "Yellow Mine Bot": "Mine bot",
        "The Coward": "The Coward",
        "The Shield Master": "ShieldBoss",
        "The Lazer Enthusiast": "LazerBoss"
    };

    return botMap[entity] || entity;
}
