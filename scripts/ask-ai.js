import { API_KEY } from "./main.js";
import { getGeminiAPIKey } from "./utils/gemini_api_key.js";

const GEMINI_API_KEY = getGeminiAPIKey();

// System instruction for Gemini
const SYSTEM_INSTRUCTION = `
You are an AI assistant for MovieFlix, a cinema-focused website similar to IMDb or TMDB. Your role is to answer user queries about movies, TV shows, documentaries, actors, directors, genres, cinema trivia, and related topics. Provide accurate, engaging, and concise answers in a friendly, cinematic tone that excites users about watching or learning more. For recommendation requests (e.g., "suggest movies," "recommend a show"), return a JSON array of up to 5 items with fields: "title" (string), "type" (string, e.g., "Movie", "TV Show"), "release_year" (string, optional), "genres" (array of strings, optional), and "reason" (string explaining why it matches the query). For all other queries, including requests for movie details (e.g., "tell me about a movie"), general questions, or capabilities, return plain text answers, avoiding JSON unless explicitly requested. If the query requires real-time data (e.g., latest releases), explain that your knowledge is based on available data and suggest using MovieFlix’s search or mood recommend features. Always aim to enhance the user’s cinema experience.
`;

// Chat history to maintain context
let chatHistory = [];

// Initialize page
window.onload = () => {  
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');
  const askAiBtn = document.querySelector('.header-btn-ask-ai');
  
  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (askAiBtn) {
    askAiBtn.addEventListener('click', () => {
      window.location.href = 'ask-ai.html';
    });
  }
};

// Send user message and fetch AI response
async function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const chatContainer = document.getElementById('chatContainer');
  const query = chatInput.value.trim();

  if (!query) return;

  // Add user message to chat
  addMessage('user', query);
  chatInput.value = '';

  // Add loading message
  const loadingId = addMessage('loading', 'Thinking...');

  try {
    // Combine system instruction with user query only for the first message
    const prompt = chatHistory.length === 0 
      ? `${SYSTEM_INSTRUCTION}\n---\nUser Query: ${query}`
      : query;

    // Update chat history
    chatHistory.push({ role: 'user', parts: [{ text: prompt }] });

    // Fetch AI response
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: chatHistory,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;

    // Remove loading message
    removeMessage(loadingId);

    // Try parsing as JSON
    try {
      const parsedContent = JSON.parse(content);
      if (Array.isArray(parsedContent)) {
        // Handle recommendation array
        displayRecommendations(parsedContent);
      } else if (parsedContent.response && typeof parsedContent.response === 'string') {
        // Handle JSON object with response field
        addMessage('ai', parsedContent.response);
      } else if (parsedContent.title && parsedContent.description) {
        // Handle single movie JSON object
        const formattedResponse = `
          <strong>${parsedContent.title} (${parsedContent.release_year || 'N/A'})</strong><br>
          <strong>Type:</strong> ${parsedContent.type || 'Unknown'}<br>
          <strong>Genres:</strong> ${(parsedContent.genres || []).join(', ') || 'N/A'}<br>
          <strong>Description:</strong> ${parsedContent.description || 'No description available.'}
        `;
        addMessage('ai', formattedResponse);
      } else {
        // Unexpected JSON format, treat as text
        addMessage('ai', content);
      }
    } catch {
      // Fallback to text response
      addMessage('ai', content);
    }

    // Update chat history
    chatHistory.push({ role: 'assistant', parts: [{ text: content }] });

    // Limit history to last 5 exchanges to avoid token limits
    if (chatHistory.length > 10) {
      chatHistory = chatHistory.slice(-10);
    }
  } catch (error) {
    console.error('API Error:', error.message);
    removeMessage(loadingId);
    addMessage('ai', 'Oops, something went wrong. Please check your API key or try again later.');
  }
}

// Add message to chat container
function addMessage(type, content) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}`;
  messageDiv.id = `msg-${Date.now()}`; // Unique ID for removal
  messageDiv.innerHTML = content;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to bottom
  return messageDiv.id;
}

// Remove message by ID
function removeMessage(id) {
  const message = document.getElementById(id);
  if (message) message.remove();
}

// Display recommendations as media cards
async function displayRecommendations(recommendations) {
  const chatContainer = document.getElementById('chatContainer');
  const gridDiv = document.createElement('div');
  gridDiv.className = 'recommendation-grid';
  chatContainer.appendChild(gridDiv);

  for (const rec of recommendations) {
    const tmdbData = await fetchTMDBData(rec);
    if (tmdbData) {
      const card = createMediaCard(tmdbData, rec.reason, rec.title);
      gridDiv.appendChild(card);
    } else {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-body">
          <h3 class="card-title">${rec.title || 'Unknown Title'}</h3>
          <p class="card-year">${rec.type || 'Unknown Type'}</p>
          <p class="card-reason"><strong>Reason:</strong> ${rec.reason || 'No reason provided'}</p>
          <button class="btn btn-gray watchlist-btn" disabled>Add to Watchlist</button>
        </div>
      `;
      card.addEventListener('click', () => {
        alert('Details unavailable for this title.');
      });
      gridDiv.appendChild(card);
    }
  }

  chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to bottom
}

