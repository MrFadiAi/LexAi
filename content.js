// Content script (content.js) - v0.4.3 - Regenerate Reply & Copy Handling

console.log("LexAi content script loaded (v0.4.3).");

// --- Globals ---
let suggestionIframe = null; 
let actionButtonsContainer = null; 
let suggestButton = null; 
let replyButton = null; 
let currentSelectionRange = null; 
let currentSuggestionData = null; 
let isIframeReady = false; 
let backgroundPort = null; 

// --- Connection ---
function ensureBackgroundConnection() { if (!backgroundPort) { try { console.log("CS_DEBUG: Attempting to connect..."); const port = chrome.runtime.connect({ name: "ai-corrector" }); console.log("CS_DEBUG: Connection successful.", port); backgroundPort = port; backgroundPort.onMessage.addListener(handleBackgroundMessage); backgroundPort.onDisconnect.addListener(handleBackgroundDisconnect); } catch (error) { if (error.message.includes("Extension context invalidated")) { console.warn("CS_DEBUG: Failed connect (Context Invalidated). Refresh page.", error.message); } else { console.error("CS_DEBUG: Failed connect:", error); } backgroundPort = null; } } return backgroundPort; }
function handleBackgroundDisconnect() { console.error("CS_DEBUG: Background port disconnected."); backgroundPort = null; hideActionButtons(); hideSuggestionUI(); currentSelectionRange = null; }
async function postMessageWithRetry(message) { let port = ensureBackgroundConnection(); if (!port) { console.error("CS_DEBUG (Retry): Cannot post, initial connection failed."); currentSelectionRange = null; hideActionButtons(); hideSuggestionUI(); return; } try { port.postMessage(message); } catch (error) { if (error.message.includes("disconnected port")) { console.error("CS_DEBUG (Retry): Post failed (disconnected):", error.message); console.log("CS_DEBUG (Retry): Reconnecting and retrying..."); backgroundPort = null; port = ensureBackgroundConnection(); if (!port) { console.error("CS_DEBUG (Retry): Cannot post, reconnect failed."); currentSelectionRange = null; hideActionButtons(); hideSuggestionUI(); return; } try { console.log("CS_DEBUG (Retry): Retrying post:", message); port.postMessage(message); } catch (retryError) { console.error("CS_DEBUG (Retry): Second post attempt failed:", retryError); backgroundPort = null; currentSelectionRange = null; hideActionButtons(); hideSuggestionUI(); } } else { console.error("CS_DEBUG (Retry): Post failed (other error):", error); backgroundPort = null; currentSelectionRange = null; hideActionButtons(); hideSuggestionUI(); } } }

// --- Message Handling (from Background) ---
function handleBackgroundMessage(msg) { console.log("CS_DEBUG: Port message received:", msg?.type); if (msg.type === "suggestionResponse") { handleSuggestionResponse(msg); } else if (msg.type === "replyResponse") { handleReplyResponse(msg); } else { console.warn("CS_DEBUG: Received unknown message type:", msg.type); } }
function handleSuggestionResponse(msg) { console.log("CS_DEBUG: Handling 'suggestionResponse'. Success:", msg.success); if (!currentSelectionRange) { console.warn("CS_DEBUG: No range for suggestion response."); return; } if (msg.success) { currentSuggestionData = { originalText: msg.originalText, suggestion: msg.suggestion, isReply: false, elementId: 'selection' }; displaySuggestionUI(currentSelectionRange); } else { console.error("CS_DEBUG: Suggestion Error:", msg.error || "Unknown error"); alert(`Suggestion Error: ${msg.error || 'Unknown error'}`); hideSuggestionUI(); currentSelectionRange = null; } }
function handleReplyResponse(msg) { console.log("CS_DEBUG: Handling 'replyResponse'. Success:", msg.success); if (replyButton) { replyButton.textContent = 'Reply 💬'; replyButton.disabled = false; replyButton.style.backgroundColor = '#6c757d'; } if (!currentSelectionRange) { console.warn("CS_DEBUG: No selection range available to display reply UI."); if(msg.success && msg.reply) { navigator.clipboard.writeText(msg.reply).then(() => alert("Reply generated and copied (UI position lost).")).catch(() => alert("Reply generated but copy failed (UI position lost).")); } else if (!msg.success) { alert(`Reply Error: ${msg.error || 'Unknown error'}`); } return; } if (msg.success && msg.reply) { console.log("CS_DEBUG: Reply generation success. Preparing UI data."); currentSuggestionData = { originalText: currentSelectionRange.toString(), suggestion: msg.reply, isReply: true, elementId: 'selection' }; displaySuggestionUI(currentSelectionRange); } else { console.error("CS_DEBUG: Reply generation failed:", msg.error || "Unknown error"); alert(`Reply Error: ${msg.error || 'Unknown error'}`); hideActionButtons(); } }

