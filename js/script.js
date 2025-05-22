class DrednotDataViewer {
    constructor() {
        // Use correct base URL format
        this.apiBase = 'https://pub.drednot.io/prod/econ';
        this.proxyBase = 'https://iogamesplayer.com/proxy.php?path=';
        this.data = {
            summaries: [],
            ships: [],
            logs: [],
            itemSchema: null,
            botDrops: null
        };

        this.errors = {
            itemSchema: false,
            botDrops: false
        };

        this.initializeElements();
        this.addEventListeners();
        this.setDefaultDates();
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

    setDefaultDates() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const minDate = '2022-11-23';
        this.elements.startDate.min = minDate;
        this.elements.endDate.min = minDate;
        this.elements.startDate.max = this.formatDate(yesterday);
        this.elements.endDate.max = this.formatDate(yesterday);

        this.elements.startDate.value = this.formatDate(yesterday);
        this.elements.endDate.value = this.formatDate(yesterday);
    }

    validateDates() {
        const start = new Date(this.elements.startDate.value);
        const end = new Date(this.elements.endDate.value);
        const minDate = new Date('2022-11-23');
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (start < minDate) {
            this.elements.startDate.value = '2022-11-23';
            this.showError('Start date cannot be before 2022-11-23');
            return false;
        }

        if (end > yesterday) {
            this.elements.endDate.value = this.formatDate(yesterday);
            this.showError('End date cannot be in the future');
            return false;
        }

        if (end < start) {
            this.elements.endDate.value = this.elements.startDate.value;
            this.showError('End date cannot be before start date');
            return false;
        }

        return true;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    async loadData() {
        if (!this.validateDates()) {
            return;
        }

        this.showLoading(true);
        this.data.summaries = [];
        this.data.ships = [];
        this.data.logs = [];

        const startDate = new Date(this.elements.startDate.value);
        const endDate = new Date(this.elements.endDate.value);
        const dateRange = this.getDateRange(startDate, endDate);

        try {
            // Load static data first
            await Promise.allSettled([
                this.loadItemSchema(),
                                     this.loadBotDrops()
            ]);

            let completed = 0;
            const total = dateRange.length;
            const failures = [];

            for (const date of dateRange) {
                const [year, month, day] = date.split('-');
                try {
                    await Promise.all([
                        this.loadSummary(year, month, day),
                                      this.loadShips(year, month, day),
                                      this.loadLogs(year, month, day)
                    ]);
                } catch (error) {
                    console.error(`Failed to load data for ${date}:`, error);
                    failures.push(date);
                    continue;
                }

                completed++;
                this.updateProgress(completed / total * 100);
            }

            if (this.data.summaries.length === 0) {
                throw new Error('No data could be loaded for the selected date range');
            }

            if (failures.length > 0) {
                this.showError(`Failed to load data for dates: ${failures.join(', ')}`);
            }

            this.updateUI();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError(error.message);
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
        // Format date components to ensure two digits
        month = month.toString().padStart(2, '0');
        day = day.toString().padStart(2, '0');
        const path = encodeURIComponent(`${year}_${month}_${day}/summary.json`);
        const url = `${this.proxyBase}${path}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        this.data.summaries.push({ date: `${year}-${month}-${day}`, data });
    }

    async loadShips(year, month, day) {
        month = month.toString().padStart(2, '0');
        day = day.toString().padStart(2, '0');
        const path = encodeURIComponent(`${year}_${month}_${day}/ships.json.gz`);
        const url = `${this.proxyBase}${path}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        const data = JSON.parse(decompressed);
        this.data.ships.push(...data.map(ship => ({ ...ship, date: `${year}-${month}-${day}` })));
    }

    async loadLogs(year, month, day) {
        month = month.toString().padStart(2, '0');
        day = day.toString().padStart(2, '0');
        const path = encodeURIComponent(`${year}_${month}_${day}/log.json.gz`);
        const url = `${this.proxyBase}${path}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        const data = JSON.parse(decompressed);
        this.data.logs.push(...data.map(log => ({ ...log, date: `${year}-${month}-${day}` })));
    }

    async loadItemSchema() {
        try {
            // Construct correct URL for item schema
            const path = encodeURIComponent('item_schema.json');
            const url = `${this.proxyBase}${path}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load item schema');
            this.data.itemSchema = await response.json();
            this.errors.itemSchema = false;
        } catch (error) {
            console.error('Failed to load item schema:', error);
            this.errors.itemSchema = true;
            this.data.itemSchema = [];
        }
    }

    async loadBotDrops() {
        try {
            // Construct correct URL for bot drops
            const path = encodeURIComponent('bot_drops.txt');
            const url = `${this.proxyBase}${path}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to load bot drops');
            this.data.botDrops = await response.text();
            this.errors.botDrops = false;
        } catch (error) {
            console.error('Failed to load bot drops:', error);
            this.errors.botDrops = true;
            this.data.botDrops = 'Bot drops data unavailable due to access restrictions.';
        }
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

        if (this.errors.itemSchema) {
            document.querySelector('.items-list').innerHTML = `
            <div class="error-state">
            <h3>Item Schema Unavailable</h3>
            <p>Due to access restrictions, the item schema could not be loaded.</p>
            </div>
            `;
        } else {
            this.updateItems();
        }

        if (this.errors.botDrops) {
            document.querySelector('.drops-list').innerHTML = `
            <div class="error-state">
            <h3>Bot Drops Data Unavailable</h3>
            <p>Due to access restrictions, the bot drops data could not be loaded.</p>
            </div>
            `;
        } else {
            this.updateDrops();
        }
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

    updateShips() {
        const shipsContainer = document.querySelector('.ships-list');
        const ships = this.data.ships.slice(0, 100);

        const html = ships.map(ship => `
            <div class="ship-card">
                <h3 style="color: #${ship.color.toString(16).padStart(6, '0')}">${ship.name}</h3>
                <p>ID: ${ship.hex_code}</p>
                <p>Date: ${ship.date}</p>
                <p>Items: ${Object.keys(ship.items).length}</p>
            </div>
        `).join('');

        shipsContainer.innerHTML = html;
    }

    updateLogs() {
        const logsContainer = document.querySelector('.logs-list');
        const logs = this.data.logs.slice(0, 100);

        const html = logs.map(log => `
            <div class="log-entry">
                <p>${new Date(log.time * 1000).toLocaleString()}</p>
                <p>Date: ${log.date}</p>
                <p>Zone: ${log.zone}</p>
                <p>Item: ${log.item} (${log.count})</p>
                <p>Source: ${log.src} → Destination: ${log.dst}</p>
            </div>
        `).join('');

        logsContainer.innerHTML = html;
    }

    updateItems() {
        const itemsContainer = document.querySelector('.items-list');

        const html = this.data.itemSchema.map(item => `
            <div class="item-card">
                <h3>${item.name}</h3>
                <p>ID: ${item.id}</p>
                <p>Type: ${item.type}</p>
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

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;

        // Remove any existing error messages
        document.querySelectorAll('.error-message').forEach(el => el.remove());

        // Insert error message at the top of the content
        const content = document.querySelector('.data-content');
        content.insertBefore(errorDiv, content.firstChild);

        // Auto-remove after 5 seconds
        setTimeout(() => errorDiv.remove(), 5000);
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
            log.zone.toLowerCase().includes(query.toLowerCase()) ||
            log.src.toLowerCase().includes(query.toLowerCase()) ||
            log.dst.toLowerCase().includes(query.toLowerCase()) ||
            log.item.toString().includes(query) ||
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
            item.id.toString().includes(query) ||
            item.type.toLowerCase().includes(query.toLowerCase())
        );

        const itemsContainer = document.querySelector('.items-list');
        itemsContainer.innerHTML = filtered.map(item => `
            <div class="item-card">
                <h3>${item.name}</h3>
                <p>ID: ${item.id}</p>
                <p>Type: ${item.type}</p>
            </div>
        `).join('');
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DrednotDataViewer();
});
