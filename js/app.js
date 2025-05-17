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
        // Fetch from our local data instead of pub.drednot.io
        const summaryResponse = await fetch(
            `data/summary_${year}_${month}_${day}.json`
        );
        
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
        const yesterdayMonth = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
        const yesterdayDay = String(yesterday.getUTCDate()).padStart(2, '0');
        
        try {
            const fallbackResponse = await fetch(
                `data/summary_${yesterdayYear}_${yesterdayMonth}_${yesterdayDay}.json`
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