// utils.js - Utility functions

export function updateStatus(message, progress) {
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');

    statusText.textContent = message;
    progressBar.style.width = `${progress}%`;
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

export function formatDate(date) {
    return `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}`;
}

export function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
        return new Date(timestamp * 1000).toISOString().replace('T', ' ').substr(0, 19);
    } catch {
        return 'Invalid time';
    }
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
