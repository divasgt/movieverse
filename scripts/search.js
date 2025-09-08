import { API_KEY, BASE_URL, IMAGE_BASE_URL } from "./main.js";

async function fetchSearchResults(query) {
  const searchResultsContainer = document.getElementById('searchResults');

  if (!query) {
    searchResultsContainer.innerHTML = '<div class="no-data grid-span">No search query provided.</div>';
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=en-US&page=1&query=${encodeURIComponent(query)}`);
    const data = await response.json();

    searchResultsContainer.innerHTML = ''; // Clear loading message

    if (data.results.length === 0) {
      searchResultsContainer.innerHTML = '<div class="no-data grid-span">No results found.</div>';
      return;
    }

    data.results.forEach(item => {
      if (item.media_type === 'movie' || item.media_type === 'tv') {
        const isMovie = item.media_type === 'movie';
        const card = document.createElement('div');
        card.className = 'card';

        const title = isMovie ? item.title : item.name;
        const releaseDate = isMovie ? item.release_date : item.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const posterPath = item.poster_path ? `${IMAGE_BASE_URL}w342${item.poster_path}` : `https://placehold.co/140x210/374151/FFFFFF?text=No+Image`;

        card.innerHTML = `
            <img src="${posterPath}" alt="${title}" class="card-img">
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
          window.location.href = `details.html?type=${isMovie ? 'movie' : 'tv'}&id=${item.id}`;
        });

        searchResultsContainer.appendChild(card);
      }
    });
  } catch (error) {
    console.error('Error fetching search results:', error);
    searchResultsContainer.innerHTML = '<div class="error grid-span">Failed to load search results. Please try again later.</div>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('header-search');
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('search');

  // Fetch initial results if a query is present
  if (initialQuery) {
    fetchSearchResults(initialQuery);
  }

  // Add input event listener to update results dynamically
  searchInput.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    fetchSearchResults(query);
  });

  // Focus on the search input
  searchInput.focus();
});