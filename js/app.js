// Initialize search index
let searchIndex;
let currentData = {};

// Fetch and process data
async function fetchTodayData() {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    try {
        // Fetch summary data
        const summaryResponse = await fetch(
            `https://pub.drednot.io/prod/econ/${year}_${month}_${day}/summary.json`
        );
        const summaryData = await summaryResponse.json();
        
        // Update UI with summary data
        updateSummaryDisplay(summaryData);
        
        // Update visualizations
        createCharts(summaryData);
        
        // Build search index
        buildSearchIndex(summaryData);
        
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function updateSummaryDisplay(data) {
    const summaryElement = document.getElementById('summary-stats');
    summaryElement.innerHTML = `
        <p>Total Ships: ${data.count_ships}</p>
        <p>Total Logs: ${data.count_logs}</p>
    `;
}

function createCharts(data) {
    // Create item distribution chart
    const itemChart = new Chart(
        document.getElementById('itemDistributionChart'),
        {
            type: 'bar',
            data: {
                labels: Object.keys(data.items_held),
                datasets: [{
                    label: 'Items Held',
                    data: Object.values(data.items_held)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
    
    // Create activity chart for new items
    const activityChart = new Chart(
        document.getElementById('activityChart'),
        {
            type: 'line',
            data: {
                labels: data.items_new.map(item => item.zone),
                datasets: [{
                    label: 'Items Generated',
                    data: data.items_new.map(item => item.total)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
}

function buildSearchIndex(data) {
    searchIndex = lunr(function() {
        this.field('zone');
        this.field('item');
        this.field('source');
        
        // Add documents to index
        data.items_new.forEach((item, index) => {
            this.add({
                id: index,
                zone: item.zone,
                item: item.item,
                source: item.src
            });
        });
    });
}

// Initialize search handler
document.getElementById('search').addEventListener('input', (e) => {
    const query = e.target.value;
    if (query.length < 2) return;
    
    const results = searchIndex.search(query);
    // Update UI with search results
    displaySearchResults(results);
});

function displaySearchResults(results) {
    const container = document.getElementById('data-container');
    container.innerHTML = results.map(result => `
        <div class="search-result">
            <h3>Item: ${currentData.items_new[result.ref].item}</h3>
            <p>Zone: ${currentData.items_new[result.ref].zone}</p>
            <p>Source: ${currentData.items_new[result.ref].src}</p>
        </div>
    `).join('');
}

// Initial load
fetchTodayData();