// Fetch TMDB data
async function fetchTMDBData(recommendation) {
  const apiKey = API_KEY; // From main.js
  if (!apiKey) {
    console.error("TMDB API_KEY is not defined in main.js");
    return null;
  }
  let tmdbData = null;

  const mediaType = recommendation.type.toLowerCase().includes('movie') ? 'movie' : 'tv';
  const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${apiKey}&query=${encodeURIComponent(recommendation.title)}`;

  try {
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error(`TMDB search failed: ${response.statusText}`);
    const data = await response.json();
    const results = data.results || [];

    if (results.length === 0) {
      console.warn(`No TMDB results for "${recommendation.title}"`);
      return null;
    }

    tmdbData = results[0]; // Default to first result
    if (results.length > 1 && (recommendation.release_year || recommendation.genres)) {
      tmdbData = results.find(result => {
        const resultYear = (result.release_date || result.first_air_date || '').split('-')[0];
        const matchesYear = !recommendation.release_year || resultYear === recommendation.release_year;
        const resultGenres = result.genre_ids ? getGenreNames(result.genre_ids, mediaType, apiKey) : [];
        const matchesGenres = !recommendation.genres || recommendation.genres.some(g => resultGenres.includes(g));
        return matchesYear && matchesGenres;
      }) || results[0]; // Fallback to first result
    }
  } catch (error) {
    console.error(`Error fetching TMDB data for "${recommendation.title}":`, error);
  }

  return tmdbData;
}

// Helper function to get genre names
function getGenreNames(genreIds, mediaType) {
  const genreMap = {
    movie: {
      28: 'Action',
      35: 'Comedy',
      18: 'Drama',
      53: 'Thriller',
      10749: 'Romance',
      878: 'Sci-Fi',
      27: 'Horror',
      99: 'Documentary'
    },
    tv: {
      10759: 'Action',
      35: 'Comedy',
      18: 'Drama',
      53: 'Thriller',
      10749: 'Romance',
      878: 'Sci-Fi',
      27: 'Horror',
      99: 'Documentary'
    }
  };
  return genreIds.map(id => genreMap[mediaType][id]).filter(Boolean);
}

// Create media card
function createMediaCard(data, reason, fallbackTitle) {
  const card = document.createElement('div');
  card.className = 'card';
  const mediaType = data.media_type || (data.title ? 'movie' : 'tv');
  const title = data.title || data.name || fallbackTitle || 'Unknown Title';
  const releaseYear = (data.release_date || data.first_air_date || '').split('-')[0] || 'N/A';
  const posterPath = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : 'https://placehold.co/140x210/374151/FFFFFF?text=No+Image';

  card.innerHTML = `
    <img src="${posterPath}" alt="${title}" class="card-img" onerror="this.src='https://placehold.co/140x210/374151/FFFFFF?text=No+Image';">
    <div class="card-body">
      <h3 class="card-title">${title}</h3>
      <p class="card-year">${releaseYear}</p>
      <div class="card-rating">
        <span class="star">★</span> ${data.vote_average ? data.vote_average.toFixed(1) : 'N/A'}
      </div>
      <p class="card-reason"><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
      <button class="btn btn-gray watchlist-btn">Add to Watchlist</button>
    </div>
  `;

  card.querySelector('.watchlist-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    addToWatchlist({ id: data.id, type: mediaType, title, poster_path: data.poster_path });
  });

  card.addEventListener('click', () => {
    window.location.href = `details.html?id=${data.id}&type=${mediaType}`;
  });

  return card;
}

// Add to watchlist
function addToWatchlist(item) {
  let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
  const exists = watchlist.some(w => w.id === item.id && w.type === item.type);
  if (exists) {
    alert(`"${item.title}" is already in your watchlist!`);
    return;
  }
  watchlist.push({
    id: item.id,
    type: item.type,
    title: item.title,
    poster_path: item.poster_path || null
  });
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
  alert(`Added "${item.title}" to your watchlist!`);
}