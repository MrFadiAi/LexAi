// Background service worker (background.js) - v0.4.6 - Explicit Contraction Correction Prompt

console.log("BG Script: Top level execution."); // Keep this

// --- Constants ---
const STORAGE_KEY_API = 'openRouterApiKey'; 
const STORAGE_KEY_MODEL = 'aiCorrectorModel'; 
const STORAGE_KEY_TONE = 'aiCorrectorLastTone'; 
const DEFAULT_MODEL = 'gemini-2.0-flash'; 
const DEFAULT_TONE = 'neutral'; 
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

// --- Variables (Loaded from Storage) ---
let GEMINI_API_KEY = ""; 
let AI_MODEL = DEFAULT_MODEL; 
let LAST_TONE = DEFAULT_TONE; 

// --- Load Initial Settings from Storage ---
async function loadSettings() { console.log("BG Script: Loading settings from storage..."); try { const result = await chrome.storage.sync.get([STORAGE_KEY_API, STORAGE_KEY_MODEL, STORAGE_KEY_TONE]); GEMINI_API_KEY = result[STORAGE_KEY_API] || ""; AI_MODEL = result[STORAGE_KEY_MODEL] || DEFAULT_MODEL; LAST_TONE = result[STORAGE_KEY_TONE] || DEFAULT_TONE; console.log("BG Script: Loaded API Key:", GEMINI_API_KEY ? '******' : '(Not Set)'); console.log("BG Script: Loaded Model:", AI_MODEL); console.log("BG Script: Loaded Last Tone:", LAST_TONE); } catch (error) { console.error("BG Script: Error loading settings from storage:", error); GEMINI_API_KEY = ""; AI_MODEL = DEFAULT_MODEL; LAST_TONE = DEFAULT_TONE; } }

// --- Storage Change Listener ---
chrome.storage.onChanged.addListener((changes, namespace) => { if (namespace === 'sync') { let settingsChanged = false; if (changes[STORAGE_KEY_API]) { GEMINI_API_KEY = changes[STORAGE_KEY_API].newValue || ""; console.log("BG Script: Updated API Key from storage change:", GEMINI_API_KEY ? '******' : '(empty)'); settingsChanged = true; } if (changes[STORAGE_KEY_MODEL]) { AI_MODEL = changes[STORAGE_KEY_MODEL].newValue || DEFAULT_MODEL; console.log("BG Script: Updated Model preference from storage change:", AI_MODEL); settingsChanged = true; } if (changes[STORAGE_KEY_TONE]) { LAST_TONE = changes[STORAGE_KEY_TONE].newValue || DEFAULT_TONE; console.log("BG Script: Updated Last Tone from storage change:", LAST_TONE); settingsChanged = true; } if (settingsChanged) { console.log("BG Script: Settings updated in memory due to storage change."); } } });

// --- Legacy Message Listener (Less Used) ---
try { if (chrome.runtime && chrome.runtime.onMessage) { console.log("BG Script: chrome.runtime.onMessage exists. Adding listener."); chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { console.log("BG Script (Legacy Listener): Listener triggered. Request:", request); if (request.action === "checkText") { const textToCheck = request.text; const requestedTone = request.tone || 'neutral'; const requestedLanguage = request.language || 'English'; console.log("BG Script (Legacy Listener): Received checkText action. Text:", textToCheck, "Tone:", requestedTone, "Language:", requestedLanguage); (async () => { try { console.log("BG Script (Legacy Listener): Calling getAISuggestion..."); const suggestion = await getAISuggestion(textToCheck, requestedTone, requestedLanguage); console.log("BG Script (Legacy Listener): Got suggestion:", suggestion); console.log("BG Script (Legacy Listener): Using sendResponse for suggestion."); sendResponse({ success: true, suggestion: suggestion || "No suggestion found." }); } catch (error) { console.error("BG Script (Legacy Listener): Error getting AI suggestion:", error); console.log("BG Script (Legacy Listener): Using sendResponse for error."); sendResponse({ success: false, error: error.message || "Unknown error during AI suggestion." }); } })(); console.log("BG Script (Legacy Listener): Returning true for async response."); return true; } console.log("BG Script (Legacy Listener): No async action, returning false."); return false; }); console.log("BG Script: Legacy Listener added."); } else { console.error("BG Script: chrome.runtime.onMessage is NOT available."); } } catch (e) { console.error("BG Script: Error during initial setup:", e); }

