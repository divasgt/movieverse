/* details-ai.js */
const GEMINI_API_KEY = ''; // Replace with your actual Gemini API key

// System instruction for Gemini
const SYSTEM_INSTRUCTION = `
You are an AI assistant for MovieFlix, specializing in answering questions about a specific movie or TV show. Use the provided media details to answer user queries accurately and engagingly in a cinematic tone. If the query requires information not available in the provided data, state: "I don't have enough information to answer this question fully. Try MovieFlix’s search for more details!" and provide a partial answer if possible. Avoid generating JSON unless explicitly requested.
`;

// Chat history to maintain context
let chatHistory = [];

window.onload = () => {
  const sendBtn = document.getElementById('sendBtn');
  const chatInput = document.getElementById('chatInput');
  const closeChatBtn = document.getElementById('closeChatBtn');

  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
      document.getElementById('aiChatSection').style.display = 'none';
    });
  }
};

async function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const chatContainer = document.getElementById('chatContainer');
  const query = chatInput.value.trim();

  if (!query) return;

  addMessage('user', query);
  chatInput.value = '';

  const loadingId = addMessage('loading', 'Thinking...');

  try {
    // Construct media details prompt
    const mediaData = window.movieFlixMediaData;
    if (!mediaData || !mediaData.data || !mediaData.type) {
      throw new Error('Media data is not available. Please reload the page.');
    }

    const type = mediaData.type;
    const data = mediaData.data; // Media data from TMDB
    const releaseYear = (data.release_date || data.first_air_date || '').slice(0, 4);
    const director = data.credits.crew.find(c => c.job === 'Director')?.name || 'N/A';
    const writer = data.credits.crew.find(c => c.job === 'Writer')?.name || 'N/A';

    const mediaPrompt = `
**Media Details**:
- **Title**: ${data.title || data.name}
- **Type**: ${type === 'movie' ? 'Movie' : 'TV Show'}
- **Release Year**: ${releaseYear || 'N/A'}
- **Genres**: ${data.genres.map(g => g.name).join(', ') || 'N/A'}
- **Tagline**: ${data.tagline || 'N/A'}
- **Overview**: ${data.overview || 'No description available'}
- **Runtime/Seasons**: ${type === 'movie' ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : `${data.number_of_seasons} seasons, ${data.number_of_episodes || 'N/A'} episodes`}
- **Age Rating**: ${mediaData.ageRating || 'N/A'}
- **Original Language**: ${data.original_language || 'N/A'}
- **Production Countries**: ${data.production_countries?.map(c => c.name).join(', ') || 'N/A'}
- **Cast**: ${data.credits.cast.slice(0, 5).map(c => `${c.name} as ${c.character}`).join(', ') || 'N/A'}
- **Director**: ${director}
- **Writer**: ${writer}
- **TMDB Rating**: ${data.vote_average.toFixed(1)}/10 (${data.vote_count} votes)
- **Popularity**: ${data.popularity || 'N/A'}
- **Status**: ${data.status || 'N/A'}
- **Keywords**: ${data.keywords.keywords?.map(k => k.name).join(', ') || data.keywords.results?.map(k => k.name).join(', ') || 'N/A'}
- **Production Companies**: ${data.production_companies?.map(c => c.name).join(', ') || 'N/A'}
- **Budget**: ${type === 'movie' && data.budget ? `$${data.budget.toLocaleString()}` : 'N/A'}
- **Revenue**: ${type === 'movie' && data.revenue ? `$${data.revenue.toLocaleString()}` : 'N/A'}
- **Networks**: ${type === 'tv' && data.networks ? data.networks.map(n => n.name).join(', ') : 'N/A'}
- **Trailers**: ${data.videos.results.filter(v => v.type === 'Trailer').map(v => v.name).join(', ') || 'None available'}
- **Similar Titles**: ${data.similar.results.slice(0, 3).map(s => s.title || s.name).join(', ') || 'N/A'}
- **Recommended Titles**: ${data.recommendations.results.slice(0, 3).map(r => r.title || r.name).join(', ') || 'N/A'}
- **IMDb ID**: ${data.external_ids.imdb_id || 'N/A'}

**User Query**: ${query}
    `;

    const prompt = chatHistory.length === 0 
      ? `${SYSTEM_INSTRUCTION}\n---\n${mediaPrompt}`
      : query;

    chatHistory.push({ role: 'user', parts: [{ text: prompt }] });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: chatHistory,
        generationConfig: {
          responseMimeType: 'text/plain'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const apiResponseData = await response.json();
    const content = apiResponseData.candidates[0].content.parts[0].text;

    removeMessage(loadingId);
    addMessage('ai', content);
    chatHistory.push({ role: 'assistant', parts: [{ text: content }] });

    if (chatHistory.length > 10) {
      chatHistory = chatHistory.slice(-10);
    }
  } catch (error) {
    console.error('API Error:', error.message);
    removeMessage(loadingId);
    addMessage('ai', 'Oops, something went wrong. Please try again later.');
  }
}

function addMessage(type, content) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}`;
  messageDiv.id = `msg-${Date.now()}`;
  messageDiv.innerHTML = content;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageDiv.id;
}

function removeMessage(id) {
  const message = document.getElementById(id);
  if (message) message.remove();
}