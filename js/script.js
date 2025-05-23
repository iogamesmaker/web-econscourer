class DrednotDataViewer {
    constructor() {
        this.corsProxy = 'https://cors-anywhere.herokuapp.com/';
        this.baseUrl = 'https://pub.drednot.io/prod/econ';
        this.data = {
            summaries: [],
            ships: [],
            logs: [],
            itemSchema: null,
            botDrops: null
        };

        // Add these new properties
        this.chunkSize = 1000; // Number of logs to render at once
        this.currentChunk = 0;
        this.filteredLogs = []; // Store filtered results
        this.isFiltering = false;
        this.virtualScrolling = {
            rowHeight: 40, // Estimated height of each row in pixels
            viewportHeight: 600, // Default viewport height
            totalRows: 0,
            visibleRows: 0,
            startIndex: 0
        };
        this.data = {
            summaries: [],
            ships: [],
            logs: [],
            logsMap: new Map(),
            itemSchema: null,
            botDrops: null
        };
        // Add these new properties
        this.maxChunkSize = 1024 * 1024 * 64; // 64MB chunks
        this.currentOffset = 0;
        this.isProcessing = false;
        this.corsProxies = [
            'https://cors-anywhere.herokuapp.com/',
            'https://api.allorigins.win/raw?url=',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.currentProxyIndex = 0;
        this.retriesPerProxy = 3;
        this.cacheVersion = '1';
        this.maxConcurrentDownloads = 7;
        this.currentUTC = new Date();
        this.cacheEnabled = true;

        this.showCurrentTime();
        this.initializeElements();
        this.addEventListeners();
        this.initializeDB().then(() => {
            this.initializeCacheStatus();
        });
        this.setDefaultDates();
        this.showCorsWarning();
    }

    async initializeDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ShipLogsDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('shipLogs')) {
                    db.createObjectStore('shipLogs', { keyPath: 'date' });
                }
            };
        });
    }

    async getFromCache(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shipLogs'], 'readonly');
            const store = transaction.objectStore('shipLogs');
            const request = store.get(date);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }
        return { used: 0, quota: 0 };
    }

    async getCachedDaysCount() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shipLogs'], 'readonly');
            const store = transaction.objectStore('shipLogs');
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    initializeCacheStatus() {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'cache-status';
        statusDiv.innerHTML = `
            <div class="status-header">
                <h3>Data Status</h3>
                <button class="refresh-cache">Refresh All Data</button>
                <button class="clear-cache">Clear Cache</button>
            </div>
            <div class="status-info">
                <p>Current UTC: ${this.formatDateTime(this.currentUTC)}</p>
                <p>Cached Days: <span class="cached-days">Calculating...</span></p>
                <p>Storage Used: <span class="storage-used">Calculating...</span></p>
            </div>
            <div class="cache-progress hidden">
                <div class="progress-bar"></div>
                <div class="progress-text"></div>
            </div>
        `;

        document.querySelector('.controls').appendChild(statusDiv);

        // Add event listeners
        statusDiv.querySelector('.refresh-cache').addEventListener('click', () => this.refreshCache());
        statusDiv.querySelector('.clear-cache').addEventListener('click', () => this.clearAllCache());

        // Update cache stats
        this.updateCacheStats();
    }

    updateCacheStats() {
        const cachedDays = this.getCachedDaysCount();
        const storageUsed = this.getStorageUsage();

        document.querySelector('.cached-days').textContent = `${cachedDays} days`;
        document.querySelector('.storage-used').textContent =
        `${(storageUsed.used / (1024 * 1024)).toFixed(2)}MB / ${(storageUsed.quota / (1024 * 1024)).toFixed(2)}MB`;
    }

    getStorageUsage() {
        let used = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                used += localStorage[key].length * 2; // approximate size in bytes
            }
        }
        return {
            used,
            quota: 5 * 1024 * 1024 // 5MB default quota
        };
    }

    getCachedDaysCount() {
        return Object.keys(localStorage)
        .filter(key => key.startsWith('ships_'))
        .length;
    }

    formatDateForUrl(year, month, day) {
        return `${Number(year)}_${Number(month)}_${Number(day)}`;
    }

    showCurrentTime() {
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'current-time';
        timeDisplay.innerHTML = `
        <p>Current UTC: ${this.formatDateTime(this.currentUTC)}</p>
        `;
        document.querySelector('.controls').appendChild(timeDisplay);
    }

    clearAllCache() {
        if (!confirm('This will delete all cached ship data. Continue?')) return;

        const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('ships_'));
        keys.forEach(key => localStorage.removeItem(key));

        this.updateCacheStats();
    }

    formatDateTime(date) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    async saveToCache(date, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shipLogs'], 'readwrite');
            const store = transaction.objectStore('shipLogs');
            const request = store.put({ date, data });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    showCorsWarning() {
        const warning = document.createElement('div');
        warning.className = 'cors-warning';
        warning.innerHTML = `
        <div class="warning-content">
        <h3>Dumb thing</h3>
        <p>To use this shit thing, you need to enable CORS access, for some reason CORS is a thing and I fucking hate it.</p>
        <ol>
        <li>Click <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">here</a> to open the thing</li>
        <li>Click the "Request temporary access" button</li>
        <li>Return here and refresh the page</li>
        </ol>
        <button class="warning-close">(already) done.</button>
        </div>
        `;
        document.body.appendChild(warning);

        warning.querySelector('.warning-close').addEventListener('click', () => {
            warning.remove();
        });
    }

    async fetchWithRetry(url, proxyUrl, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(proxyUrl + url, {
                    method: 'GET',
                    headers: {
                        'Origin': window.location.origin,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (response.ok) {
                    return response;
                }

                if (response.status === 404) {
                    return null;
                }

                // If we get here, it's an error but not 404
                throw new Error(`HTTP error! status: ${response.status}`);
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
        }
    }

    async loadShipsWithCache(year, month, day) {
        const date = `${year}-${month}-${day}`;
        const cached = await this.getFromCache(date);

        if (cached) {
            cached.data.forEach(ship => this.processShipData(ship, date));
            return;
        }

        const dateStr = this.formatDateForUrl(year, month, day);
        const url = `${this.baseUrl}/${dateStr}/ships.json.gz`;

        const response = await this.fetchWithCors(url);
        if (!response) return;

        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        const ships = JSON.parse(decompressed);

        // Cache the data
        await this.saveToCache(date, ships);

        // Process the ships
        ships.forEach(ship => this.processShipData(ship, date));
    }

    async refreshCache() {
        if (!confirm('This will redownload all ship data. Continue?')) return;

        const cacheProgress = document.querySelector('.cache-progress');
        cacheProgress.classList.remove('hidden');

        // Clear existing ship data but keep other settings
        const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('ships_'));
        keys.forEach(key => localStorage.removeItem(key));

        // Reload all data
        await this.loadData();
    }

    async clearAllCache() {
        if (!confirm('This will delete all cached ship data. Continue?')) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['shipLogs'], 'readwrite');
            const store = transaction.objectStore('shipLogs');
            const request = store.clear();

            request.onsuccess = () => {
                this.updateCacheStats();
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async updateCacheStats() {
        const cachedDays = await this.getCachedDaysCount();
        const storageUsed = await this.getStorageUsage();

        document.querySelector('.cached-days').textContent = `${cachedDays} days`;
        document.querySelector('.storage-used').textContent =
        `${(storageUsed.used / (1024 * 1024)).toFixed(2)}MB / ${(storageUsed.quota / (1024 * 1024)).toFixed(2)}MB`;
    }

    async fetchWithCors(url) {
        for (let i = 0; i < this.corsProxies.length; i++) {
            try {
                const proxyUrl = this.corsProxies[this.currentProxyIndex];
                const response = await this.fetchWithRetry(url, proxyUrl);
                return response;
            } catch (error) {
                console.warn(`Proxy ${this.corsProxies[this.currentProxyIndex]} failed:`, error);
                // Try next proxy
                this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;

                if (i === this.corsProxies.length - 1) {
                    throw error;
                }
            }
        }
    }

    initializeElements() {
        this.elements = {
            startDate: document.getElementById('startDate'),
            endDate: document.getElementById('endDate'),
            loadButton: document.getElementById('loadData'),
            loading: document.getElementById('loading'),
            loadingProgress: document.querySelector('.loading-progress'),
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            shipSearch: document.getElementById('shipSearch'),
            logSearch: document.getElementById('logSearch'),
            itemSearch: document.getElementById('itemSearch'),
            dateRangeInfo: document.querySelector('.date-range-info')
        };
    }

    addEventListeners() {
        this.elements.loadButton.addEventListener('click', () => this.loadData());

        this.elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        this.elements.shipSearch.addEventListener('input', (e) => this.filterShips(e.target.value));
        this.elements.logSearch.addEventListener('input', (e) => this.filterLogs(e.target.value));
        this.elements.itemSearch.addEventListener('input', (e) => this.filterItems(e.target.value));

        // Add date validation
        this.elements.startDate.addEventListener('change', () => this.validateDates());
        this.elements.endDate.addEventListener('change', () => this.validateDates());
    }

    showCorsError() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'cors-error modal';
        errorDiv.innerHTML = `
        <div class="modal-content">
        <h3>⚠️ CORS Access Required</h3>
        <p>Please follow these steps:</p>
        <ol>
        <li>Click <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">this link</a> to open CORS Anywhere</li>
        <li>Click the "Request temporary access" button</li>
        <li>Return here and click "Try Again"</li>
        </ol>
        <button class="try-again-btn">Try Again</button>
        </div>
        `;
        document.body.appendChild(errorDiv);

        errorDiv.querySelector('.try-again-btn').addEventListener('click', () => {
            errorDiv.remove();
            this.loadData();
        });
    }

    setDefaultDates() {
        const now = this.currentUTC;
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 2); // Data available up to 2 days ago

        const minDate = '2022-11-23';
        const maxDate = this.formatDate(yesterday);

        this.elements.startDate.min = minDate;
        this.elements.endDate.min = minDate;
        this.elements.startDate.max = maxDate;
        this.elements.endDate.max = maxDate;

        // Set default to last 7 days or up to min date
        const weekAgo = new Date(yesterday);
        weekAgo.setDate(yesterday.getDate() - 6);
        const startDate = new Date(Math.max(new Date(minDate), weekAgo));

        this.elements.startDate.value = this.formatDate(startDate);
        this.elements.endDate.value = this.formatDate(yesterday);
    }

    validateDates() {
        const start = new Date(this.elements.startDate.value);
        const end = new Date(this.elements.endDate.value);
        const minDate = new Date('2022-11-23');
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate()); // Data is available up to today.

        if (start < minDate) {
            this.elements.startDate.value = '2022-11-23';
        }
        if (start > maxDate) {
            this.elements.startDate.value = this.formatDate(maxDate);
        }
        if (end < start) {
            this.elements.endDate.value = this.elements.startDate.value;
        }
        if (end > maxDate) {
            this.elements.endDate.value = this.formatDate(maxDate);
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    showErrors(errors) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.innerHTML = `
            <h3>⚠️ Warnings (${errors.length})</h3>
            <p>Some data could not be loaded. The displayed information may be incomplete.</p>
            <div class="error-details" style="max-height: 200px; overflow-y: auto;">
                <ul>
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;

        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        document.querySelector('.data-content').insertBefore(
            errorContainer,
            document.querySelector('.data-content').firstChild
        );
    }

    clearData() {
        this.data.summaries = [];
        this.data.ships = [];
        this.data.logs = [];
    }

    processShipData(ship, date) {
        if (!this.data.shipsHistory.has(ship.hex_code)) {
            this.data.shipsHistory.set(ship.hex_code, []);
        }

        // Convert item IDs to names
        const namedItems = {};
        for (const [itemId, count] of Object.entries(ship.items)) {
            const itemName = this.getItemName(parseInt(itemId));
            namedItems[itemName] = count;
        }

        this.data.shipsHistory.get(ship.hex_code).push({
            date,
            name: ship.name.trim(),
            color: ship.color,
            items: namedItems
        });
    }

    updateDetailedProgress(completed, total, currentDate, isError = false) {
        const progressBar = this.elements.loadingProgress;
        const percentage = (completed / total) * 100;

        if (!progressBar.querySelector('.loading-progress-bar')) {
            progressBar.innerHTML = `
                <div class="loading-progress-bar"></div>
                <div class="loading-details"></div>
            `;
        }

        progressBar.querySelector('.loading-progress-bar').style.width = `${percentage}%`;
        progressBar.querySelector('.loading-details').innerHTML = `
            <div class="progress-text">
                Loading: ${completed}/${total} (${percentage.toFixed(1)}%)
                <br>
                Current: ${currentDate} ${isError ? '❌' : '✓'}
            </div>
        `;
    }

    async loadShipsWithCache(year, month, day) {
        const cacheKey = `ships_${year}_${month}_${day}_v${this.cacheVersion}`;

        // Try to get from cache first
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            const age = (Date.now() - timestamp) / (1000 * 60 * 60); // age in hours
            // Process cached data
            data.forEach(ship => this.processShipData(ship, `${year}-${month}-${day}`));
            return;
        }

        // If not in cache or expired, download
        const dateStr = this.formatDateForUrl(year, month, day);
        const url = `${this.baseUrl}/${dateStr}/ships.json.gz`;
        const response = await this.fetchWithCors(url);

        if (!response) return;

        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        const ships = JSON.parse(decompressed);

        // Cache the data
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                data: ships,
                timestamp: Date.now()
            }));
        } catch (e) {
            // If localStorage is full, clear old entries
            if (e.name === 'QuotaExceededError') {
                this.clearOldCache();
            }
        }

        // Process the ships
        ships.forEach(ship => this.processShipData(ship, `${year}-${month}-${day}`));
    }

    clearOldCache() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('ships_')) {
                keys.push(key);
            }
        }

        // Sort by timestamp and remove oldest entries until we're under quota
        keys.sort((a, b) => {
            const aData = JSON.parse(localStorage.getItem(a));
            const bData = JSON.parse(localStorage.getItem(b));
            return bData.timestamp - aData.timestamp;
        });

        // Remove oldest 20% of entries
        const toRemove = Math.ceil(keys.length * 0.2);
        keys.slice(-toRemove).forEach(key => localStorage.removeItem(key));
    }

    async loadData() {
        this.showLoading(true);
        this.clearData();

        try {
            // Load static data first
            await Promise.all([
                this.loadItemSchema(),
                              this.loadBotDrops()
            ]);

            const startDate = new Date('2022-11-23');
            const endDate = this.currentUTC;
            const dateRange = this.getDateRange(startDate, endDate);

            // Initialize ships history storage
            this.data.shipsHistory = new Map();

            // First, load all cached data
            let uncachedDates = [];
            for (const date of dateRange) {
                const cached = await this.getFromCache(date);
                if (cached) {
                    cached.data.forEach(ship => this.processShipData(ship, date));
                } else {
                    uncachedDates.push(date);
                }
            }

            // Then download any missing data
            if (uncachedDates.length > 0) {
                const total = uncachedDates.length;
                let completed = 0;

                while (uncachedDates.length > 0) {
                    const batch = uncachedDates.splice(0, this.maxConcurrentDownloads);
                    const promises = batch.map(date => {
                        const [year, month, day] = date.split('-');
                        return this.loadShipsWithCache(year, month, day)
                        .then(() => {
                            completed++;
                            this.updateDetailedProgress(completed, total, date);
                        })
                        .catch(error => {
                            console.error(`Failed to load ${date}:`, error);
                            completed++;
                            this.updateDetailedProgress(completed, total, date, true);
                            return Promise.reject(error);
                        });
                    });

                    await Promise.allSettled(promises);
                }
            }

            this.updateUI();
            await this.updateCacheStats();

        } catch (error) {
            console.error('Error loading data:', error);
            this.showErrors([error.message]);
        } finally {
            this.showLoading(false);
        }
    }

    getDateRange(startDate, endDate) {
        const dates = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            dates.push(this.formatDate(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    async loadSummary(year, month, day) {
        const dateStr = this.formatDateForUrl(year, month, day);
        const url = `${this.baseUrl}/${dateStr}/summary.json`;
        const response = await this.fetchWithCors(url);
        if (!response) return false;
        const data = await response.json();
        this.data.summaries.push({ date: `${year}-${month}-${day}`, data });
        return true;
    }

    async loadShips(year, month, day) {
        const dateStr = this.formatDateForUrl(year, month, day);
        const url = `${this.baseUrl}/${dateStr}/ships.json.gz`;
        const response = await this.fetchWithCors(url);
        if (!response) return false;

        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        const ships = JSON.parse(decompressed);
        const date = `${year}-${month}-${day}`;

        // Process each ship
        ships.forEach(ship => {
            if (!this.data.shipsHistory.has(ship.hex_code)) {
                this.data.shipsHistory.set(ship.hex_code, []);
            }

            // Convert item IDs to names
            const namedItems = {};
            for (const [itemId, count] of Object.entries(ship.items)) {
                const itemName = this.getItemName(parseInt(itemId));
                namedItems[itemName] = count;
            }

            // Add daily record
            this.data.shipsHistory.get(ship.hex_code).push({
                date,
                name: ship.name.trim(),
                                                           color: ship.color,
                                                           items: namedItems
            });
        });

        return true;
    }

    processLogEntry(entry, year, month, day) {
        // Ensure all fields exist and are the correct type
        const processedEntry = {
            time: parseInt(entry.time, 10) || 0,
            zone: String(entry.zone || ''),
            src: String(entry.src || ''),
            dst: String(entry.dst || ''),
            item: parseInt(entry.item, 10) || 0,
            count: parseInt(entry.count, 10) || 0,
            date: `${year}-${month}-${day}`
        };

        // Stack identical transactions by combining their counts
        // Remove time from the key to group transactions regardless of exact timestamp
        const key = `${processedEntry.zone}_${processedEntry.src}_${processedEntry.dst}_${processedEntry.item}`;

        if (this.data.logsMap.has(key)) {
            const existing = this.data.logsMap.get(key);
            existing.count += processedEntry.count;
            // Keep the earliest time
            existing.time = Math.min(existing.time, processedEntry.time);
        } else {
            this.data.logsMap.set(key, processedEntry);
        }
    }

    async loadLogs(year, month, day) {
        const dateStr = this.formatDateForUrl(year, month, day);
        const url = `${this.baseUrl}/${dateStr}/log.json.gz`;

        try {
            const response = await this.fetchWithCors(url);
            if (!response) return false;

            const compressed = await response.arrayBuffer();
            const decompressed = pako.ungzip(new Uint8Array(compressed));
            const text = new TextDecoder('utf-8').decode(decompressed);

            // First, ensure the text is wrapped in square brackets to make it a valid JSON array
            const jsonText = text.trim();
            const validJsonText = jsonText.startsWith('[') ? jsonText : `[${jsonText}]`;

            try {
                // Try to parse the entire text as one JSON array
                const entries = JSON.parse(validJsonText);

                // Process entries in chunks
                const chunkSize = 1000;
                for (let i = 0; i < entries.length; i += chunkSize) {
                    const chunk = entries.slice(i, i + chunkSize);

                    for (const entry of chunk) {
                        this.processLogEntry(entry, year, month, day);
                    }

                    // Allow UI updates
                    if (i % (chunkSize * 5) === 0) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }

                return true;
            } catch (parseError) {
                // If parsing as a whole array fails, fall back to line-by-line parsing
                const entries = jsonText.split('\n')
                .map(line => line.trim())
                .filter(line => line && line !== '[' && line !== ']')
                .map(line => {
                    // Remove trailing commas and ensure proper JSON formatting
                    line = line.replace(/,$/, '');
                    try {
                        return JSON.parse(line);
                    } catch (e) {
                        console.warn('Failed to parse log entry:', line);
                        return null;
                    }
                })
                .filter(entry => entry !== null);

                // Process the valid entries
                for (const entry of entries) {
                    this.processLogEntry(entry, year, month, day);
                }

                return true;
            }
        } catch (error) {
            console.error(`Error loading logs for ${dateStr}:`, error);
            return false;
        }
    }

    async loadItemSchema() {
        const url = `${this.baseUrl}/item_schema.json`;
        const response = await this.fetchWithCors(url);
        this.data.itemSchema = await response.json();
    }

    async loadBotDrops() {
        const url = `${this.baseUrl}/bot_drops.txt`;
        const response = await this.fetchWithCors(url);
        this.data.botDrops = await response.text();
    }

    updateProgress(percentage) {
        const progressBar = this.elements.loadingProgress;
        if (!progressBar.querySelector('.loading-progress-bar')) {
            const bar = document.createElement('div');
            bar.className = 'loading-progress-bar';
            progressBar.appendChild(bar);
        }
        progressBar.querySelector('.loading-progress-bar').style.width = `${percentage}%`;
    }

    updateUI() {
        this.updateDateRangeInfo();
        this.updateSummary();
        this.updateShips();
        this.updateLogs();
        this.updateItems();
        this.updateDrops();
    }

    updateDateRangeInfo() {
        const startDate = this.elements.startDate.value;
        const endDate = this.elements.endDate.value;
        this.elements.dateRangeInfo.innerHTML = `
        <h3>Date Range</h3>
        <p>From: ${startDate} To: ${endDate}</p>
        <p>Total Days: ${this.data.summaries.length}</p>
        `;
    }

    updateSummary() {
        const summaryContainer = document.querySelector('.summary-stats');

        // Aggregate data across all dates
        const aggregatedData = {
            totalShips: 0,
            totalLogs: 0,
            itemsHeld: {},
            itemsMoved: {},
            itemsNew: []
        };

        this.data.summaries.forEach(summary => {
            aggregatedData.totalShips += summary.data.count_ships;
            aggregatedData.totalLogs += summary.data.count_logs;

            // Aggregate items held
            Object.entries(summary.data.items_held).forEach(([id, count]) => {
                aggregatedData.itemsHeld[id] = (aggregatedData.itemsHeld[id] || 0) + count;
            });

            // Aggregate items moved
            Object.entries(summary.data.items_moved).forEach(([id, count]) => {
                aggregatedData.itemsMoved[id] = (aggregatedData.itemsMoved[id] || 0) + count;
            });

            // Aggregate new items
            aggregatedData.itemsNew.push(...summary.data.items_new);
        });

        let html = `
        <div class="stat-card">
        <h3>Total Ships</h3>
        <p>${aggregatedData.totalShips}</p>
        </div>
        <div class="stat-card">
        <h3>Total Logs</h3>
        <p>${aggregatedData.totalLogs}</p>
        </div>
        <div class="stat-card">
        <h3>Top Items Held</h3>
        ${this.getTopItems(aggregatedData.itemsHeld, 5)}
        </div>
        <div class="stat-card">
        <h3>Top Items Moved</h3>
        ${this.getTopItems(aggregatedData.itemsMoved, 5)}
        </div>
        `;

        summaryContainer.innerHTML = html;
    }

    showShipHistory(hexCode) {
        const history = this.data.shipsHistory.get(hexCode);
        const modal = document.getElementById('shipHistoryModal');
        const content = document.getElementById('shipHistoryContent');

        if (!history || history.length === 0) {
            content.innerHTML = '<p>No history available for this ship.</p>';
            modal.style.display = "block";
            return;
        }

        let html = `<h2>Ship History - ${hexCode}</h2>`;
        html += '<div class="history-timeline">';

        history.forEach((record, index) => {
            const prevRecord = index > 0 ? history[index - 1] : null;
            const nameChanged = prevRecord && prevRecord.name !== record.name;
            const itemsChanged = prevRecord && JSON.stringify(record.items) !== JSON.stringify(prevRecord.items);

            html += `
                <div class="history-entry ${nameChanged ? 'name-changed' : ''} ${itemsChanged ? 'items-changed' : ''}">
                    <h3 class="date">${record.date}</h3>
                    <p class="name" style="color: #${record.color.toString(16).padStart(6, '0')}">
                        Name: ${record.name || 'Unnamed Ship'}
                        ${nameChanged ? ' <span class="changed">(Changed)</span>' : ''}
                    </p>
                    <div class="items">
                        <h4>Inventory${itemsChanged ? ' <span class="changed">(Changed)</span>' : ''}</h4>
                        <ul>
                            ${Object.entries(record.items)
                                .sort(([aName], [bName]) => aName.localeCompare(bName))
                                .map(([itemName, count]) => `
                                    <li>${itemName}: ${count.toLocaleString()}</li>
                                `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        content.innerHTML = html;
        modal.style.display = "block";
    }

    updateShips() {
        const shipsContainer = document.querySelector('.ships-list');

        // Create a map of ships with their latest data
        const latestShipData = new Map();

        for (const [hexCode, history] of this.data.shipsHistory) {
            if (history.length > 0) {
                latestShipData.set(hexCode, history[history.length - 1]);
            }
        }

        // Convert to array and sort by name
        const ships = Array.from(latestShipData.entries())
            .sort(([, a], [, b]) => a.name.localeCompare(b.name));

        const html = `
            <div class="ships-grid">
                ${ships.map(([hexCode, ship]) => `
                    <div class="ship-card" data-hex="${hexCode}">
                        <h3 style="color: #${ship.color.toString(16).padStart(6, '0')}">${ship.name || 'Unnamed Ship'}</h3>
                        <p>ID: ${hexCode}</p>
                        <button class="view-history-btn">View History</button>
                    </div>
                `).join('')}
            </div>
            <div id="shipHistoryModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <div id="shipHistoryContent"></div>
                </div>
            </div>
        `;

        shipsContainer.innerHTML = html;

        // Add click handlers for history buttons
        shipsContainer.querySelectorAll('.view-history-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const hexCode = e.target.closest('.ship-card').dataset.hex;
                this.showShipHistory(hexCode);
            });
        });

        // Modal close button
        const modal = document.getElementById('shipHistoryModal');
        const span = modal.querySelector('.close');
        span.onclick = () => modal.style.display = "none";
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        };
    }

    stackIdenticalTransactions(logs) {
        const stackedMap = new Map();

        logs.forEach(log => {
            // Create a key that identifies identical transactions
            // Ignore 'serv' as requested
            const key = `${log.time}_${log.zone}_${log.src}_${log.dst}_${log.item}_${log.count}`;

            if (stackedMap.has(key)) {
                const existing = stackedMap.get(key);
                existing.repetitions = (existing.repetitions || 1) + 1;
            } else {
                stackedMap.set(key, { ...log, repetitions: 1 });
            }
        });

        return Array.from(stackedMap.values());
    }

    getItemName(itemId) {
        if (!this.data.itemSchema || itemId === undefined || itemId === null) {
            return `Unknown Item`;
        }

        const item = this.data.itemSchema.find(i => i.id === itemId);
        return item ? item.name : `Item ${itemId}`;
    }

    setupLogFilters() {
        const itemFilter = document.getElementById('itemFilter');
        const srcFilter = document.getElementById('srcFilter');
        const dstFilter = document.getElementById('dstFilter');
        const clearFilters = document.getElementById('clearFilters');
        const tbody = document.querySelector('.logs-table tbody');

        const applyFilters = () => {
            const itemValue = itemFilter.value.toLowerCase();
            const srcValue = srcFilter.value.toLowerCase();
            const dstValue = dstFilter.value.toLowerCase();

            const rows = tbody.getElementsByTagName('tr');

            Array.from(rows).forEach(row => {
                const cells = row.getElementsByTagName('td');
                const itemMatch = cells[4].textContent.toLowerCase().includes(itemValue);
                const srcMatch = cells[2].textContent.toLowerCase().includes(srcValue);
                const dstMatch = cells[3].textContent.toLowerCase().includes(dstValue);

                row.style.display = itemMatch && srcMatch && dstMatch ? '' : 'none';
            });
        };

        itemFilter.addEventListener('input', applyFilters);
        srcFilter.addEventListener('input', applyFilters);
        dstFilter.addEventListener('input', applyFilters);

        clearFilters.addEventListener('click', () => {
            itemFilter.value = '';
            srcFilter.value = '';
            dstFilter.value = '';
            applyFilters();
        });
    }

    updateVirtualScrollMetrics() {
        const logs = this.isFiltering ? this.filteredLogs : this.data.logs;
        this.virtualScrolling.totalRows = logs.length;

        const content = document.querySelector('.virtual-scroll-content');
        content.style.height = `${this.virtualScrolling.totalRows * this.virtualScrolling.rowHeight}px`;
    }

    escapeHtml(unsafe) {
        if (unsafe === undefined || unsafe === null) return '';
        return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    renderVisibleRows() {
        const logs = this.isFiltering ? this.filteredLogs : this.data.logs;
        if (!logs || !logs.length) return;

        const content = document.querySelector('.virtual-scroll-content');
        if (!content) return;

        const start = Math.max(0, this.virtualScrolling.startIndex - this.virtualScrolling.visibleRows);
        const end = Math.min(logs.length, this.virtualScrolling.startIndex + this.virtualScrolling.visibleRows * 2);

        const rows = logs.slice(start, end).map((log, index) => {
            const timestamp = new Date(log.time * 1000).toLocaleString();
            const zone = this.escapeHtml(log.zone);
            const src = this.escapeHtml(log.src);
            const dst = this.escapeHtml(log.dst);
            const itemName = this.escapeHtml(this.getItemName(log.item));
            const count = log.count.toLocaleString();

            return `
                <div class="virtual-row" style="transform: translateY(${(start + index) * this.virtualScrolling.rowHeight}px)">
                    <div class="cell time" title="${timestamp}">${timestamp}</div>
                    <div class="cell zone" title="${zone}">${zone}</div>
                    <div class="cell src" title="${src}">${src}</div>
                    <div class="cell dst" title="${dst}">${dst}</div>
                    <div class="cell item" title="${itemName}">${itemName}</div>
                    <div class="cell count">${count}</div>
                </div>
            `;
        }).join('');

        content.innerHTML = rows;
    }

    setupLogFilters() {
        const itemFilter = document.getElementById('itemFilter');
        const srcFilter = document.getElementById('srcFilter');
        const dstFilter = document.getElementById('dstFilter');
        const clearFilters = document.getElementById('clearFilters');
        const filteredLogsCount = document.getElementById('filteredLogs');

        let debounceTimeout;

        const applyFilters = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const itemValue = itemFilter.value.toLowerCase();
                const srcValue = srcFilter.value.toLowerCase();
                const dstValue = dstFilter.value.toLowerCase();

                if (!itemValue && !srcValue && !dstValue) {
                    this.isFiltering = false;
                    this.filteredLogs = [];
                    filteredLogsCount.textContent = '';
                } else {
                    this.isFiltering = true;
                    this.filteredLogs = this.data.logs.filter(log => {
                        const itemName = this.getItemName(log.item).toLowerCase();
                        const srcMatch = log.src.toLowerCase().includes(srcValue);
                        const dstMatch = log.dst.toLowerCase().includes(dstValue);
                        const itemMatch = itemName.includes(itemValue);

                        return itemMatch && srcMatch && dstMatch;
                    });
                    filteredLogsCount.textContent = `Filtered: ${this.filteredLogs.length.toLocaleString()}`;
                }

                this.updateVirtualScrollMetrics();
                this.renderVisibleRows();
            }, 300); // Debounce delay
        };

        itemFilter.addEventListener('input', applyFilters);
        srcFilter.addEventListener('input', applyFilters);
        dstFilter.addEventListener('input', applyFilters);

        clearFilters.addEventListener('click', () => {
            itemFilter.value = '';
            srcFilter.value = '';
            dstFilter.value = '';
            this.isFiltering = false;
            this.filteredLogs = [];
            filteredLogsCount.textContent = '';
            this.updateVirtualScrollMetrics();
            this.renderVisibleRows();
        });
    }

    renderInitialView() {
        this.updateVirtualScrollMetrics();
        this.renderVisibleRows();
    }

    setupVirtualScrolling() {
        const container = document.querySelector('.virtual-scroll-container');
        const content = document.querySelector('.virtual-scroll-content');

        this.virtualScrolling.viewportHeight = container.clientHeight;
        this.virtualScrolling.visibleRows = Math.ceil(this.virtualScrolling.viewportHeight / this.virtualScrolling.rowHeight);

        // Update total rows count
        this.updateVirtualScrollMetrics();

        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            this.virtualScrolling.startIndex = Math.floor(scrollTop / this.virtualScrolling.rowHeight);
            this.renderVisibleRows();
        });

        // Add resize observer
        new ResizeObserver(() => {
            this.virtualScrolling.viewportHeight = container.clientHeight;
            this.virtualScrolling.visibleRows = Math.ceil(this.virtualScrolling.viewportHeight / this.virtualScrolling.rowHeight);
            this.updateVirtualScrollMetrics();
            this.renderVisibleRows();
        }).observe(container);
    }

    updateLogs() {
        const logsContainer = document.querySelector('.logs-list');

        // Convert Map to sorted Array
        this.data.logs = Array.from(this.data.logsMap.values())
            .sort((a, b) => b.time - a.time);

        logsContainer.innerHTML = `
            <div class="log-filters">
                <input type="text" id="itemFilter" placeholder="Filter by item name...">
                <input type="text" id="srcFilter" placeholder="Filter by source...">
                <input type="text" id="dstFilter" placeholder="Filter by destination...">
                <button id="clearFilters">Clear Filters</button>
                <div class="log-stats">
                    <span id="totalLogs">Total Unique Transactions: ${this.data.logsMap.size.toLocaleString()}</span>
                    <span id="filteredLogs"></span>
                </div>
            </div>
            <div class="logs-table">
                <div class="table-header">
                    <div class="header-row">
                        <div class="cell time">Time (UTC)</div>
                        <div class="cell zone">Zone</div>
                        <div class="cell src">Source</div>
                        <div class="cell dst">Destination</div>
                        <div class="cell item">Item</div>
                        <div class="cell count">Count</div>
                    </div>
                </div>
                <div class="virtual-scroll-container">
                    <div class="virtual-scroll-content"></div>
                </div>
            </div>
        `;

        this.setupVirtualScrolling();
        this.setupLogFilters();
        this.renderInitialView();
    }

    updateItems() {
        const itemsContainer = document.querySelector('.items-list');

        const html = this.data.itemSchema.map(item => `
        <div class="item-card">
        <h3>${item.name}</h3>
        <p>ID: ${item.id}</p>
        </div>
        `).join('');

        itemsContainer.innerHTML = html;
    }

    updateDrops() {
        const dropsContainer = document.querySelector('.drops-list');
        dropsContainer.innerHTML = `<pre>${this.data.botDrops}</pre>`;
    }

    getTopItems(items, count) {
        return Object.entries(items)
        .sort(([, a], [, b]) => b - a)
        .slice(0, count)
        .map(([id, count]) => `<p>${id}: ${count}</p>`)
        .join('');
    }

    switchTab(tabId) {
        this.elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }

    showLoading(show) {
        this.elements.loading.classList.toggle('hidden', !show);
        if (!show) {
            this.elements.loadingProgress.innerHTML = '';
        }
    }

    filterShips(query) {
        if (!this.data.ships.length) return;

        const filtered = this.data.ships.filter(ship =>
        ship.name.toLowerCase().includes(query.toLowerCase()) ||
        ship.hex_code.toLowerCase().includes(query.toLowerCase()) ||
        ship.date.includes(query)
        );

        const shipsContainer = document.querySelector('.ships-list');
        shipsContainer.innerHTML = filtered.slice(0, 100).map(ship => `
        <div class="ship-card">
        <h3 style="color: #${ship.color.toString(16).padStart(6, '0')}">${ship.name}</h3>
        <p>ID: ${ship.hex_code}</p>
        <p>Date: ${ship.date}</p>
        <p>Items: ${Object.keys(ship.items).length}</p>
        </div>
        `).join('');
    }

    filterLogs(query) {
        if (!this.data.logs.length) return;

        const filtered = this.data.logs.filter(log =>
            log.item.toLowerCase().includes(query.toLowerCase()) ||
            log.zone.toLowerCase().includes(query.toLowerCase()) ||
            log.src.toLowerCase().includes(query.toLowerCase()) ||
            log.dst.toLowerCase().includes(query.toLowerCase()) ||
            log.date.includes(query)
        );

        const logsContainer = document.querySelector('.logs-list');
        logsContainer.innerHTML = filtered.slice(0, 100).map(log => `
            <div class="log-entry">
                <p>${new Date(log.time * 1000).toLocaleString()}</p>
                <p>Date: ${log.date}</p>
                <p>Zone: ${log.zone}</p>
                <p>Item: ${log.item} (${log.count})</p>
                <p>Source: ${log.src} → Destination: ${log.dst}</p>
            </div>
        `).join('');
    }


    filterItems(query) {
        if (!this.data.itemSchema) return;

        const filtered = this.data.itemSchema.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.id.toString().includes(query)
        );

        const itemsContainer = document.querySelector('.items-list');
        itemsContainer.innerHTML = filtered.map(item => `
        <div class="item-card">
        <h3>${item.name}</h3>
        <p>ID: ${item.id}</p>
        </div>
        `).join('');
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DrednotDataViewer();
});