// --- Action Buttons UI ---
function createActionButtons() { if (actionButtonsContainer) return; console.log("CS_DEBUG: Creating Action Buttons container."); actionButtonsContainer = document.createElement('div'); actionButtonsContainer.id = 'lexai-action-buttons'; Object.assign(actionButtonsContainer.style, { position: 'absolute', zIndex: '2147483646', display: 'none', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', padding: '4px', display: 'flex', gap: '4px' }); suggestButton = document.createElement('button'); suggestButton.textContent = 'Suggest ✨'; Object.assign(suggestButton.style, { padding: '5px 10px', fontSize: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.2s ease' }); suggestButton.onmouseover = () => { suggestButton.style.backgroundColor = '#0056b3'; }; suggestButton.onmouseout = () => { suggestButton.style.backgroundColor = '#007bff'; }; suggestButton.addEventListener('click', handleSuggestClick); actionButtonsContainer.appendChild(suggestButton); replyButton = document.createElement('button'); replyButton.textContent = 'Reply 💬'; Object.assign(replyButton.style, { padding: '5px 10px', fontSize: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', transition: 'background-color 0.2s ease' }); replyButton.onmouseover = () => { replyButton.style.backgroundColor = '#5a6268'; }; replyButton.onmouseout = () => { replyButton.style.backgroundColor = '#6c757d'; }; replyButton.addEventListener('click', handleReplyClick); actionButtonsContainer.appendChild(replyButton); document.body.appendChild(actionButtonsContainer); console.log("CS_DEBUG: Action buttons created and appended."); }
function showActionButtons(range) { if (!actionButtonsContainer) createActionButtons(); const rect = range.getBoundingClientRect(); if (!rect || (rect.width === 0 && rect.height === 0 && range.toString().length === 0)) { hideActionButtons(); return; } const scrollTop = window.pageYOffset || document.documentElement.scrollTop; const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft; let topPos = scrollTop + rect.bottom + 5; let leftPos = scrollLeft + rect.left; if (leftPos < 0) leftPos = 5; if (topPos < 0) topPos = 5; actionButtonsContainer.style.top = `${topPos}px`; actionButtonsContainer.style.left = `${leftPos}px`; actionButtonsContainer.style.display = 'flex'; console.log(`CS_DEBUG: Showing action buttons at top: ${topPos}, left: ${leftPos}`); }
function hideActionButtons() { if (actionButtonsContainer) { actionButtonsContainer.style.display = 'none'; } if (replyButton && replyButton.textContent !== 'Reply 💬') { replyButton.textContent = 'Reply 💬'; replyButton.disabled = false; replyButton.style.backgroundColor = '#6c757d'; } }

// --- Suggestion Popup UI ---
function displaySuggestionUI(range) { hideSuggestionUI(); hideActionButtons(); const rect = range.getBoundingClientRect(); if (!rect || (rect.width === 0 && rect.height === 0 && range.toString().length === 0)) { console.warn("CS_DEBUG: Invalid range rect for suggestion UI."); currentSelectionRange = null; return; } suggestionIframe = document.createElement('iframe'); suggestionIframe.id = 'ai-corrector-suggestion-iframe'; suggestionIframe.src = chrome.runtime.getURL('suggestion_ui.html'); Object.assign(suggestionIframe.style, { border: 'none', position: 'absolute', width: '300px', zIndex: '2147483647', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', borderRadius: '8px', backgroundColor: 'white', display: 'block', overflow: 'hidden' }); document.body.appendChild(suggestionIframe); const scrollTop = window.pageYOffset || document.documentElement.scrollTop; const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft; let topPos = scrollTop + rect.bottom + 5; let leftPos = scrollLeft + rect.left; if (leftPos < 0) leftPos = 5; if (topPos < 0) topPos = 5; suggestionIframe.style.top = `${topPos}px`; suggestionIframe.style.left = `${leftPos}px`; document.addEventListener('click', handleClickOutsideSuggestionUI, { capture: true, once: true }); isIframeReady = false; console.log("CS_DEBUG: Suggestion UI displayed."); }
function hideSuggestionUI() { if (suggestionIframe) { suggestionIframe.remove(); suggestionIframe = null; console.log("CS_DEBUG: Suggestion UI hidden."); } document.removeEventListener('click', handleClickOutsideSuggestionUI, { capture: true }); isIframeReady = false; }
function sendSuggestionToIframe() { if (suggestionIframe?.contentWindow && currentSuggestionData && isIframeReady) { console.log("CS_DEBUG: Sending data to suggestion iframe:", currentSuggestionData); suggestionIframe.contentWindow.postMessage({ type: 'ai-corrector-suggestion-data', payload: currentSuggestionData }, '*'); } } 
function handleClickOutsideSuggestionUI(event) { if (suggestionIframe && !suggestionIframe.contains(event.target)) { if (actionButtonsContainer && actionButtonsContainer.contains(event.target)) { document.addEventListener('click', handleClickOutsideSuggestionUI, { capture: true, once: true }); return; } console.log("CS_DEBUG: Click detected outside suggestion UI."); hideSuggestionUI(); } else if (suggestionIframe) { document.addEventListener('click', handleClickOutsideSuggestionUI, { capture: true, once: true }); } }

// --- Event Listeners Setup ---
function handleSelectionChange(event) { if (actionButtonsContainer?.contains(event.target) || suggestionIframe?.contains(event.target)) { return; } setTimeout(() => { const selection = window.getSelection(); if (!selection || selection.isCollapsed) { hideActionButtons(); if (selection && selection.rangeCount === 0) { hideSuggestionUI(); currentSelectionRange = null; } return; } const selectedText = selection.toString().trim(); if (selectedText.length > 1) { try { currentSelectionRange = selection.getRangeAt(0); showActionButtons(currentSelectionRange); hideSuggestionUI(); } catch (error) { console.error("CS_DEBUG: Error getting range:", error); hideActionButtons(); hideSuggestionUI(); currentSelectionRange = null; } } else { hideActionButtons(); } }, 100); }
function handleSuggestClick() { if (!currentSelectionRange) { console.error("CS_DEBUG: Suggest clicked but no range."); hideActionButtons(); return; } try { currentSelectionRange = currentSelectionRange.cloneRange(); } catch (error) { console.error("CS_DEBUG: Error cloning range:", error); hideActionButtons(); currentSelectionRange = null; return; } const selectedText = currentSelectionRange.toString().trim(); if (!selectedText) { console.error("CS_DEBUG: Suggest clicked but range empty."); hideActionButtons(); currentSelectionRange = null; return; } hideActionButtons(); postMessageWithRetry({ action: "checkText", text: selectedText, elementId: 'selection' }).catch(console.error); }
function handleReplyClick() { if (!currentSelectionRange) { console.error("CS_DEBUG: Reply clicked but no range."); hideActionButtons(); return; } const selectedText = currentSelectionRange.toString().trim(); if (!selectedText) { console.error("CS_DEBUG: Reply clicked but selection empty."); hideActionButtons(); currentSelectionRange = null; return; } console.log("CS_DEBUG: Requesting reply generation for:", selectedText); if(replyButton) { replyButton.textContent = "Generating..."; replyButton.disabled = true; } hideActionButtons(); postMessageWithRetry({ action: "generateReply", text: selectedText }).catch(console.error); }

// --- Iframe Message Handling ---
window.addEventListener('message', (event) => { 
    if (!event.data || !event.data.type?.startsWith('ai-corrector-')) return; 
    console.log("CS_DEBUG: Received message from iframe/window:", event.data.type); 
    
    if (event.data.type === 'ai-corrector-iframe-ready') { 
        isIframeReady = true; sendSuggestionToIframe(); 
    } 
    else if (event.data.type === 'ai-corrector-accept') { // Handles suggestion accept ONLY
        const payload = event.data.payload;
        console.log("CS_DEBUG: Received 'accept':", payload); 
        if (currentSelectionRange) { 
            try { 
                currentSelectionRange.deleteContents(); 
                const newNode = document.createTextNode(payload.suggestion); 
                currentSelectionRange.insertNode(newNode); 
                try { 
                    let targetElement = newNode.parentElement; 
                    while (targetElement && !['INPUT', 'TEXTAREA'].includes(targetElement.tagName) && targetElement.isContentEditable !== true) { targetElement = targetElement.parentElement; } 
                    if (targetElement) { 
                        const newRange = document.createRange(); newRange.setStartAfter(newNode); newRange.collapse(true); 
                        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(newRange); 
                        targetElement.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: payload.suggestion })); 
                        targetElement.dispatchEvent(new Event('change', { bubbles: true })); 
                        console.log("CS_DEBUG: Dispatched input/change events."); 
                    } else { window.getSelection().removeAllRanges(); } 
                } catch (eventError) { console.error("CS_DEBUG: Error dispatching events:", eventError); window.getSelection().removeAllRanges(); } 
            } catch (error) { console.error("CS_DEBUG: Error replacing content:", error); } 
        } else { console.error(`CS_DEBUG: Cannot accept suggestion, selection range lost.`); } 
        hideSuggestionUI(); currentSelectionRange = null; currentSuggestionData = null; 
    } 
    else if (event.data.type === 'ai-corrector-copy') { // Handles reply copy
        const payload = event.data.payload;
        console.log("CS_DEBUG: Received 'copy':", payload);
        navigator.clipboard.writeText(payload.suggestion)
            .then(() => {
                console.log("CS_DEBUG: Reply copied via iframe copy message.");
                // Feedback is handled in iframe
            })
            .catch(err => {
                console.error("CS_DEBUG: Failed to copy reply via iframe message:", err);
                alert("Failed to copy reply to clipboard."); // Alert user on failure
            });
        // Close UI after attempting copy (iframe shows feedback briefly)
        hideSuggestionUI(); currentSelectionRange = null; currentSuggestionData = null; 
    }
    else if (event.data.type === 'ai-corrector-reject') { 
        console.log("CS_DEBUG: Received 'reject'"); 
        hideSuggestionUI(); currentSelectionRange = null; currentSuggestionData = null; 
    } 
    else if (event.data.type === 'ai-corrector-rewrite') { // Handles rewrite for suggestions
        const payload = event.data.payload; console.log("CS_DEBUG: Received 'rewrite':", payload); 
        if (payload.originalText) { 
            hideSuggestionUI(); 
            if (!currentSelectionRange) { console.error("CS_DEBUG: Cannot rewrite, range lost."); return; } 
            // Use checkText action for rewrite/translate
            postMessageWithRetry({ action: "checkText", text: payload.originalText, elementId: 'selection', tone: payload.tone, language: payload.language }).catch(console.error); 
        } else { console.error("CS_DEBUG: Rewrite message missing original text."); } 
     } 
     else if (event.data.type === 'ai-corrector-regenerate-reply') { // Handles regenerate for replies
        const payload = event.data.payload; console.log("CS_DEBUG: Received 'regenerate-reply':", payload); 
        if (payload.originalText) { 
            hideSuggestionUI(); // Hide current UI
            if (!currentSelectionRange) { console.error("CS_DEBUG: Cannot regenerate reply, range lost."); return; } 
            // Send generateReply action again with original tweet text and new options
            // We need to pass tone/language from the iframe payload here
            postMessageWithRetry({ 
                action: "generateReply", 
                text: payload.originalText, 
                tone: payload.tone,       // Pass tone
                language: payload.language // Pass language (though reply currently ignores it)
            }).catch(console.error); 
        } else { console.error("CS_DEBUG: Regenerate reply message missing original text."); } 
     }
     else if (event.data.type === 'ai-corrector-resize-iframe') { 
         const newHeight = event.data.payload.height; 
         if (suggestionIframe && newHeight > 0) { suggestionIframe.style.height = `${newHeight + 5}px`; } 
     } 
});

// Add selection listeners
window.addEventListener('mouseup', handleSelectionChange, true); 
window.addEventListener('keyup', handleSelectionChange, true); 

// --- Initialization ---
ensureBackgroundConnection(); 
createActionButtons(); 
console.log("Content Script: Initial setup complete.");
