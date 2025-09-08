// --- Configuration ---
export const API_KEY = 'ff61022c8d2e88563eed43e9fd73382b'; // IMPORTANT: Replace with your actual TMDB API key
export const BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const PLACEHOLDER_IMAGE_URL = (width, height) => `https://placehold.co/${width}x${height}/374151/FFFFFF?text=No+Image`;

// --- DOM Elements ---
const profileIcon = document.getElementById('profileIcon');
const profileDropdown = document.getElementById('profileDropdown');
const searchInput = document.getElementById('header-search');
const mainContent = document.querySelector('.main-content');

// --- Event Listeners ---
profileIcon.addEventListener('click', (event) => {
    event.stopPropagation();
    profileDropdown.classList.toggle('active');
});

document.addEventListener('click', (event) => {
    if (!profileIcon.contains(event.target) && !profileDropdown.contains(event.target)) {
        profileDropdown.classList.remove('active');
    }
});

// --- Functions ---
function init() {
    console.log("Initializing MovieFlix...");
    if (API_KEY === 'YOUR_TMDB_API_KEY' || !API_KEY) {
        console.warn("TMDB API Key is not set. Please replace the API key in the script.");
        displayApiKeyWarning();
        return;
    }

    // Attach the focus event listener to the search input
    const searchInput = document.getElementById('header-search');
    if (searchInput) {
        searchInput.addEventListener('focus', handleSearchFocus);
    }

    // Add event listener to ask ai button
    const askAiBtn = document.querySelector('.header-btn-ask-ai');
    if (askAiBtn) {
        askAiBtn.addEventListener('click', () => {
            window.location.href = 'ask-ai.html';
        });
    }
    
    // Add event listener to mood recommend button
    const moodBtn = document.getElementById('moodRecommendBtn');
    if (moodBtn) {
        moodBtn.addEventListener('click', () => {
        window.location.href = 'mood-recommend.html';
        });
    }


    // Load homepage content if on index.html
    if (window.location.pathname.includes('index.html')) {
        loadMediaData('/movie/now_playing', 'latestMovies', true, 'grid');
        loadMediaData('/tv/on_the_air', 'latestTVShows', false, 'grid');
        loadMediaData('/movie/top_rated', 'topMovies', true, 'horizontal');
        loadMediaData('/tv/top_rated', 'topTVShows', false, 'horizontal');
    }

    // scroll to hash (section) after page loads
    const hash = window.location.hash; // Get URL hash (e.g., #latest-tv-shows)
    if (hash) {
        const targetSection = document.querySelector(hash);
        if (targetSection) {
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }, 500); // Delay to ensure page content is loaded
        }
    }
}

function displayApiKeyWarning() {
    const warningMessage = '<div class="error grid-span">Error: TMDB API Key not configured. Please set your API key in the script.</div>';
    const warningMessageFull = '<div class="error full-width">Error: TMDB API Key not configured. Please set your API key in the script.</div>';
    document.getElementById('latestMovies').innerHTML = warningMessage;
    document.getElementById('latestTVShows').innerHTML = warningMessage;
    document.getElementById('topMovies').innerHTML = warningMessageFull;
    document.getElementById('topTVShows').innerHTML = warningMessageFull;
}

async function fetchData(endpoint) {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Fetching data from: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            const errorData = await response.json();
            console.error('Error details:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Data received for ${endpoint}:`, data.results);
        return data.results || [];
    } catch (error) {
        console.error(`Error fetching data from ${endpoint}:`, error);
        return [];
    }
}

async function loadMediaData(endpoint, containerId, isMovie, layoutType) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found.`);
        return;
    }
    const loadingClass = layoutType === 'grid' ? 'grid-span' : 'full-width';
    container.innerHTML = `<div class="loading ${loadingClass}">Loading...</div>`;

    try {
        // Construct full endpoint with query parameters
        const fullEndpoint = `${endpoint}?api_key=${API_KEY}&language=en-US&page=1`;
        const results = await fetchData(fullEndpoint);
        container.innerHTML = ''; // Clear loading

        if (results.length === 0) {
            container.innerHTML = `<div class="no-data ${loadingClass}">No data available.</div>`;
            return;
        }

        results.forEach(item => {
            const card = createMediaCard(item, isMovie, layoutType);
            container.appendChild(card);
        });

    } catch (error) {
        console.error(`Error loading data into ${containerId}:`, error);
        container.innerHTML = `<div class="error ${loadingClass}">Failed to load data. Please try again later.</div>`;
    }
}

function createMediaCard(item, isMovie, layoutType) {
    const card = document.createElement('div');
    card.className = 'card'; // Base card class

    const title = isMovie ? item.title : item.name;
    const releaseDate = isMovie ? item.release_date : item.first_air_date;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    // Use appropriate placeholder size based on approximate card size
    const placeholderWidth = layoutType === 'horizontal' ? 130 : 140;
    const placeholderHeight = placeholderWidth * 1.5; // Maintain 2:3 ratio
    const posterPath = item.poster_path ? `${IMAGE_BASE_URL}w342${item.poster_path}` : PLACEHOLDER_IMAGE_URL(placeholderWidth, placeholderHeight);

    card.innerHTML = `
        <img src="${posterPath}"
             alt="${title}"
             class="card-img"
             onerror="this.src='${PLACEHOLDER_IMAGE_URL(placeholderWidth, placeholderHeight)}';">
        <div class="card-body">
            <h3 class="card-title" title="${title}">${title}</h3>
            <div class="card-year">${year}</div>
            <div class="card-rating">
                <span class="star">★</span>
                <span>${rating !== 'N/A' ? `${rating}/10` : 'No Rating'}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        console.log(`Clicked on ${isMovie ? 'Movie' : 'TV Show'} ID: ${item.id}`);
        // Navigate to the details page, passing the type and ID as parameters
        window.location.href = `details.html?type=${isMovie ? 'movie' : 'tv'}&id=${item.id}`;
    });

    return card;
}

let searchTimeout;

function handleSearchFocus() {
    // Check if we are already on the search.html page
    if (window.location.pathname.includes('search.html')) {
        return; // Do nothing if already on search.html
    }
    
    // Clear previous timeout if it exists
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // Set a new timeout
    searchTimeout = setTimeout(() => {
        // Get the current value of the search input
        const query = document.getElementById('header-search').value.trim();
        // Redirect to search.html with the query as a URL parameter
        window.location.href = `search.html?search=${encodeURIComponent(query)}`;
    }, 500); // 500 milliseconds
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);