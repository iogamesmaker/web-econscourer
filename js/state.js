// state.js - Application state management
export const STATE = {
    rawData: [],
    filteredData: [],
    shipNames: {},
    settings: {
        fontSize: 12,
        wrapText: false,
        showBots: true,
        useShipNames: false
    },
    downloading: false,
    shipLoadingInProgress: false
};
