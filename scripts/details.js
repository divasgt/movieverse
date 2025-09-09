/* details.js */
import { API_KEY, IMAGE_BASE_URL } from "./main.js";

function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

document.addEventListener('DOMContentLoaded', async () => {
  const id = getParam('id');
  const type = getParam('type') || 'movie';
  const baseUrl = `https://api.themoviedb.org/3/${type}/${id}?api_key=${API_KEY}&append_to_response=videos,release_dates,content_ratings,credits,keywords,similar,recommendations,external_ids,watch/providers`;

  try {
    const response = await fetch(baseUrl);
    if (!response.ok) throw new Error(`Failed to load details: ${response.statusText}`);
    const data = await response.json();
    
    // Store media data for AI chat
    window.movieFlixMediaData = {
      type,
      data,
      ageRating: getAgeRating(data, type)
    };

    renderDetails(data, type);
    initAIChat();
  } catch (err) {
    document.getElementById('detailsContainer').innerHTML = '<div class="error">Failed to load details.</div>';
    console.error(err);
  }
});

function getAgeRating(data, type) {
  if (type === 'movie' && data.release_dates) {
    const inRelease = data.release_dates.results.find(r => r.iso_3166_1 === 'IN');
    if (inRelease && inRelease.release_dates.length > 0) {
      return inRelease.release_dates[0].certification || 'NR';
    }
  } else if (type === 'tv' && data.content_ratings) {
    const inRating = data.content_ratings.results.find(r => r.iso_3166_1 === 'IN');
    if (inRating) {
      return inRating.rating || 'NR';
    }
  }
  return data.adult ? '18+' : 'All Ages';
}

function renderDetails(data, type) {
  const container = document.getElementById('detailsContainer');
  container.innerHTML = '';

  const posterDiv = document.createElement('div');
  posterDiv.className = 'poster';
  const img = document.createElement('img');
  img.src = data.poster_path ? `${IMAGE_BASE_URL}w342${data.poster_path}` : 'https://placehold.co/300x450/374151/FFFFFF?text=No+Image';
  img.alt = data.title || data.name;
  posterDiv.appendChild(img);

  const infoDiv = document.createElement('div');
  infoDiv.className = 'info';
  const releaseYear = (data.release_date || data.first_air_date || '').slice(0, 4);
  const ageRating = getAgeRating(data, type);
  const lengthOrSeasons = type === 'movie'
    ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`
    : `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}`;
  const typeLabel = type === 'movie' ? 'Movie' : 'TV Show';

  // Watch Providers
  let watchProvidersHtml = '<h2 class="watch-providers-title">Where to Watch</h2>';
  const providers = data['watch/providers']?.results?.IN;
  if (providers && (providers.flatrate || providers.buy || providers.rent)) {
    const allProviders = [
      ...(providers.flatrate || []),
      ...(providers.buy || []),
      ...(providers.rent || []),
    ].filter((v, i, a) => a.findIndex(t => t.provider_id === v.provider_id) === i); // Remove duplicates
    watchProvidersHtml += `
      <div class="watch-providers-container">
        ${allProviders.map(provider => {
          const logoUrl = provider.logo_path ? `${IMAGE_BASE_URL}w92${provider.logo_path}` : 'https://placehold.co/30x30/374151/FFFFFF?text=Logo';
          return `
            <a href="${providers.link}" target="_blank" class="btn btn-gray provider-btn">
              <img src="${logoUrl}" alt="${provider.provider_name}" class="provider-logo" onerror="this.src='https://placehold.co/30x30/374151/FFFFFF?text=Logo'">
              <span class="provider-name">${provider.provider_name}</span>
            </a>
          `;
        }).join('')}
      </div>
    `;
  } else {
    watchProvidersHtml += '<p class="no-providers">Not available for streaming in your region.</p>';
  }

  infoDiv.innerHTML = `
    <h1 class="title">${data.title || data.name} (${releaseYear})</h1>
    <p class="meta-inline">
      <span class="type">${typeLabel}</span> • 
      <span class="length">${lengthOrSeasons}</span> • 
      <span class="age-rating">${ageRating}</span>
    </p>
    <div class="genres">${data.genres.map(g => `<span class="genre-badge">${g.name}</span>`).join('')}</div>
    <div class="star-rating">
      <span class="star">★</span>
      <span class="rating-value">${data.vote_average.toFixed(1)}</span>
      <span class="out-of-10">/ 10</span>
      <span class="total-votes">(${data.vote_count.toLocaleString()} ratings)</span>
    </div>
    <div class="btn-group">
      <button id="playTrailer" class="btn btn-red"><i class="fa fa-play btn-icon"></i> Play Trailer</button>
      <button id="watchlistBtn" class="btn btn-gray"><span class="btn-icon">+</span> Add to Watchlist</button>
      <button id="askAiBtn" class="btn btn-ask-ai">Ask AI</button>
    </div>
    ${data.tagline ? `<p class="tagline">"${data.tagline}"</p>` : ''}
    ${watchProvidersHtml}
    <h2 class="overview-title">Overview</h2>
    <p class="overview">${data.overview}</p>
  `;

  container.append(posterDiv, infoDiv);

  const trailer = data.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const trailerModal = document.getElementById('trailerModal');
  const trailerIframe = document.getElementById('trailerIframe');
  const modalClose = document.getElementById('modalClose');

  const playTrailerBtn = document.getElementById('playTrailer');
  if (playTrailerBtn && trailer) {
    playTrailerBtn.addEventListener('click', () => {
      trailerIframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
      trailerModal.classList.add('show');
    });
  } else if (playTrailerBtn) {
    playTrailerBtn.addEventListener('click', () => alert('Trailer not available'));
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      trailerModal.classList.remove('show');
      trailerIframe.src = '';
    });
  }

  trailerModal.addEventListener('click', (e) => {
    if (e.target === trailerModal) {
      trailerModal.classList.remove('show');
      trailerIframe.src = '';
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (trailerModal && trailerModal.classList.contains('show')) {
        trailerModal.classList.remove('show');
        trailerIframe.src = '';
      }
    }
  });

  const watchBtn = document.getElementById('watchlistBtn');
  let list = JSON.parse(localStorage.getItem('watchlist') || '[]');
  let exists = list.some(item => item.id === data.id && item.type === type);

  if (exists) {
    watchBtn.innerHTML = '<i class="fa fa-check btn-icon"></i> Added to Watchlist';
  } else {
    watchBtn.innerHTML = '<span class="btn-icon">+</span> Add to Watchlist';
  }

  watchBtn.addEventListener('click', () => {
    if (exists) {
      list = list.filter(item => !(item.id === data.id && item.type === type));
      watchBtn.innerHTML = '<span class="btn-icon">+</span> Add to Watchlist';
    } else {
      list.push({ id: data.id, type, title: data.title || data.name, poster_path: data.poster_path });
      watchBtn.innerHTML = '<i class="fa fa-check btn-icon"></i> Added to Watchlist';
    }
    exists = !exists;
    localStorage.setItem('watchlist', JSON.stringify(list));
  });
}

function initAIChat() {
  const askAiBtn = document.getElementById('askAiBtn');
  const aiChatSection = document.getElementById('aiChatSection');
  if (askAiBtn && aiChatSection) {
    askAiBtn.addEventListener('click', async () => {
      // Dynamically import details-ai.js as an ES module
      if (!window.detailsAIScriptLoaded) {
        await import('./details-ai.js');
        window.detailsAIScriptLoaded = true;
      }
      
      aiChatSection.style.display = 'block';
      aiChatSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
}