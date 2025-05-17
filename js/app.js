// Import modules
import { STATE } from './state.js';
import { ITEM_DB } from './constants.js';
import {
    updateStatus,
    showNotice,
    formatDate,
        formatTimestamp,
            formatZone,
                formatEntity
} from './utils.js';

const STATE = {
    rawData: [],
    filteredData: [],
    shipNames: {},
    settings: {
        fontSize: 12,
        wrapText: false,
        showBots: false,
        useShipNames: false
    },
    downloading: false,
    shipLoadingInProgress: false
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    loadSettings();
    setupEventListeners();
    setInitialDates();
});

function initializeUI() {
    // Initialize item filter suggestions
    const itemFilter = document.getElementById('itemFilter');
    const suggestions = document.getElementById('itemSuggestions');

    itemFilter.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        if (!value) {
            suggestions.style.display = 'none';
            return;
        }

        const matches = ITEM_DB.filter(item =>
        `${item[0]}: ${item[1]}`.toLowerCase().includes(value)
        );

        if (matches.length > 0) {
            suggestions.innerHTML = matches
            .map(item => `<div data-id="${item[0]}">${item[0]}: ${item[1]}</div>`)
            .join('');
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    });

    suggestions.addEventListener('click', (e) => {
        const target = e.target.closest('div');
        if (target) {
            itemFilter.value = `${target.dataset.id}: ${target.textContent.split(': ')[1]}`;
            suggestions.style.display = 'none';
            updateDisplay();
        }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestions.style.display = 'none';
        }
    });
}

function setInitialDates() {
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    // Set minimum date to 2022-11-23
    const minDate = '2022-11-23';
    startDate.min = minDate;
    endDate.min = minDate;

    // Set maximum date to today
    const today = new Date().toISOString().split('T')[0];
    startDate.max = today;
    endDate.max = today;

    // Set default values
    startDate.value = minDate;
    endDate.value = today;
}

async function loadData() {
    if (STATE.downloading) {
        showNotice('Data is already being loaded', 'warning');
        return;
    }

    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);

    if (!validateDateRange(startDate, endDate)) {
        return;
    }

    STATE.downloading = true;
    updateStatus('Starting data download...', 0);

    try {
        const dates = getDatesInRange(startDate, endDate);
        const totalDates = dates.length;
        let processedDates = 0;

        STATE.rawData = [];

        for (const date of dates) {
            const dateStr = formatDate(date);
            await loadDateData(dateStr);

            processedDates++;
            updateStatus(`Processing ${dateStr} (${processedDates}/${totalDates})`, (processedDates / totalDates) * 100);
        }

        updateStatus(`Loaded ${STATE.rawData.length} transactions`, 100);
        showNotice(`Successfully loaded ${STATE.rawData.length} transactions`, 'success');

        STATE.filteredData = STATE.rawData;
        updateDisplay();

    } catch (error) {
        console.error('Error loading data:', error);
        showNotice(`Failed to load data: ${error.message}`, 'error');
        updateStatus('Data loading failed', 0);
    } finally {
        STATE.downloading = false;
    }
}

async function loadDateData(dateStr) {
    try {
        const baseUrl = `https://pub.drednot.io/prod/econ/${dateStr}`;

        // Load log data
        const logResponse = await fetch(`${baseUrl}/log.json.gz`);
        if (!logResponse.ok) {
            if (logResponse.status === 404) {
                console.log(`No data available for ${dateStr}`);
                return;
            }
            throw new Error(`HTTP error! status: ${logResponse.status}`);
        }

        const logBuffer = await logResponse.arrayBuffer();
        const logData = await decompressGzip(logBuffer);
        const transactions = JSON.parse(logData);

        // Apply initial filtering
        const filteredTransactions = transactions.filter(entry => {
            if (!entry || typeof entry !== 'object') return false;

            if (STATE.settings.showBots) {
                const src = String(entry.src || '');
                const dst = String(entry.dst || '');
                if (!(src.startsWith('{') && dst.startsWith('{'))) {
                    return false;
                }
            }

            return true;
        });

        STATE.rawData.push(...filteredTransactions);

    } catch (error) {
        console.error(`Error loading data for ${dateStr}:`, error);
    }
}

async function decompressGzip(buffer) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Blob([buffer]).stream().pipeThrough(ds);
    const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();
    return new TextDecoder().decode(decompressedBuffer);
}

function validateDateRange(startDate, endDate) {
    const minDate = new Date('2022-11-23');
    const maxDate = new Date();

    if (startDate < minDate || endDate < minDate) {
        showNotice('The earliest possible date is 2022-11-23', 'error');
        return false;
    }

    if (startDate > maxDate || endDate > maxDate) {
        showNotice('Cannot select future dates', 'error');
        return false;
    }

    if (startDate > endDate) {
        // Swap dates
        const temp = document.getElementById('startDate').value;
        document.getElementById('startDate').value = document.getElementById('endDate').value;
        document.getElementById('endDate').value = temp;
        return true;
    }

    return true;
}

