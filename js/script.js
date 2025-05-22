class DrednotDataViewer {
    constructor() {
        // Using cors-anywhere as a temporary solution
        this.corsProxy = 'https://cors-anywhere.herokuapp.com/';
        this.baseUrl = 'https://pub.drednot.io/prod/econ';
        this.data = {
            summaries: [],
            ships: [],
            logs: [],
            itemSchema: null,
            botDrops: null
        };

        this.initializeElements();
        this.addEventListeners();
        this.setDefaultDates();
        this.showCorsWarning();
    }

    showCorsWarning() {
        const warning = document.createElement('div');
        warning.className = 'cors-warning';
        warning.innerHTML = `
        <div class="warning-content">
        <h3>⚠️ First Time Setup Required</h3>
        <p>To use this tool, you need to enable CORS access:</p>
        <ol>
        <li>Click <a href="https://cors-anywhere.herokuapp.com/corsdemo" target="_blank">here</a> to open CORS Anywhere</li>
        <li>Click the "Request temporary access" button</li>
        <li>Return here and refresh the page</li>
        </ol>
        <button class="warning-close">Got it!</button>
        </div>
        `;
        document.body.appendChild(warning);

        warning.querySelector('.warning-close').addEventListener('click', () => {
            warning.remove();
        });
    }

    async fetchWithCors(url) {
        try {
            const response = await fetch(this.corsProxy + url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            throw error;
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

        if (start < minDate) {
            this.elements.startDate.value = '2022-11-23';
        }

        if (end < start) {
            this.elements.endDate.value = this.elements.startDate.value;
        }
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    async loadData() {
        this.showLoading(true);
        this.data.summaries = [];
        this.data.ships = [];
        this.data.logs = [];

        const startDate = new Date(this.elements.startDate.value);
        const endDate = new Date(this.elements.endDate.value);
        const dateRange = this.getDateRange(startDate, endDate);

        try {
            // First load static data
            await Promise.all([
                this.loadItemSchema(),
                              this.loadBotDrops()
            ]);

            // Then load date-specific data with progress tracking
            let completed = 0;
            const total = dateRange.length;

            for (const date of dateRange) {
                const [year, month, day] = date.split('-');
                await Promise.all([
                    this.loadSummary(year, month, day),
                                  this.loadShips(year, month, day),
                                  this.loadLogs(year, month, day)
                ]);

                completed++;
                this.updateProgress(completed / total * 100);
            }

            this.updateUI();
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data. Please check the console for details.');
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

    // Modified fetch methods
    async loadSummary(year, month, day) {
        const url = `${this.baseUrl}/${year}_${month}_${day}/summary.json`;
        const response = await this.fetchWithCors(url);
        const data = await response.json();
        this.data.summaries.push({ date: `${year}-${month}-${day}`, data });
    }

    async loadShips(year, month, day) {
        const url = `${this.baseUrl}/${year}_${month}_${day}/ships.json.gz`;
        const response = await this.fetchWithCors(url);
        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        const data = JSON.parse(decompressed);
        this.data.ships.push(...data.map(ship => ({ ...ship, date: `${year}-${month}-${day}` })));
    }

    async loadLogs(year, month, day) {
        const url = `${this.baseUrl}/${year}_${month}_${day}/log.json.gz`;
        const response = await this.fetchWithCors(url);
        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        const data = JSON.parse(decompressed);
        this.data.logs.push(...data.map(log => ({ ...log, date: `${year}-${month}-${day}` })));
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
