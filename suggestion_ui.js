// suggestion_ui.js - Script running inside the suggestion iframe - v0.4.3

let suggestionTextElement;
let suggestionEditElement;
let acceptButton;
let editAcceptButton;
let rejectButton;
let rewriteButton; 
let toneSelectElement; 
let languageSelectElement; 
let currentOriginalText = null; // Holds original selected text (suggestion) OR original tweet text (reply)
let currentIsReply = false; 

const STORAGE_KEY_LANGUAGE = 'aiCorrectorLastLanguage'; 
const STORAGE_KEY_TONE = 'aiCorrectorLastTone'; 
const DEFAULT_TONE = 'neutral'; 

async function initializeUI() { 
    console.log("Iframe Script: initializeUI() called."); 
    suggestionTextElement = document.getElementById('ai-suggestion-text');
    suggestionEditElement = document.getElementById('ai-suggestion-edit');
    acceptButton = document.getElementById('ai-accept-button');
    editAcceptButton = document.getElementById('ai-edit-accept-button');
    rejectButton = document.getElementById('ai-reject-button');
    rewriteButton = document.getElementById('ai-rewrite-button'); 
    toneSelectElement = document.getElementById('ai-tone-select'); 
    languageSelectElement = document.getElementById('ai-language-select'); 

    if (!suggestionTextElement || !suggestionEditElement || !acceptButton || !editAcceptButton || !rejectButton || !rewriteButton || !toneSelectElement || !languageSelectElement) { 
        console.error("Iframe Script: Suggestion UI elements NOT found in iframe."); 
        return;
    }
    console.log("Iframe Script: Found elements successfully."); 

    // --- Load Last Language ---
    try {
        const result = await chrome.storage.sync.get(STORAGE_KEY_LANGUAGE);
        if (result[STORAGE_KEY_LANGUAGE]) { languageSelectElement.value = result[STORAGE_KEY_LANGUAGE]; console.log("Iframe Script: Loaded last language:", result[STORAGE_KEY_LANGUAGE]); } 
        else { console.log("Iframe Script: No saved language found."); }
    } catch (error) { console.error("Iframe Script: Error loading language:", error); }
    
    // --- Load Last Tone ---
    try {
        const result = await chrome.storage.sync.get(STORAGE_KEY_TONE);
        if (result[STORAGE_KEY_TONE]) {
            const isValidOption = Array.from(toneSelectElement.options).some(opt => opt.value === result[STORAGE_KEY_TONE]);
            if (isValidOption) { toneSelectElement.value = result[STORAGE_KEY_TONE]; console.log("Iframe Script: Loaded last tone:", result[STORAGE_KEY_TONE]); } 
            else { toneSelectElement.value = DEFAULT_TONE; console.log("Iframe Script: Saved tone invalid, using default:", DEFAULT_TONE); }
        } else { toneSelectElement.value = DEFAULT_TONE; console.log("Iframe Script: No saved tone found, using default."); }
    } catch (error) { console.error("Iframe Script: Error loading tone:", error); }

    // --- Save Language on Change ---
    languageSelectElement.addEventListener('change', () => {
        const selectedLanguage = languageSelectElement.value;
        console.log("Iframe Script: Language changed to:", selectedLanguage);
        try { chrome.storage.sync.set({ [STORAGE_KEY_LANGUAGE]: selectedLanguage }, () => { if (chrome.runtime.lastError) { console.error("Iframe Script: Error saving language:", chrome.runtime.lastError); } else { console.log("Iframe Script: Saved language preference."); } }); } 
        catch (error) { console.error("Iframe Script: Exception saving language:", error); }
    });
    
    // --- Save Tone on Change ---
     toneSelectElement.addEventListener('change', () => {
        const selectedTone = toneSelectElement.value;
        console.log("Iframe Script: Tone changed to:", selectedTone);
        try { chrome.storage.sync.set({ [STORAGE_KEY_TONE]: selectedTone }, () => { if (chrome.runtime.lastError) { console.error("Iframe Script: Error saving tone:", chrome.runtime.lastError); } else { console.log("Iframe Script: Saved tone preference."); } }); } 
        catch (error) { console.error("Iframe Script: Exception saving tone:", error); }
    });

    window.addEventListener('message', handleMessageFromParent);

    suggestionTextElement.addEventListener('click', () => {
        console.log("Iframe Script: Suggestion text clicked for edit."); 
        suggestionTextElement.style.display = 'none';
        suggestionEditElement.style.display = 'block';
        acceptButton.style.display = 'none'; 
        editAcceptButton.style.display = 'inline-block'; 
        suggestionEditElement.value = suggestionTextElement.textContent; 
        suggestionEditElement.focus();
        setTimeout(sendHeightToParent, 50); 
    });

    window.parent.postMessage({ type: 'ai-corrector-iframe-ready' }, '*'); 
    console.log("Suggestion UI iframe script loaded and ready."); 
    setTimeout(sendHeightToParent, 50); 
}

