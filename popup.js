// popup.js

const apiKeyInput = document.getElementById('api-key');
const saveButton = document.getElementById('save-button');
const statusDiv = document.getElementById('status');
const modelSelect = document.getElementById('model-select'); 
// NOTE: Tone selection is in the suggestion UI, not the main popup.
// We only need storage keys here.

const STORAGE_KEY_API = 'openRouterApiKey'; 
const STORAGE_KEY_MODEL = 'aiCorrectorModel'; 
const STORAGE_KEY_TONE = 'aiCorrectorLastTone'; // Key for tone storage
const DEFAULT_MODEL = 'gemini-2.0-flash'; 
const DEFAULT_TONE = 'neutral'; // Default tone

// Load saved settings when the popup opens
document.addEventListener('DOMContentLoaded', async () => {
  console.log("Popup DOM loaded.");
  statusDiv.textContent = ''; 

  // Load API Key
  try {
    const apiKeyResult = await chrome.storage.sync.get(STORAGE_KEY_API);
    if (apiKeyResult[STORAGE_KEY_API]) {
      apiKeyInput.value = apiKeyResult[STORAGE_KEY_API];
      console.log("Popup: Loaded saved API key.");
    } else {
      console.log("Popup: No API key found in storage.");
      apiKeyInput.placeholder = "Paste your Gemini API Key here";
    }
  } catch (error) {
    console.error("Popup: Error loading API key:", error);
    statusDiv.textContent = 'Error loading key.';
    statusDiv.style.color = 'red';
  }

  // Load Model Preference
  try {
    const modelResult = await chrome.storage.sync.get(STORAGE_KEY_MODEL);
    if (modelResult[STORAGE_KEY_MODEL]) {
      modelSelect.value = modelResult[STORAGE_KEY_MODEL];
      console.log("Popup: Loaded saved model preference:", modelResult[STORAGE_KEY_MODEL]);
    } else {
      modelSelect.value = DEFAULT_MODEL; 
      console.log("Popup: No saved model found, using default:", DEFAULT_MODEL);
    }
  } catch (error) {
    console.error("Popup: Error loading model preference:", error);
    if (!statusDiv.textContent) {
        statusDiv.textContent = 'Error loading model setting.';
        statusDiv.style.color = 'red';
    }
  }
  // Note: Tone is loaded/saved in suggestion_ui.js
});

// Save the API key when the save button is clicked
saveButton.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  console.log("Popup: Save button clicked.");
  statusDiv.textContent = ''; 

  if (!apiKey) {
    statusDiv.textContent = 'Please enter an API key.';
    statusDiv.style.color = 'red';
    return; 
  }

  try {
    await chrome.storage.sync.set({ [STORAGE_KEY_API]: apiKey });
    console.log("Popup: API Key saved successfully.");
    statusDiv.textContent = 'API Key saved!';
    statusDiv.style.color = 'green';
    setTimeout(() => { if (statusDiv.textContent === 'API Key saved!') { statusDiv.textContent = ''; } }, 3000);
  } catch (error) {
    console.error("Popup: Error saving API key:", error);
    statusDiv.textContent = 'Error saving key.';
    statusDiv.style.color = 'red';
  }
});

// Save the selected model when the dropdown changes
modelSelect.addEventListener('change', async () => {
    const selectedModel = modelSelect.value;
    console.log("Popup: Model selection changed to:", selectedModel);
    statusDiv.textContent = ''; 

    try {
        await chrome.storage.sync.set({ [STORAGE_KEY_MODEL]: selectedModel });
        console.log("Popup: Model preference saved successfully.");
        statusDiv.textContent = 'Model preference saved!';
        statusDiv.style.color = 'green';
        setTimeout(() => { if (statusDiv.textContent === 'Model preference saved!') { statusDiv.textContent = ''; } }, 3000);
    } catch (error) {
        console.error("Popup: Error saving model preference:", error);
        statusDiv.textContent = 'Error saving model preference.';
        statusDiv.style.color = 'red';
    }
});
