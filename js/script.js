class DrednotDataViewer {
    constructor() {
        this.baseUrl = 'https://pub.drednot.io';
        this.data = {
            summary: null,
            ships: null,
            logs: null,
            itemSchema: null,
            botDrops: null
        };

        this.initializeElements();
        this.addEventListeners();
        this.setDefaultDate();
    }

    initializeElements() {
        this.elements = {
            instance: document.getElementById('instance'),
            dateSelect: document.getElementById('dateSelect'),
            loadButton: document.getElementById('loadData'),
            loading: document.getElementById('loading'),
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            shipSearch: document.getElementById('shipSearch'),
            logSearch: document.getElementById('logSearch'),
            itemSearch: document.getElementById('itemSearch')
        };
    }

    addEventListeners() {
        this.elements.loadButton.addEventListener('click', () => this.loadData());

        this.elements.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });

        // Add search functionality
        this.elements.shipSearch.addEventListener('input', (e) => this.filterShips(e.target.value));
        this.elements.logSearch.addEventListener('input', (e) => this.filterLogs(e.target.value));
        this.elements.itemSearch.addEventListener('input', (e) => this.filterItems(e.target.value));
    }

    setDefaultDate() {
        const today = new Date();
        today.setDate(today.getDate() - 1); // Default to yesterday
        this.elements.dateSelect.value = today.toISOString().split('T')[0];
    }

    async loadData() {
        this.showLoading(true);

        const instance = this.elements.instance.value;
        const date = this.elements.dateSelect.value;
        const [year, month, day] = date.split('-');

        try {
            // Load all data in parallel
            await Promise.all([
                this.loadSummary(instance, year, month, day),
                              this.loadShips(instance, year, month, day),
                              this.loadLogs(instance, year, month, day),
                              this.loadItemSchema(instance),
                              this.loadBotDrops(instance)
            ]);

            this.updateUI();
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data. Please check the console for details.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadSummary(instance, year, month, day) {
        const url = `${this.baseUrl}/${instance}/econ/${year}_${month}_${day}/summary.json`;
        const response = await fetch(url);
        this.data.summary = await response.json();
    }

    async loadShips(instance, year, month, day) {
        const url = `${this.baseUrl}/${instance}/econ/${year}_${month}_${day}/ships.json.gz`;
        const response = await fetch(url);
        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        this.data.ships = JSON.parse(decompressed);
    }

    async loadLogs(instance, year, month, day) {
        const url = `${this.baseUrl}/${instance}/econ/${year}_${month}_${day}/log.json.gz`;
        const response = await fetch(url);
        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });
        this.data.logs = JSON.parse(decompressed);
    }

    async loadItemSchema(instance) {
        const url = `${this.baseUrl}/${instance}/econ/item_schema.json`;
        const response = await fetch(url);
        this.data.itemSchema = await response.json();
    }

    async loadBotDrops(instance) {
        const url = `${this.baseUrl}/${instance}/econ/bot_drops.txt`;
        const response = await fetch(url);
        this.data.botDrops = await response.text();
    }

    updateUI() {
        this.updateSummary();
        this.updateShips();
        this.updateLogs();
        this.updateItems();
        this.updateDrops();
    }

    updateSummary() {
        const summaryContainer = document.querySelector('.summary-stats');
        const summary = this.data.summary;

        let html = `
        <div class="stat-card">
        <h3>Ships</h3>
        <p>${summary.count_ships}</p>
        </div>
        <div class="stat-card">
        <h3>Logs</h3>
        <p>${summary.count_logs}</p>
        </div>
        `;

        // Add top items held
        html += `
        <div class="stat-card">
        <h3>Top Items Held</h3>
        ${this.getTopItems(summary.items_held, 5)}
        </div>
        `;

        summaryContainer.innerHTML = html;
    }

    updateShips() {
        const shipsContainer = document.querySelector('.ships-list');
        const ships = this.data.ships.slice(0, 100); // Show first 100 ships initially

        const html = ships.map(ship => `
        <div class="ship-card">
        <h3 style="color: #${ship.color.toString(16).padStart(6, '0')}">${ship.name}</h3>
        <p>ID: ${ship.hex_code}</p>
        <p>Items: ${Object.keys(ship.items).length}</p>
        </div>
        `).join('');

        shipsContainer.innerHTML = html;
    }

    updateLogs() {
        const logsContainer = document.querySelector('.logs-list');
        const logs = this.data.logs.slice(0, 100); // Show first 100 logs initially

        const html = logs.map(log => `
        <div class="log-entry">
        <p>${new Date(log.time * 1000).toLocaleString()}</p>
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
    }

    filterShips(query) {
        if (!this.data.ships) return;

        const filtered = this.data.ships.filter(ship =>
        ship.name.toLowerCase().includes(query.toLowerCase()) ||
        ship.hex_code.toLowerCase().includes(query.toLowerCase())
        );

        const shipsContainer = document.querySelector('.ships-list');
        shipsContainer.innerHTML = filtered.slice(0, 100).map(ship => `
        <div class="ship-card">
        <h3 style="color: #${ship.color.toString(16).padStart(6, '0')}">${ship.name}</h3>
        <p>ID: ${ship.hex_code}</p>
        <p>Items: ${Object.keys(ship.items).length}</p>
        </div>
        `).join('');
    }

    filterLogs(query) {
        if (!this.data.logs) return;

        const filtered = this.data.logs.filter(log =>
        log.zone.toLowerCase().includes(query.toLowerCase()) ||
        log.src.toLowerCase().includes(query.toLowerCase()) ||
        log.dst.toLowerCase().includes(query.toLowerCase()) ||
        log.item.toString().includes(query)
        );

        const logsContainer = document.querySelector('.logs-list');
        logsContainer.innerHTML = filtered.slice(0, 100).map(log => `
        <div class="log-entry">
        <p>${new Date(log.time * 1000).toLocaleString()}</p>
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