let acceptListener = null;
let rejectListener = null;
let editAcceptListener = null;
let rewriteListener = null; 

function handleMessageFromParent(event) {
    if (event.data && event.data.type === 'ai-corrector-suggestion-data') {
        console.log("Suggestion UI received data:", event.data); 
        const payload = event.data.payload;
        
        currentOriginalText = payload.originalText; // This is the text the AI worked on (original selection or tweet text)
        currentIsReply = payload.isReply || false; 
        const elementId = payload.elementId || 'selection'; 

        populateSuggestion(payload.suggestion); // Populate with suggestion or reply
        adjustUIForType(currentIsReply); 

        // Remove previous listeners 
        if (acceptListener) acceptButton.removeEventListener('click', acceptListener);
        if (rejectListener) rejectButton.removeEventListener('click', rejectListener);
        if (editAcceptListener) editAcceptButton.removeEventListener('click', editAcceptListener);
        if (rewriteListener) rewriteButton.removeEventListener('click', rewriteListener); 
        console.log("Iframe Script: Removed previous button listeners.");

        // Define new listeners 
        rejectListener = () => handleReject(elementId); // Reject is always the same

        if (currentIsReply) {
            // Reply Mode
            acceptListener = () => handleCopy(payload.suggestion); 
            editAcceptListener = () => handleCopy(suggestionEditElement.value); 
            // Rewrite button regenerates the reply based on original tweet text
            rewriteListener = () => handleRegenerateReply(currentOriginalText, toneSelectElement, languageSelectElement); 
        } else {
            // Suggestion Mode
            acceptListener = () => handleAccept(elementId, suggestionTextElement.textContent);
            editAcceptListener = () => handleEditAccept(elementId, suggestionEditElement.value);
            // Rewrite button rewrites the original selected text
            rewriteListener = () => handleRewriteSuggestion(currentOriginalText, toneSelectElement, languageSelectElement); 
        }
        console.log("Iframe Script: Defined new listeners. Is Reply:", currentIsReply);

        // Add new listeners
        acceptButton.addEventListener('click', acceptListener);
        rejectButton.addEventListener('click', rejectListener);
        editAcceptButton.addEventListener('click', editAcceptListener);
        rewriteButton.addEventListener('click', rewriteListener); // Always add rewrite listener now
        
        console.log("Iframe Script: Added new button listeners.");
    }
}

function adjustUIForType(isReply) {
     const suggestionLabel = document.querySelector('.suggestion-content p:first-child strong');
     if (suggestionLabel) { suggestionLabel.textContent = isReply ? "Generated Reply:" : "Suggestion:"; }
     acceptButton.textContent = isReply ? "Copy" : "Accept";
     editAcceptButton.textContent = isReply ? "Copy Edit" : "Accept Edit";
     rewriteButton.style.display = 'inline-block'; // Always show rewrite button now
     
     suggestionTextElement.style.display = 'block';
     suggestionEditElement.style.display = 'none';
     acceptButton.style.display = 'inline-block';
     editAcceptButton.style.display = 'none';
     acceptButton.disabled = false;
     editAcceptButton.disabled = false;
}

