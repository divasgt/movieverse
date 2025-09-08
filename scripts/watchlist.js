import { IMAGE_BASE_URL } from "./main.js";

// const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

document.addEventListener('DOMContentLoaded', () => {
  renderWatchlist();
});

function renderWatchlist() {
  const container = document.getElementById('watchlistContainer');
  container.innerHTML = '';

  const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');

  if (watchlist.length === 0) {
    container.innerHTML = '<div class="no-data grid-span">Your watchlist is empty.</div>';
    return;
  }

  watchlist.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <a href="details.html?id=${item.id}&type=${item.type}">
        <img class="card-img" src="${item.poster_path ? `${IMAGE_BASE_URL}w342${item.poster_path}` : 'placeholder.png'}" alt="${item.title}">
      </a>
      <div class="card-body">
        <h3 class="card-title">${item.title}</h3>
        <p class="card-year">${item.type === 'movie' ? 'Movie' : 'TV Show'}</p>
        <button class="button btn btn-gray remove-btn" data-id="${item.id}" data-type="${item.type}">
          <i class="fa fa-trash btn-icon"></i> Remove
        </button>
      </div>
    `;
    container.appendChild(card);
  });

  // Add event listeners for remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      watchlist = watchlist.filter(item => !(item.id === id && item.type === type));
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      renderWatchlist(); // Re-render the watchlist
    });
  });
}