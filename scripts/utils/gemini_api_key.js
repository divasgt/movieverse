export function getGeminiAPIKey() {
  // check if key exists in session storage, if not then prompt for it
  let key = sessionStorage.getItem("GEMINI_API_KEY");
  if (!key) {
    key = prompt("For AI features to work - Please enter your Google Gemini API key (valid only for this session):");
    sessionStorage.setItem("GEMINI_API_KEY", key.trim());
  }

  console.log("Key being used:", key);
  return key;
}
