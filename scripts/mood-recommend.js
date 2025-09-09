import { API_KEY } from "./main.js";
import { getGeminiAPIKey } from "./utils/gemini_api_key.js";

// Add global variable to store the prompt
let finalPrompt = '';

// Define questions with their input types and options
const questions = [
  {
    id: 'type',
    text: 'What do you feel like watching today?',
    type: 'radio',
    options: ['Movie', 'TV Show', 'Documentary']
  },
  {
    id: 'genre',
    text: 'What genre(s) are you in the mood for?',
    type: 'checkbox',
    options: ['Action', 'Comedy', 'Drama', 'Thriller', 'Romance', 'Sci-Fi', 'Horror', 'Documentary']
  },
  {
    id: 'mood',
    text: 'Describe your mood, how are you feeling right now?',
    type: 'select',
    options: ['Need a laugh', 'Feeling nostalgic', 'Feeling alone', 'Want a thriller', 'Feeling adventurous', 'Want to cry', 'Other'],
    hasCustomInput: true
  },
  {
    id: 'language',
    text: 'What language would you prefer?',
    type: 'select',
    options: ['English', 'Hindi', 'Spanish', 'French', 'Other'],
    hasCustomInput: true
  },
  {
    id: 'country',
    text: 'Which country’s cinema interests you?',
    type: 'text',
    placeholder: 'e.g., Hollywood, Bollywood, Korean'
  },
  {
    id: 'trueEvents',
    text: 'Looking for something based on true events or real life?',
    type: 'radio',
    options: ['Yes', 'No', 'Don’t care']
  },
  {
    id: 'popularity',
    text: 'Do you want hidden gems or popular hits?',
    type: 'radio',
    options: ['Underrated gems', 'Popular titles']
  },
  {
    id: 'rating',
    text: 'What’s the minimum TMDB rating you’d like?',
    type: 'number',
    placeholder: 'e.g., 7.0 (leave blank for no minimum)',
    min: 0,
    max: 10,
    step: 0.1
  },
  {
    id: 'releaseYear',
    text: 'Any preferred release years? (e.g., 2010–2020)',
    type: 'text',
    placeholder: 'Enter a year or range (optional)'
  },
  {
    id: 'length',
    text: 'How much time do you have?',
    type: 'radio',
    options: ['Short (<90 min)', 'Average', 'Long (>150 min)']
  },
  {
    id: 'tone',
    text: 'What vibe are you going for?',
    type: 'radio',
    options: ['Light-hearted', 'Serious', 'Thought-provoking', 'Emotional', 'Mind-blowing']
  }
];

// State variables
let currentStep = 0;
const answers = {};


const GEMINI_API_KEY = getGeminiAPIKey();

// Initialize wizard
window.onload = () => {
  renderStep();
  const moodBtn = document.getElementById('moodRecommendBtn');
  if (moodBtn) {
    moodBtn.addEventListener('click', () => {
      window.location.href = 'mood-recommend.html';
    });
  }
};

// Render current question step
function renderStep() {
  const wizard = document.getElementById('moodWizard');
  const step = questions[currentStep];
  const customInput = step.hasCustomInput && answers[step.id] === 'Other' ? answers[step.id + '_custom'] || '' : '';

  const html = `
    <div class="wizard-step active">
      <div class="question">${step.text}</div>
      <div class="input-group">
        ${renderInput(step)}
        ${step.hasCustomInput ? `
          <input type="text" id="${step.id}_custom" class="custom-input" 
                 placeholder="Enter your ${step.id}" 
                 value="${customInput}" 
                 style="display: ${answers[step.id] === 'Other' ? 'block' : 'none'}; margin-top: 0.5rem;">
        ` : ''}
      </div>
      <div class="btn-group">
        ${currentStep > 0 ? '<button class="btn btn-gray" id="prevBtn">Back</button>' : '<div></div>'}
        <button class="btn btn-gray" id="skipBtn">Skip</button>
        <button class="btn btn-red" id="nextBtn">Next</button>
      </div>
    </div>
  `;
  wizard.innerHTML = html;

  // Attach event listeners
  const prevBtn = document.getElementById('prevBtn');
  const skipBtn = document.getElementById('skipBtn');
  const nextBtn = document.getElementById('nextBtn');
  if (prevBtn) prevBtn.addEventListener('click', prevStep);
  if (skipBtn) skipBtn.addEventListener('click', skipStep);
  if (nextBtn) nextBtn.addEventListener('click', nextStep);

  // Attach select change listener
  const select = document.getElementById(`${step.id}_select`);
  if (select) select.addEventListener('change', handleSelectChange);
}

