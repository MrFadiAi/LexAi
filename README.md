# LexAi - AI-Powered Writing Assistant Chrome Extension

LexAi enhances your English writing across the web, providing suggestions, rewrites, translations, and reply generation powered by Google Gemini.

## Features

*   **Real-time Suggestions:** Select text on any webpage to get suggestions for grammar, style, and phrasing improvements.
*   **Tone Adjustment:** Rewrite suggestions in various tones (Neutral, Formal, Casual, Funny, Serious).
*   **Translation:** Translate suggestions into different languages (currently English and Arabic supported).
*   **Reply Generation:** Select text from a post (e.g., a tweet) and generate a relevant reply suggestion.
*   **Customizable AI:**
    *   Use your own Google Gemini API key.
    *   Select your preferred Gemini model (e.g., `gemini-2.0-flash`, `gemini-1.5-flash-latest`).
*   **Modern UI:** Clean and intuitive interface for suggestions and settings.

## Installation

Since this extension isn't on the Chrome Web Store yet, you need to load it manually as an "unpacked extension".

**Steps for Chrome / Edge:**

1.  **Download/Clone:** Download or clone this repository's files to a folder on your computer.
2.  **Open Extensions Page:**
    *   In Chrome, type `chrome://extensions` in your address bar and press Enter.
    *   In Edge, type `edge://extensions` in your address bar and press Enter.
3.  **Enable Developer Mode:** Find the "Developer mode" toggle (usually in the top-right corner) and turn it **ON**.
4.  **Load Unpacked:**
    *   Click the "Load unpacked" button that appears.
    *   Navigate to the folder where you saved the LexAi files (the folder containing `manifest.json`).
    *   Select the folder.
5.  **Done:** The LexAi extension icon should now appear in your browser's toolbar.

## Configuration: Getting Your API Key

LexAi requires a Google Gemini API key to function.

1.  **Get Your Key:**
    *   Visit the Google AI Studio API Key page: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
    *   Sign in with your Google account if prompted.
    *   Click "**Create API key in new project**" (or use an existing project if you prefer).
    *   Copy the generated API key. **Keep this key secure!**
2.  **Save Key in LexAi:**
    *   Click the LexAi extension icon in your browser toolbar to open the settings popup.
    *   Paste the copied API key into the "Google Gemini API Key" input field.
    *   Click the "Save Key" button. You should see a confirmation message.

## Usage

1.  **Suggestions/Rewrites/Translations:**
    *   Select a piece of text (more than one word, containing spaces) on any webpage.
    *   Two buttons will appear near your selection: "Suggest ✨" and "Reply 💬".
    *   Click "**Suggest ✨**".
    *   A popup will appear with the AI's suggestion.
    *   Use the **Tone** and **Language** dropdowns in the popup to modify the suggestion. Click "**Rewrite Again**" to apply changes.
    *   Click "**Accept**" to replace your original selected text with the suggestion.
    *   Click "**Reject**" to close the popup without changes.
    *   Click the suggestion text itself to edit it manually, then click "**Accept Edit**".
2.  **Reply Generation:**
    *   Select the text of the post/message you want to reply to (e.g., the main text of a tweet).
    *   Click the "**Reply 💬**" button that appears near your selection.
    *   The suggestion popup will appear, showing a generated reply based on the selected text.
    *   You can use the **Tone** and **Language** dropdowns and click "**Rewrite Again**" to refine the reply.
    *   Click the "**Copy**" button (the first button when in reply mode). This copies the generated reply to your clipboard.
    *   Click into the actual reply input field on the website (e.g., Twitter's reply box) and paste (Ctrl+V or Cmd+V).

## Support the Project

If you find LexAi useful, consider supporting its development:

[![Donate via Coinbase](https://commerce.coinbase.com/checkout/cabb081c-a821-496b-a6ec-ac9a2a5cb0bf)](https://commerce.coinbase.com/checkout/cabb081c-a821-496b-a6ec-ac9a2a5cb0bf)
*(Link: https://commerce.coinbase.com/checkout/cabb081c-a821-496b-a6ec-ac9a2a5cb0bf)*

## Credits

Created by [@Mr_CryptoYT](https://x.com/Mr_CryptoYT)