// --- Long-Lived Connections Listener (Primary) ---
chrome.runtime.onConnect.addListener((port) => {
  console.log(`BG Script: Connection established from ${port.sender?.tab ? 'tab ' + port.sender.tab.id : 'unknown source'}. Port name: ${port.name}`);
  if (port.name === 'ai-corrector') {
    port.onMessage.addListener((msg) => {
      console.log("BG Script (Port): Message received:", msg);
      if (msg.action === "checkText") {
        const { text: textToCheck, tone: requestedTone = LAST_TONE, language: requestedLanguage = 'English' } = msg; 
        console.log("BG Script (Port): Received checkText action. Text:", textToCheck, "Tone:", requestedTone, "Language:", requestedLanguage);
        (async () => {
          try {
            if (!GEMINI_API_KEY) { await loadSettings(); } 
            console.log("BG Script (Port): Calling getAISuggestion...");
            const suggestion = await getAISuggestion(textToCheck, requestedTone, requestedLanguage); 
            console.log("BG Script (Port): Got suggestion:", suggestion);
            port.postMessage({ type: "suggestionResponse", success: true, originalText: textToCheck, suggestion: suggestion || "No suggestion found." });
          } catch (error) {
            console.error("BG Script (Port): Error getting AI suggestion:", error);
            port.postMessage({ type: "suggestionResponse", success: false, originalText: textToCheck, error: error.message || "Unknown error." });
          }
        })();
      } 
      else if (msg.action === "generateReply") {
          const { text: originalText, tone: requestedTone = LAST_TONE, language: requestedLanguage = 'English' } = msg; 
          console.log(`BG Script (Port): Received generateReply action for "${originalText.substring(0,30)}...", Tone: ${requestedTone}, Lang: ${requestedLanguage}`);
          (async () => {
              try {
                  if (!GEMINI_API_KEY) { await loadSettings(); } 
                  console.log("BG Script (Port): Calling getAIReply...");
                  const reply = await getAIReply(originalText, requestedTone, requestedLanguage); 
                  console.log("BG Script (Port): Got reply:", reply);
                  port.postMessage({ type: "replyResponse", success: true, reply: reply });
              } catch (error) {
                  console.error(`BG Script (Port): Error generating reply for "${originalText.substring(0,30)}...":`, error);
                  port.postMessage({ type: "replyResponse", success: false, error: error.message || "Unknown error." });
              }
          })();
      }
      // Removed spell check handlers
    }); 
    port.onDisconnect.addListener(() => { console.log(`BG Script: Port ${port.name} disconnected.`); });
  } else { console.warn(`BG Script: Connection ignored from port named '${port.name}'`); }
}); 