// Render confirmation step
function renderConfirmation() {
  const wizard = document.getElementById('moodWizard');
  finalPrompt = `Recommend 5 movies, TV shows, or documentaries based on these preferences:\n` +
    questions.map(q => {
      let value = answers[q.id];
      if (q.id === 'mood' && value === 'Other') value = answers['mood_custom'] || 'Other';
      if (q.id === 'language' && value === 'Other') value = answers['language_custom'] || 'Other';
      return `- ${q.text}: ${Array.isArray(value) ? value.join(', ') : (value || '(skipped)')}`;
    }).join('\n') +
    `\nFor each recommendation, provide a JSON object with fields: "title" (string), "type" (string, e.g., "Movie", "TV Show", "Documentary"), "release_year" (string, e.g., "2020", optional), "genres" (array of strings, e.g., ["Drama", "Thriller"], optional), and "reason" (string explaining why this title matches the user's preferences or why it is recommended). Return the response as a JSON array of these objects.`;

  console.log('Final Prompt:', finalPrompt);

  const html = `
    <div class="wizard-step active">
      <div class="question">Ready to see your recommendations?</div>
      <div class="btn-group">
        <button class="btn btn-gray" id="prevBtn">Back</button>
        <button class="btn btn-red" id="getRecsBtn">Get Recommendations</button>
      </div>
    </div>
  `;
  wizard.innerHTML = html;

  // Attach event listeners
  document.getElementById('prevBtn').addEventListener('click', prevStep);
  document.getElementById('getRecsBtn').addEventListener('click', fetchRecommendations);
}

// Render input based on question type
function renderInput(step) {
  if (step.type === 'radio') {
    return step.options.map(opt => `
      <label style="display: block; margin-bottom: 0.5rem;">
        <input type="radio" name="${step.id}" value="${opt}" 
               ${answers[step.id] === opt ? 'checked' : ''}>
        ${opt}
      </label>
    `).join('');
  } else if (step.type === 'checkbox') {
    return step.options.map(opt => `
      <label style="display: block; margin-bottom: 0.5rem;">
        <input type="checkbox" name="${step.id}" value="${opt}" 
               ${answers[step.id] && answers[step.id].includes(opt) ? 'checked' : ''}>
        ${opt}
      </label>
    `).join('');
  } else if (step.type === 'select') {
    return `
      <select name="${step.id}" id="${step.id}_select">
        <option value="">Select an option</option>
        ${step.options.map(opt => `
          <option value="${opt}" ${answers[step.id] === opt ? 'selected' : ''}>${opt}</option>
        `).join('')}
      </select>
    `;
  } else if (step.type === 'text' || step.type === 'number') {
    return `
      <input type="${step.type}" name="${step.id}" 
             placeholder="${step.placeholder || ''}" 
             value="${answers[step.id] || ''}"
             ${step.min ? `min="${step.min}"` : ''} 
             ${step.max ? `max="${step.max}"` : ''} 
             ${step.step ? `step="${step.step}"` : ''}>
    `;
  }
  return '';
}

// Handle select change for "Other" option
function handleSelectChange(event) {
  const step = questions[currentStep];
  const customInput = document.getElementById(`${step.id}_custom`);
  if (customInput) {
    customInput.style.display = event.target.value === 'Other' ? 'block' : 'none';
  }
}

// Collect and move to next step
function nextStep() {
  const step = questions[currentStep];
  let value = null;

  if (step.type === 'radio') {
    const selected = document.querySelector(`input[name="${step.id}"]:checked`);
    value = selected ? selected.value : null;
  } else if (step.type === 'checkbox') {
    const checked = document.querySelectorAll(`input[name="${step.id}"]:checked`);
    value = Array.from(checked).map(input => input.value);
  } else if (step.type === 'select') {
    const select = document.querySelector(`select[name="${step.id}"]`);
    value = select.value || null;
    if (value === 'Other') {
      const customInput = document.getElementById(`${step.id}_custom`);
      answers[step.id + '_custom'] = customInput.value || null;
    } else {
      delete answers[step.id + '_custom'];
    }
  } else {
    const input = document.querySelector(`input[name="${step.id}"]`);
    value = input.value || null;
  }

  answers[step.id] = value;
  currentStep++;

  if (currentStep < questions.length) {
    renderStep();
  } else {
    renderConfirmation();
  }
}

// Skip current step
function skipStep() {
  const step = questions[currentStep];
  answers[step.id] = null;
  delete answers[step.id + '_custom'];
  currentStep++;
  if (currentStep < questions.length) {
    renderStep();
  } else {
    renderConfirmation();
  }
}

