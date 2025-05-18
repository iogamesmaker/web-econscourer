// settings.js - Settings and help functionality

import { STATE } from './state.js';
import { showNotice } from './utils.js';

export const HELP_CONTENT = {
    introduction: `DREDNOT ECON LOG SCOURER

This program can help you scan the econ log files from drednot.
It's pretty self explenatory for the most part. If you really don't have a clue about something DM me on Discord, @iogamesplayer or ask me in-game, Dutchman.

Use the navigation buttons to figure out more about features and tips.`,

    loading: `LOADING DATA
On startup, the program will download all necessary data.

Set the date range with the top-left and top-right inputs.
- Start Date: First day to include (from 2022-11-23)
- End Date: Last day to include (to today)
Everything in between will be loaded when clicking the "Load Data" button, keeping the filters in mind.

The filters help to save a bit of RAM, since the econ logs take a shitton of it.
DO NOT TRY TO LOAD OVER 2 MONTHS OF DATA WITHOUT FILTERS - THE PROGRAM WILL MOST LIKELY CRASH!
DO NOT TRY TO LOAD OVER 2 MONTHS OF DATA WITHOUT FILTERS - THE PROGRAM WILL MOST LIKELY CRASH!`,

    filtering: `FILTERING DATA

Item Filter:
    Type in the item filter box.
    Press enter once to view the dropdown
    Press enter again to select the top one, or select another in the dropdown menu.

Source/Destination Filters:
    Type an ID, ship name, or bot name (see below) into here to search for it. Not case sensitive. If you want to search by ship name, you have to check the "Use Ship Names" box.

Other Filters:
    "Only show ship transactions": Does what it says off the tin - check this box and it will hide all despawned items, and all bot to player transactions.
    - "Use ship names": Display ship names together with IDs. Will add a couple seconds to the filtering process.
        Clicking this for the first time will load about 250MB of data as of April 2025 into RAM, it won't unload until you exit.

Press Enter in a text field or the Refresh button to apply filters after changing them.

SEARCHING BY BOT:
    I gave each bot a custom display name to fit the field of the source.
    You can only search them by their original name though.
    Here's a list of the bots:

        "OLD NAME": "CUSTOM NAME",

        "block - iron": "Iron mine",

        "bot - zombie": "Vult Bot", (Smallest vulture bot (WAVE I))
        "bot - zombie tank": "Vult Bot 2", (Second tier vulture bot (WAVE II))
        "bot - zombie hunter": "Vult Yank", (Yanker bot (WAVE III))
        "bot - zombie boss": "Vult Boss", (Vulture boss (WAVE IV))

        "bot - green roamer": "Green bot", Legacy stuff
        "bot - red hunter": "Red Hunter",
        "bot - yellow rusher": "YellowRush",
        "block - flux": "Flux mine",

        "bot - aqua shielder": "Shield bot",
        "bot - blue melee": "Blue Spike", (Small melee bot)
        "bot - yellow hunter": "Hunter bot", (Small, slow yellow bot)
        "bot - orange fool": "Orange Fool",(Hummingbird bot)
        "bot - red sniper": "Red Sniper", (Fast moving Sparrow / Falcon bot that shoots red projectiles)
        "bot - red sentry": "Red Sentry", (Annoying stationary bot)

        "Yellow Mine Bot": "Mine bot", (Annoying mine bot)
        "The Coward": "The Coward",
        "The Shield Master": "ShieldBoss",
        "The Lazer Enthusiast": "LazerBoss"`,

    shipLookup: `SHIP HISTORY SUB-PROGRAM

To lookup a ship's name history:
    1. Click "Lookup Ship Name" to load ship data if it isn't loaded already.
    2. After that's done, click the button again to open the sub-program.
    3. Press either the ID or Name button, depending on what you want to search, wildcards (*) are supported More on that later.
    4. Type your prompt into
    5. Select from matching ships
    6. Press on a date / name to see the contents of the ship at that time.

The history will show all known names for that ship ID, with dates when the name was recorded.
It only shows names from when the ship was loaded at least once in the day.
Press the back button to go back to the ship name history if you want to return from seeing contents of a ship.

Unchecking "Enable Searching" will disable searching by name, and will only show EXACT ID matches.`,

    analysis: `ITEM ANALYZER SUB-PROGRAM

This program is really simple to use, just load ship names (press the button to load them), and then press the Analyze Items button again.

Select a date for the analysis, or keep it at default to read all of the available data.
This will return a list of ALL items and their total counts, without duplicates. So if it says that there is 2134849239458 iron in the economy, there is that much iron total in ALL ships combined.

This works by taking all of the ships.gz.json files, and reading all of the contents of all ships. It will only use the most recent available data per ship.

Double-click an entry to see a leaderboard of so-called "contributors" to the item-count. See if your storage cuts the top 100 for amount of flux stored. You can then again double-click an entry to see that ship's full contents.`
};

// Default settings
const DEFAULT_SETTINGS = {
    fontSize: 12,
    wrapText: false,
    showBots: true,
    useShipNames: false,
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
};

// Update settings whenever changed
export function updateSettings(changes) {
    STATE.settings = { ...STATE.settings, ...changes };
    applySettings(STATE.settings);
    saveSettings(STATE.settings);
}

// Load settings from localStorage
export function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('drednotEconSettings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return DEFAULT_SETTINGS;
}

// Save settings to localStorage
export function saveSettings(settings) {
    try {
        localStorage.setItem('drednotEconSettings', JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Apply settings to UI
export function applySettings(settings) {
    // Font size
    document.getElementById('dataOutput').style.fontSize = `${settings.fontSize}px`;

    // Text wrap
    document.getElementById('dataOutput').style.whiteSpace = settings.wrapText ? 'pre-wrap' : 'pre';

    // Show bots checkbox
    document.getElementById('showBots').checked = settings.showBots;

    // Use ship names checkbox
    document.getElementById('useShipNames').checked = settings.useShipNames;

    // Dark mode
    document.documentElement.classList.toggle('dark-mode', settings.darkMode);
}

// Handle settings changes
export function setupSettingsHandlers() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const fontSize = document.getElementById('fontSize');
    const wrapText = document.getElementById('wrapText');

    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('show');
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });

    fontSize.addEventListener('change', () => {
        const size = parseInt(fontSize.value);
        if (size >= 8 && size <= 24) {
            STATE.settings.fontSize = size;
            applySettings(STATE.settings);
            saveSettings(STATE.settings);
        } else {
            showNotice('Font size must be between 8 and 24', 'error');
            fontSize.value = STATE.settings.fontSize;
        }
    });

    wrapText.addEventListener('change', () => {
        STATE.settings.wrapText = wrapText.checked;
        applySettings(STATE.settings);
        saveSettings(STATE.settings);
    });
}

// Help system
export function setupHelpSystem() {
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelp = document.getElementById('closeHelp');
    const helpContent = document.querySelector('.help-content');

    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('show');
        showHelpSection('introduction');
    });

    closeHelp.addEventListener('click', () => {
        helpModal.classList.remove('show');
    });

    // Setup navigation buttons
    document.querySelectorAll('.help-navigation button').forEach(button => {
        button.addEventListener('click', () => {
            showHelpSection(button.dataset.section);
        });
    });

    function showHelpSection(section) {
        const content = HELP_CONTENT[section] || 'Section not found';
        helpContent.innerHTML = `<pre>${content}</pre>`;

        // Update active button
        document.querySelectorAll('.help-navigation button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });
    }
}