// --- API Call Function (Suggestions/Translation) ---
async function getAISuggestion(text, tone = LAST_TONE, language = 'English') { 
  const currentApiKey = GEMINI_API_KEY; const currentModel = AI_MODEL; 
  console.log("BG Script: Using Model:", currentModel, "API Key starting with:", currentApiKey?.substring(0, 7), "Tone:", tone, "Language:", language); 
  if (!currentApiKey) { return `(Error: Gemini API Key not set. Please add your key in the extension popup.)`; } 
  let toneInstruction = `Apply a '${tone}' tone to the text.`; if (tone.toLowerCase() === 'funny') { toneInstruction = `Rewrite the text with witty, concise, slightly sarcastic internet humor (like a funny Twitter reply). Avoid emojis.`; } 
  let prompt; if (language.toLowerCase() === 'english') { prompt = `You are an English writing assistant. Review the following text for grammar, style, and natural phrasing. If corrections are needed, provide a revised version in English. If the text is already good, respond with the original text. ${toneInstruction} Keep the response concise and only provide the final revised text.\n\nOriginal text: "${text}"\n\nRevised text:`; } else { prompt = `You are an expert writing assistant and translator. Your goal is to make the text sound natural and fluent in the target language.\nFirst, review the following text for grammar, style, and natural phrasing, correcting it as needed while preserving the original meaning.\nSecond, translate the corrected text into ${language}. Ensure the translation is idiomatic and sounds like it was written by a native speaker of ${language}.\n${toneInstruction} \nKeep the response concise and provide ONLY the final translated text, without any introductory phrases like "Here is the translation:".\n\nOriginal text: "${text}"\n\nFinal text:`; } 
  const fullApiUrl = `${GEMINI_API_BASE_URL}${currentModel}:generateContent?key=${currentApiKey}`; 
  try { console.log(`BG Script: Fetching from Gemini API (${currentModel})... Prompt:\n${prompt}`); const response = await fetch(fullApiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }), }); console.log("BG Script: Gemini Fetch response status:", response.status); const data = await response.json(); if (!response.ok) { console.error("BG Script: Gemini API Error Response:", data); const errorMessage = data?.error?.message || JSON.stringify(data) || response.statusText; if (response.status === 400 && errorMessage.toLowerCase().includes('api key not valid')) { throw new Error(`Gemini API Error: API Key not valid. Please check the key in the extension popup.`); } else if (response.status === 403) { throw new Error(`Gemini API Error: Permission denied (Status 403). Check API key permissions or billing.`); } else if (response.status === 404) { throw new Error(`Gemini API Error: Model not found (Status 404). Check the selected model name.`); } throw new Error(`Gemini API request failed: ${response.status} ${errorMessage}`); } console.log("BG Script: Gemini response data:", data); if (data.candidates?.[0]?.content?.parts?.[0]?.text) { const suggestion = data.candidates[0].content.parts[0].text.trim(); console.log("BG Script: AI Suggestion received from Gemini:", suggestion); return suggestion; } else { const blockReason = data.candidates?.[0]?.finishReason; const safetyRatings = data.promptFeedback?.safetyRatings; console.warn("BG Script: No suggestion content found in Gemini API response.", { blockReason, safetyRatings, data }); if (blockReason === 'SAFETY') { throw new Error("Suggestion blocked by Gemini's safety filters."); } return text; } } catch (error) { console.error("BG Script: Error fetching from Gemini API:", error); throw error; } 
}

// --- API Call Function (Generate Reply) ---
async function getAIReply(originalText, tone = LAST_TONE, language = 'English') { 
    const currentApiKey = GEMINI_API_KEY;
    const currentModel = AI_MODEL; 
    console.log(`BG Script: Generating reply for "${originalText.substring(0, 50)}..." using Model: ${currentModel}, Tone: ${tone}, Lang: ${language}`);
    if (!currentApiKey) { console.warn("BG Script: Generate Reply - API Key not set."); throw new Error("API Key not set."); }
    let toneInstruction = `The reply should have a '${tone}' tone.`; if (tone.toLowerCase() === 'funny') { toneInstruction = `The reply should have a funny, slightly swag, witty, concise internet/twitter humor style. Avoid emojis.`; }
    let languageInstruction = `Generate the reply in English.`; if (language.toLowerCase() !== 'english') { languageInstruction = `Generate the reply directly in ${language}. Ensure the translation is idiomatic and sounds like it was written by a native speaker of ${language}.`; }
    const prompt = `Generate a concise and relevant reply to the following text. ${languageInstruction} ${toneInstruction} Keep the reply relatively short and focused on the original text.\n\nOriginal Text: "${originalText}"\n\nReply:`;
    const fullApiUrl = `${GEMINI_API_BASE_URL}${currentModel}:generateContent?key=${currentApiKey}`;
    try {
        console.log(`BG Script: Fetching Reply from Gemini API (${currentModel})... Prompt:\n${prompt}`);
        const response = await fetch(fullApiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], }), });
        console.log("BG Script: Reply Fetch response status:", response.status);
        const data = await response.json();
        if (!response.ok) { console.error("BG Script: Reply API Error Response:", data); const errorMessage = data?.error?.message || JSON.stringify(data) || response.statusText; throw new Error(`Gemini Reply request failed: ${response.status} ${errorMessage}`); }
        console.log("BG Script: Reply response data:", data);
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) { let reply = data.candidates[0].content.parts[0].text.trim(); console.log("BG Script: Raw reply result:", reply); reply = reply.replace(/^Reply:\s*/i, ''); console.log("BG Script: Parsed reply:", reply); return reply; } 
        else { console.warn("BG Script: No reply content found in Gemini API response.", data); throw new Error("Failed to generate reply content."); }
    } catch (error) { console.error("BG Script: Error fetching reply:", error); throw error; }
}

// --- Initialization ---
loadSettings().catch(console.error); 
chrome.runtime.onInstalled.addListener(() => { console.log("BG Script: onInstalled event fired."); });
console.log("BG Script: End of script execution (synchronous part).");
