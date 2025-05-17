// Initialize search index
let searchIndex;
let currentData = {};

// Fetch and process data
async function fetchTodayData() {
    const date = new Date();
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1; // no padding
    const day = date.getUTCDate(); // no padding

    try {
        // First try to get today's data from the latest symlink
        const summaryResponse = await fetch('data/latest/summary.json');

        if (!summaryResponse.ok) {
            throw new Error('Latest data not yet available');
        }

        const summaryData = await summaryResponse.json();

        // Store the data for search functionality
        currentData = summaryData;

        // Update UI with summary data
        updateSummaryDisplay(summaryData);

        // Update visualizations
        createCharts(summaryData);

        // Build search index
        buildSearchIndex(summaryData);

    } catch (error) {
        console.error('Error fetching data:', error);
        // Try to fetch yesterday's data as fallback
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayYear = yesterday.getUTCFullYear();
        const yesterdayMonth = yesterday.getUTCMonth() + 1; // no padding
        const yesterdayDay = yesterday.getUTCDate(); // no padding

        try {
            const fallbackResponse = await fetch(
                `data/${yesterdayYear}_${yesterdayMonth}_${yesterdayDay}/summary.json`
            );
            if (!fallbackResponse.ok) {
                throw new Error('No recent data available');
            }
            const fallbackData = await fallbackResponse.json();
            currentData = fallbackData;
            updateSummaryDisplay(fallbackData);
            createCharts(fallbackData);
            buildSearchIndex(fallbackData);

            // Show notice about using older data
            document.getElementById('summary').insertAdjacentHTML('beforebegin',
                                                                  '<div class="notice">Showing yesterday\'s data. Today\'s data will be available soon.</div>'
            );
        } catch (fallbackError) {
            document.getElementById('summary').innerHTML = '<div class="error">Unable to load economic data. Please try again later.</div>';
        }
    }
}