// Go back to previous step
function prevStep() {
  currentStep--;
  renderStep();
}

// Fetch recommendations from Gemini API
async function fetchRecommendations() {
  const wizard = document.getElementById('moodWizard');
  wizard.innerHTML = '<div class="loading">Fetching your recommendations...</div>';

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: finalPrompt
          }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
    const data = await response.json();
    console.log('Raw Gemini API Response:', data);
    const recommendations = JSON.parse(data.candidates[0].content.parts[0].text);
    console.log('Parsed Recommendations:', recommendations);
    displayResults(recommendations || []);
  } catch (error) {
    console.error('API Error:', error);
    displayError();
  }
}

// Display recommendations
async function displayResults(recommendations) {
  console.log("displayResults called with:", recommendations);

  const wizard = document.getElementById('moodWizard');
  const resultsContainer = document.getElementById('resultsContainer');
  const moodSection = document.querySelector('.mood-section');

  if (!resultsContainer || !wizard || !moodSection) {
    console.error("Required DOM elements missing:", { wizard, resultsContainer, moodSection });
    return;
  }

  moodSection.style.display = 'none';
  resultsContainer.style.display = 'block';

  if (recommendations.length === 0) {
    resultsContainer.innerHTML = `
      <div class="no-data">No recommendations found. Try again?</div>
      <button class="btn btn-red" onclick="restartWizard()">Try Again</button>
    `;
    wizard.innerHTML = '';
    console.log("No recommendations case executed");
    return;
  }

  wizard.innerHTML = '';
  resultsContainer.innerHTML = `
    <h2 class="section-title">Your Recommendations</h2>
    <div class="grid-container" id="recommendationCards"></div>
    <button class="btn btn-red" onclick="restartWizard()" style="margin-top: 1rem;">Try Again</button>
  `;

  const recommendationCards = document.getElementById('recommendationCards');
  if (!recommendationCards) {
    console.error("recommendationCards element not found");
    return;
  }

  for (const rec of recommendations) {
    const tmdbData = await fetchTMDBData(rec);
    console.log("TMDB Data for", rec.title, ":", tmdbData);
    if (tmdbData) {
      const card = createMediaCard(tmdbData, rec.reason, rec.title);
      recommendationCards.appendChild(card);
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
      recommendationCards.appendChild(card);
    }
  }
  console.log("Recommendations rendering complete");
}

// Fetch TMDB data with contextual validation
async function fetchTMDBData(recommendation) {
  const apiKey = API_KEY; // From main.js
  if (!apiKey) {
    console.error("TMDB API_KEY is not defined in main.js");
    return null;
  }
  let tmdbData = null;

  // Map Gemini type to TMDB media type
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

    // Find the best match
    tmdbData = results[0]; // Default to first result
    if (results.length > 1 && (recommendation.release_year || recommendation.genres)) {
      tmdbData = results.find(result => {
        const resultYear = (result.release_date || result.first_air_date || '').split('-')[0];
        const matchesYear = !recommendation.release_year || resultYear === recommendation.release_year;
        const resultGenres = result.genre_ids ? getGenreNames(result.genre_ids, mediaType, apiKey) : [];
        const matchesGenres = !recommendation.genres || recommendation.genres.some(g => resultGenres.includes(g));
        return matchesYear && matchesGenres;
      }) || results[0]; // Fallback to first result if no perfect match
    }
  } catch (error) {
    console.error(`Error fetching TMDB data for "${recommendation.title}":`, error);
  }

  return tmdbData;
}

// Helper function to get genre names from genre IDs (synchronous fallback for simplicity)
function getGenreNames(genreIds, mediaType) {
  // Simplified genre mapping (replace with API call if needed)
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

// Create media card with TMDB data
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

// Display error message
function displayError() {
  const wizard = document.getElementById('moodWizard');
  const resultsContainer = document.getElementById('resultsContainer');
  const moodSection = document.querySelector('.mood-section');
  moodSection.style.display = 'none';
  resultsContainer.style.display = 'block';
  resultsContainer.innerHTML = `
    <div class="error">Oops, something went wrong. Please try again!</div>
    <button class="btn btn-red" onclick="restartWizard()">Try Again</button>
  `;
  wizard.innerHTML = '';
}

// Restart wizard
function restartWizard() {
  currentStep = 0;
  Object.keys(answers).forEach(key => delete answers[key]);
  const moodSection = document.querySelector('.mood-section');
  const resultsContainer = document.getElementById('resultsContainer');
  moodSection.style.display = 'block';
  resultsContainer.style.display = 'none';
  renderStep();
}

// Add to watchlist functionality
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