function getDatesInRange(start, end) {
    const dates = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

function formatDate(date) {
    return `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}`;
}

function updateStatus(message, progress) {
    const statusText = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');

    statusText.textContent = message;
    progressBar.style.width = `${progress}%`;
}

function showNotice(message, type = 'info') {
    const noticeDiv = document.createElement('div');
    noticeDiv.className = type;
    noticeDiv.textContent = message;

    const content = document.querySelector('.content');
    content.insertBefore(noticeDiv, content.firstChild);

    setTimeout(() => {
        noticeDiv.remove();
    }, 5000);
}

function updateDisplay() {
    if (STATE.downloading) {
        return;
    }

    const dataOutput = document.getElementById('dataOutput');
    dataOutput.innerHTML = '';

    if (!STATE.filteredData.length) {
        dataOutput.textContent = 'No data to display';
        return;
    }

    // Apply filters
    const itemFilter = document.getElementById('itemFilter').value;
    const sourceFilter = document.getElementById('sourceFilter').value.toLowerCase();
    const destFilter = document.getElementById('destFilter').value.toLowerCase();

    let itemId = null;
    if (itemFilter) {
        try {
            itemId = parseInt(itemFilter.split(':')[0]);
        } catch (e) {
            console.error('Failed to parse item ID:', e);
        }
    }

    const filtered = STATE.filteredData.filter(entry => {
        if (itemId !== null && entry.item !== itemId) return false;

        if (sourceFilter) {
            const src = String(entry.src || '').toLowerCase();
            if (!src.includes(sourceFilter)) return false;
        }

        if (destFilter) {
            const dst = String(entry.dst || '').toLowerCase();
            if (!dst.includes(destFilter)) return false;
        }

        return true;
    });

    // Format and display data
    const formattedData = formatTransactions(filtered);
    dataOutput.innerHTML = formattedData;
}

function formatTransactions(transactions) {
    let output = [];

    // Group transactions by item
    const itemGroups = {};
    transactions.forEach(trans => {
        if (!itemGroups[trans.item]) {
            itemGroups[trans.item] = [];
        }
        itemGroups[trans.item].push(trans);
    });

    // Format each group
    for (const [itemId, group] of Object.entries(itemGroups)) {
        const itemName = ITEM_DB.find(item => item[0] === parseInt(itemId))?.[1] || 'Unknown Item';
        output.push(`\n=== ${itemName} ===\n`);

        group.sort((a, b) => (b.time || 0) - (a.time || 0));

        group.forEach((trans, index) => {
            const time = formatTimestamp(trans.time);
            const zone = formatZone(trans.zone || 'Unknown zone');
            const source = formatEntity(trans.src);
            const dest = formatEntity(trans.dst);
            const count = trans.count || 1;

            const line = `[${time}] [${zone}] || ${count}x from ${source} to ${dest}`;
            output.push(`<div class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">${line}</div>`);
        });
    }

    return output.join('\n');
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
        return new Date(timestamp * 1000).toISOString().replace('T', ' ').substr(0, 19);
    } catch {
        return 'Invalid time';
    }
}

function formatZone(zone) {
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

function formatEntity(entity) {
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

    const formatted = botMap[entity] || entity;

    if (STATE.settings.useShipNames && formatted.startsWith('{')) {
        const shipId = formatted.slice(1, -1);
        const shipName = STATE.shipNames[shipId]?.current_name;
        return shipName ? `${formatted} (${shipName})` : formatted;
    }

    return formatted;
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('loadData').addEventListener('click', loadData);
    document.getElementById('refreshBtn').addEventListener('click', updateDisplay);
    document.getElementById('showBots').addEventListener('change', () => {
        STATE.settings.showBots = document.getElementById('showBots').checked;
        updateDisplay();
    });
    document.getElementById('useShipNames').addEventListener('change', toggleShipNames);

    // Add filter input listeners
    ['itemFilter', 'sourceFilter', 'destFilter'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            if (!STATE.downloading) {
                updateDisplay();
            }
        });
    });
}

function toggleShipNames() {
    STATE.settings.useShipNames = document.getElementById('useShipNames').checked;
    if (STATE.settings.useShipNames && Object.keys(STATE.shipNames).length === 0) {
        loadShipNames();
    } else {
        updateDisplay();
    }
}

async function loadShipNames() {
    if (STATE.shipLoadingInProgress) {
        showNotice('Ship names are already being loaded', 'warning');
        return;
    }

    STATE.shipLoadingInProgress = true;
    updateStatus('Loading ship names...', 0);

    try {
        const startDate = new Date('2022-11-23');
        const endDate = new Date();
        const dates = getDatesInRange(startDate, endDate);
        const totalDates = dates.length;
        let processedDates = 0;

        for (const date of dates) {
            const dateStr = formatDate(date);
            await loadShipData(dateStr);

            processedDates++;
            updateStatus(`Loading ship data ${dateStr} (${processedDates}/${totalDates})`, (processedDates / totalDates) * 100);
        }

        updateStatus('Ship names loaded', 100);
        updateDisplay();

    } catch (error) {
        console.error('Error loading ship names:', error);
        showNotice('Failed to load ship names', 'error');
        STATE.settings.useShipNames = false;
        document.getElementById('useShipNames').checked = false;
    } finally {
        STATE.shipLoadingInProgress = false;
    }
}

async function loadShipData(dateStr) {
    try {
        const response = await fetch(`https://pub.drednot.io/prod/econ/${dateStr}/ships.json.gz`);
        if (!response.ok) {
            if (response.status === 404) return;
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        const data = await decompressGzip(buffer);
        const ships = JSON.parse(data);

        ships.forEach(ship => {
            const hexCode = ship.hex_code?.toUpperCase().replace(/[{}]/g, '');
            if (!hexCode) return;

            const name = ship.name?.trim() || '';

            if (!STATE.shipNames[hexCode]) {
                STATE.shipNames[hexCode] = {
                    current_name: name,
                    name_history: []
                };
            }

            STATE.shipNames[hexCode].name_history.push([dateStr, name]);
            STATE.shipNames[hexCode].current_name = name;
        });

    } catch (error) {
        console.error(`Error loading ship data for ${dateStr}:`, error);
    }
}