function populateSuggestion(text) { if (suggestionTextElement && suggestionEditElement) { suggestionTextElement.textContent = text; suggestionEditElement.value = text; setTimeout(sendHeightToParent, 50); } }

// --- Button Handlers ---
function handleAccept(elementId, suggestion) { console.log("Iframe Script: handleAccept called"); sendMessageToParent({ type: 'ai-corrector-accept', payload: { elementId, suggestion } }); }
function handleEditAccept(elementId, suggestion) { console.log("Iframe Script: handleEditAccept called"); sendMessageToParent({ type: 'ai-corrector-accept', payload: { elementId, suggestion } }); }
function handleCopy(textToCopy) { console.log("Iframe Script: handleCopy called."); sendMessageToParent({ type: 'ai-corrector-copy', payload: { suggestion: textToCopy } }); const originalText = acceptButton.textContent; const originalEditText = editAcceptButton.textContent; acceptButton.textContent = "Copied!"; acceptButton.disabled = true; editAcceptButton.textContent = "Copied!"; editAcceptButton.disabled = true; setTimeout(() => { if (acceptButton) { acceptButton.textContent = "Copy"; acceptButton.disabled = false; } if (editAcceptButton) { editAcceptButton.textContent = "Copy Edit"; editAcceptButton.disabled = false; } }, 1500); }
function handleReject(elementId) { console.log("Iframe Script: handleReject called"); sendMessageToParent({ type: 'ai-corrector-reject', payload: { elementId } }); }

// Handles Rewrite for Suggestions
function handleRewriteSuggestion(originalText, toneSelect, languageSelect) { 
    const selectedTone = toneSelect.value; 
    const selectedLanguage = languageSelect.value; 
    console.log("Iframe Script: handleRewriteSuggestion called with:", { originalText, selectedTone, selectedLanguage }); 
    if (!originalText) { console.error("Iframe Script: Cannot rewrite suggestion, original text missing."); return; }
    try { chrome.storage.sync.set({ [STORAGE_KEY_TONE]: selectedTone }); } catch(e) { console.error("Iframe Script: Exception saving tone on rewrite:", e); }
    sendMessageToParent({ type: 'ai-corrector-rewrite', payload: { originalText, tone: selectedTone, language: selectedLanguage } });
}

// Handles Rewrite Again for Replies (Regenerate Reply)
function handleRegenerateReply(originalTweetText, toneSelect, languageSelect) {
    const selectedTone = toneSelect.value; 
    const selectedLanguage = languageSelect.value; 
    console.log("Iframe Script: handleRegenerateReply called with:", { originalTweetText, selectedTone, selectedLanguage }); 
    if (!originalTweetText) { console.error("Iframe Script: Cannot regenerate reply, original tweet text missing."); return; }
     // Save the selected tone as the last used one
    try { chrome.storage.sync.set({ [STORAGE_KEY_TONE]: selectedTone }); } catch(e) { console.error("Iframe Script: Exception saving tone on regenerate:", e); }
    // Send a different message type to content script
    sendMessageToParent({ type: 'ai-corrector-regenerate-reply', payload: { originalText: originalTweetText, tone: selectedTone, language: selectedLanguage } });
}

function sendMessageToParent(message) { console.log("Iframe Script: Posting message:", message.type); try { window.parent.postMessage(message, '*'); } catch (error) { console.error("Iframe Script: Error posting message:", error); } }
function sendHeightToParent() { const height = document.documentElement.scrollHeight; if (height > 0) { sendMessageToParent({ type: 'ai-corrector-resize-iframe', payload: { height: height } }); } else { console.warn("Iframe Script: Calculated height is 0."); } }

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => initializeUI().catch(console.error)); } else { initializeUI().catch(console.error); }
