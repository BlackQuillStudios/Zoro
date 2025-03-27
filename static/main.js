// static/main.js

document.addEventListener("DOMContentLoaded", () => {
    // --- Element Selections ---
    const chatContainer = document.getElementById("chat");
    const form = document.getElementById("chat-form");
    const input = document.getElementById("chat-input");
    const sidebarToggle = document.getElementById("toggle-sidebar");
    const sidebar = document.getElementById("sidebar");
    const settingsBtn = document.getElementById("settings-btn");
    const settingsOverlay = document.getElementById("settings-overlay");
    const closeSettingsBtn = document.getElementById("close-settings-btn");
    const themeSelect = document.getElementById("theme-select");
    const themeLink = document.getElementById("theme-style");
    const deleteAllOverlay = document.getElementById('delete-all-overlay');
    const canvasPanel = document.getElementById('canvas-panel');
    const canvasPanelIcon = document.getElementById('canvas-panel-icon');
    const canvasPanelTitle = document.getElementById('canvas-panel-title');
    const canvasPanelContent = document.getElementById('canvas-panel-content');
    const canvasCopyButton = document.getElementById('canvas-copy-button');
    const canvasCloseButton = document.getElementById('canvas-close-button');
    const canvasResizer = document.getElementById('canvas-resizer');

    // --- NEW: Image Input Elements ---
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const imagePreview = document.getElementById('image-preview');
    const clearImageBtn = document.getElementById('clear-image-btn');

    // --- State Variables ---
    let currentImageBase64 = null;
    let currentImageMimeType = null;

    // --- Constants ---
    const THEME_PATHS = { /* ... Theme paths ... */
        dark: "/static/themes/dark.css", light: "/static/themes/light.css", dracula: "/static/themes/dracula.css",
        monokai: "/static/themes/monokai.css", nord: "/static/themes/nord.css", 'gruvbox-dark': "/static/themes/gruvbox-dark.css",
        'solarized-dark': "/static/themes/solarized-dark.css", 'solarized-light': "/static/themes/solarized-light.css",
        ocean: "/static/themes/ocean.css", sky: "/static/themes/sky.css", forest: "/static/themes/forest.css",
        coffee: "/static/themes/coffee.css", terminal: "/static/themes/terminal.css", 'high-contrast': "/static/themes/high-contrast.css"
    };
    const THEME_NAMES = Object.keys(THEME_PATHS);
    const THEME_KEY = 'chat_theme_name';
    const DEFAULT_THEME = 'dark';
    const TYPE_EFFECT_DELAY = 1; // Slightly slower typing? Adjust as needed.
    const MAX_IMAGE_SIZE_MB = 4; // Max image size allowed (adjust as needed for Gemini limits)

    // --- Helper Functions ---
    const scrollToBottom = () => { requestAnimationFrame(() => { if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight; }); };

    // --- NEW: Image Handling Functions ---
    function displayImagePreview(file) {
        if (!file || !imagePreviewArea || !imagePreview) return;

        // Size Check
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            alert(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size allowed is ${MAX_IMAGE_SIZE_MB}MB.`);
            clearSelectedImage(); // Clear the invalid selection
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            imagePreview.src = dataUrl;
            imagePreviewArea.style.display = 'block'; // Show preview area

            // Extract base64 data (remove prefix 'data:mime/type;base64,')
            const base64String = dataUrl.split(',')[1];
            currentImageBase64 = base64String;
            currentImageMimeType = file.type; // Store MIME type

            console.log(`Image selected: ${file.name}, Type: ${currentImageMimeType}, Size: ${file.size} bytes`);
        };
        reader.onerror = (e) => {
             console.error("File reading error:", e);
             alert("Error reading image file.");
             clearSelectedImage();
        }
        reader.readAsDataURL(file);
    }

    function clearSelectedImage() {
        if (imageUploadInput) imageUploadInput.value = null; // Reset file input
        if (imagePreviewArea) imagePreviewArea.style.display = 'none'; // Hide preview
        if (imagePreview) imagePreview.src = '#'; // Reset preview src
        currentImageBase64 = null; // Clear stored data
        currentImageMimeType = null;
        console.log("Image selection cleared.");
        if(input) input.focus(); // Refocus text input
    }

    // --- NEW: Event Listeners for Image Handling ---
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                displayImagePreview(file);
            } else {
                // Handle case where user cancels file selection (might not be strictly necessary)
                if (!currentImageBase64) { // Only clear if nothing was successfully loaded before
                     clearSelectedImage();
                }
            }
        });
    } else { console.error("#image-upload input not found."); }

    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', clearSelectedImage);
    } else { console.error("#clear-image-btn not found."); }


    // --- Canvas Panel Logic ---
    // [...] Keep existing canvas panel logic (openCanvasPanel, listeners)
    function openCanvasPanel(type, content) {
        if (!canvasPanel || !canvasPanelContent || !canvasPanelIcon || !canvasPanelTitle || !canvasCopyButton) { console.error("PANEL ERROR: Canvas panel base elements not found!"); return; }
        console.log(`PANEL: Opening Canvas. Type: ${type}`);
        const decodedContent = content.replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
        canvasPanelContent.innerHTML = ''; canvasPanelContent.removeAttribute('contenteditable');
        canvasPanelContent.classList.remove('canvas-content-code', 'canvas-content-writing');

        if (type === 'Code') {
            canvasPanelTitle.textContent = "Code Canvas";
            canvasPanelIcon.innerHTML = '<i class="fa-solid fa-code"></i>';
            canvasPanelContent.classList.add('canvas-content-code');
            // Code canvas content is NOT editable by default, but pre/code makes text selectable
            canvasPanelContent.innerHTML = `<pre><code class='language-plaintext hljs'>${DOMPurify.sanitize(decodedContent)}</code></pre>`; // Use plaintext initially
            if (typeof hljs !== 'undefined') {
                try {
                    const codeBlock = canvasPanelContent.querySelector('code');
                    if (codeBlock) {
                        // Attempt auto-detection, or set a default language if needed
                        hljs.highlightElement(codeBlock);
                    }
                } catch(e) { console.error("HLJS error in canvas:", e); }
            }
            canvasCopyButton.style.display = 'block';
            // Re-bind copy listener to ensure it captures the current decodedContent
            const newCopyButton = canvasCopyButton.cloneNode(true);
            canvasCopyButton.parentNode.replaceChild(newCopyButton, canvasCopyButton);
            // Store reference to the new button for potential re-binding later if needed
            // canvasCopyButton = newCopyButton; // Reassign if needed elsewhere
            newCopyButton.addEventListener('click', async () => {
                 if (!navigator.clipboard) { alert('Clipboard access not available or denied.'); return; }
                 try {
                     await navigator.clipboard.writeText(decodedContent);
                     newCopyButton.innerHTML = '<i class="fa-solid fa-check"></i>';
                     newCopyButton.classList.add('copied');
                     setTimeout(() => {
                         newCopyButton.innerHTML = '<i class="fa-regular fa-copy"></i>';
                         newCopyButton.classList.remove('copied');
                     }, 1500);
                 } catch (err) {
                     console.error('Failed to copy to clipboard:', err);
                     alert('Failed to copy content.');
                 }
            });
        } else if (type === 'Writing') {
            canvasPanelTitle.textContent = "Writing Canvas";
            canvasPanelIcon.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
            canvasPanelContent.classList.add('canvas-content-writing');
            canvasPanelContent.contentEditable = 'true'; // Make Writing canvas editable
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                marked.setOptions({ breaks: true, gfm: true });
                const html = DOMPurify.sanitize(marked.parse(decodedContent),{USE_PROFILES:{html:true}});
                canvasPanelContent.innerHTML = html;
            }
            else {
                canvasPanelContent.textContent = decodedContent; // Fallback to plain text
            }
            canvasCopyButton.style.display = 'none'; // Hide copy button for editable writing
        }

        // Show panel with transition
        canvasPanel.style.display = 'flex';
        canvasPanel.style.opacity = '0';
        canvasPanel.style.transform = 'translateX(30px)'; // Start slightly off-screen
        requestAnimationFrame(() => {
            canvasPanel.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            canvasPanel.style.opacity = '1';
            canvasPanel.style.transform = 'translateX(0)';
        });
    }

    if (canvasCloseButton && canvasPanel) {
        canvasCloseButton.addEventListener('click', () => {
             canvasPanel.style.opacity = '0';
             canvasPanel.style.transform = 'translateX(30px)';
             canvasPanel.addEventListener('transitionend', () => {
                  if (canvasPanel.style.opacity === '0') { // Check if it's the closing transition
                      canvasPanel.style.display = 'none';
                  }
             }, { once: true });
        });
    }

    if (canvasResizer && canvasPanel) { /* ... Existing Resizer logic (optional) ... */ }


    // --- Process Markdown / Canvas Commands ---
    // [...] Keep existing processSingleMessageMarkdown function
    function processSingleMessageMarkdown(messageDiv, rawMarkdownText) {
        const bodyContainer = messageDiv.querySelector('.message-body-raw, .message-body-typing, .message-body-final');
        const contentDiv = messageDiv.querySelector('.message-content');
        if (!bodyContainer || !contentDiv) { console.error("PROCESS: Missing body/content container", messageDiv); return; }

        const textToProcess = rawMarkdownText || bodyContainer.textContent.trim(); // Use passed text if available
        if (!textToProcess) { /* console.log("PROCESS: Skipping empty text."); */ return; } // Be less verbose

        // console.log("PROCESS: Starting for text snippet:", textToProcess.substring(0,50)+"...");

        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') { console.error("PROCESS: Markdown/DOMPurify libraries not loaded."); bodyContainer.textContent = textToProcess; return; } // Show raw text if libs failed

        bodyContainer.innerHTML = ''; bodyContainer.style.display = 'block'; // Ensure it's block for markdown elements

        try {
            marked.setOptions({ breaks: true, gfm: true });
            // Regex: canvas(Type)("Content") - Ensure content handles escaped quotes correctly
            const canvasRegex = /canvas\((Code|Writing)\)\(\"((?:\\.|[^\"\\])*)\"\)/gs;
            let lastIndex = 0; let match; const fragment = document.createDocumentFragment();
            let openedCanvas = false; // Track if a canvas was opened by *this* message

            while ((match = canvasRegex.exec(textToProcess)) !== null) {
                console.log("PROCESS: Found canvas command:", match[1]);
                const [fullMatch, type, content] = match;
                const textBefore = textToProcess.substring(lastIndex, match.index);

                // 1. Process text *before* canvas
                if (textBefore.trim()) {
                    // Sanitize and parse Markdown for the text part
                    const beforeHtml = DOMPurify.sanitize(marked.parse(textBefore.trim()));
                    // Create a temporary div to parse the HTML string into nodes
                    const tempDivBefore = document.createElement('div');
                    tempDivBefore.style.display = 'contents'; // Use 'contents' to avoid extra div layer
                    tempDivBefore.innerHTML = beforeHtml;
                    // Append parsed nodes to the fragment
                    while(tempDivBefore.firstChild) { fragment.appendChild(tempDivBefore.firstChild); }
                }

                // 2. Trigger opening the canvas panel (does not add content to the message body)
                const decodedContent = content.replace(/\\\"/g, '"').replace(/\\\\/g, '\\');
                console.log(`PROCESS: Calling openCanvasPanel, Type: ${type}`);
                openCanvasPanel(type, decodedContent); // Call panel function
                openedCanvas = true; // Mark that a canvas was actioned

                lastIndex = canvasRegex.lastIndex; // Update position for next search
            }

            // 3. Process text *after* the last canvas command (or all text if no canvas found)
            const textAfter = textToProcess.substring(lastIndex);
            if (textAfter.trim()) {
                 const afterHtml = DOMPurify.sanitize(marked.parse(textAfter.trim()));
                 const tempDivAfter = document.createElement('div');
                 tempDivAfter.style.display = 'contents'; // Use 'contents'
                 tempDivAfter.innerHTML = afterHtml;
                 while(tempDivAfter.firstChild) { fragment.appendChild(tempDivAfter.firstChild); }
            }

            // 4. Append the processed non-canvas fragment to the message body
            bodyContainer.appendChild(fragment);

            // Detect if only whitespace/empty elements remain after processing
            const hasVisibleContent = bodyContainer.textContent.trim().length > 0 || bodyContainer.querySelector('img, video, hr, table, blockquote') !== null; // Check for non-text elements too

            // 5. If a canvas was opened AND there's no other visible content in the message body, add a placeholder
            if (openedCanvas && !hasVisibleContent) {
                 console.log("PROCESS: Adding canvas placeholder to message body.");
                 const placeholder = document.createElement('em');
                 placeholder.style.opacity = '0.7';
                 placeholder.style.marginLeft = '4px'; // Add space after 'Zoro:'
                 placeholder.textContent = '[Content displayed in Canvas panel]';

                 // Insert placeholder after the 'Zoro: ' span
                 const prefixSpan = contentDiv.querySelector('span[style*="font-weight: bold"]');
                 if (prefixSpan && prefixSpan.nextSibling) {
                     prefixSpan.parentNode.insertBefore(placeholder, prefixSpan.nextSibling);
                 } else if (prefixSpan) {
                      prefixSpan.parentNode.appendChild(placeholder);
                 } else {
                     bodyContainer.insertBefore(placeholder, bodyContainer.firstChild); // Fallback
                 }
                 bodyContainer.style.display = 'inline'; // Keep inline with prefix if only placeholder
            } else if (!hasVisibleContent) {
                 // If no canvas opened and no content, maybe show something?
                 // console.log("PROCESS: Message body is effectively empty after processing.");
                 // bodyContainer.style.display = 'none'; // Or hide it?
            } else {
                 bodyContainer.style.display = 'block'; // Ensure block display if markdown added block elements
            }

             // 6. Highlight standalone code blocks within the processed message body
             if (typeof hljs !== 'undefined') {
                 // Find code blocks that are not inside our specific canvas structure
                 const codeBlocksInMessage = bodyContainer.querySelectorAll('pre code:not(.hljs)');
                 codeBlocksInMessage.forEach(block => {
                     // Basic check to avoid re-highlighting if already processed somehow
                     if (!block.classList.contains('hljs')) {
                          try {
                              hljs.highlightElement(block);
                          } catch (e) {
                              console.warn("HLJS error during message processing:", e);
                          }
                     }
                 });
             }


            // Update classes
            bodyContainer.classList.remove('message-body-raw', 'message-body-typing');
            bodyContainer.classList.add('message-body-final');
            // console.log("PROCESS: Finished processing message.");

        } catch (e) {
            console.error("PROCESS: Markdown/Canvas processing error:", e, "\nOriginal Text:", textToProcess);
            // Fallback: display raw text if processing fails catastrophically
            bodyContainer.textContent = textToProcess;
            bodyContainer.style.display = 'inline';
            bodyContainer.classList.remove('message-body-typing', 'message-body-final');
            bodyContainer.classList.add('message-body-raw');
        }
    }


    // --- Append Message Function ---
    // MODIFIED: Adds indicator for user message if image was attached during submission.
    function appendMessageVisual(type, text, time = null, options = { typeEffect: false, imageAttached: false }) {
        if (!chatContainer) return;

        const useEffect = options.typeEffect; // Decide upfront if typing effect is requested

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        // Add data-needs-processing for initial load OR if typing effect is disabled for bot messages
        if (type === 'bot' && !useEffect) {
             messageDiv.dataset.needsProcessing = "true";
        }

        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');
        avatarDiv.textContent = (type === 'user' ? 'Y' : 'Z');
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        const prefixSpan = document.createElement('span');
        prefixSpan.style.fontWeight = 'bold';
        prefixSpan.textContent = (type === 'user' ? 'You: ' : 'Zoro: ');
        contentDiv.appendChild(prefixSpan);
        contentDiv.appendChild(document.createTextNode(' ')); // Space after prefix

        const bodyDiv = document.createElement('div');
        bodyDiv.style.display = 'inline'; // Default to inline
        // Use 'message-body-typing' if effect will run, otherwise 'message-body-raw'
        bodyDiv.classList.add(useEffect ? 'message-body-typing' : 'message-body-raw');
        contentDiv.appendChild(bodyDiv);

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        if (type === 'bot' && time) {
             const t=document.createElement('span');
             t.classList.add('response-time');
             t.textContent=time;
             messageDiv.appendChild(t);
        }
        chatContainer.appendChild(messageDiv);

        // --- Handle Content Display ---
        let displayText = text;
        // If it's a user message being added right now AND an image was attached for THIS submission
        if (type === 'user' && options.imageAttached) {
            displayText += " [Image attached]"; // Append indicator for immediate display
        }

        if (type === 'bot' && useEffect) {
            // --- Bot Typing Effect ---
            bodyDiv.textContent = ''; let charIndex = 0; let typingIntervalId = null;
            const typeCharacter = () => {
                if (charIndex < text.length) { // Use original 'text' for typing
                    bodyDiv.textContent += text.charAt(charIndex);
                    charIndex++;
                    // Smart scrolling: only scroll if near the bottom
                    if (chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 100) {
                         scrollToBottom();
                    }
                    typingIntervalId = setTimeout(typeCharacter, TYPE_EFFECT_DELAY);
                } else {
                    // Typing finished - NOW process the full text for Markdown/Canvas
                    console.log("APPEND (Bot): Typing effect finished, processing message.");
                    processSingleMessageMarkdown(messageDiv, text); // Pass original full text
                    scrollToBottom(); // Final scroll
                }
            };
            typingIntervalId = setTimeout(typeCharacter, TYPE_EFFECT_DELAY); // Start typing
        } else {
            // --- No Typing Effect (User Message or Bot without effect/Initial Load) ---
            bodyDiv.textContent = displayText; // Use potentially modified displayText for user

            if (type === 'bot') {
                 // If this is a NEW bot message (not initial load) but typing was skipped, process it NOW
                 if (!messageDiv.hasAttribute('data-needs-processing')) {
                     console.log("APPEND (Bot): Typing skipped, processing message immediately.");
                     processSingleMessageMarkdown(messageDiv, text); // Use original bot text for processing
                 }
                 // If it HAS 'data-needs-processing', it will be handled by the initial load loop later.
            }
             // For user messages, no further processing needed here.

            // Ensure block display if message likely contains block elements (basic check)
             if (type === 'bot' && (text.includes('\n```') || text.includes('\n* ') || text.includes('\n1. '))) {
                  bodyDiv.style.display = 'block';
             }

             scrollToBottom(); // Scroll immediately if not typing
        }
    }


    // --- Typing Indicator Functions ---
    const showTyping = () => { if (!chatContainer) return; removeTyping(); const t = document.createElement("div"); t.className = "typing"; t.id = "typing-indicator"; t.textContent = "Thinking"; for (let i = 0; i < 3; i++) { const d = document.createElement("span"); d.textContent = "."; t.appendChild(d); } chatContainer.appendChild(t); scrollToBottom(); };
    const removeTyping = () => { const t = document.getElementById("typing-indicator"); if (t) t.remove(); };

    // --- Chat Form Submission ---
    // MODIFIED: Includes image data and validation
    if (form && input && imageUploadInput) { // Check all relevant inputs exist
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const userInput = input.value.trim();
            const imageToSend = currentImageBase64; // Capture state at time of submission
            const mimeToSend = currentImageMimeType;

            // --- Validation: Ensure at least text or image is present ---
            if (!userInput && !imageToSend) {
                alert("Please enter a message or attach an image.");
                input.focus(); // Focus text input
                return;
            }

            const submitButton = form.querySelector('input[type="submit"]');

            // Append user message visually (add indicator if image was included)
            appendMessageVisual("user", userInput, null, { typeEffect: false, imageAttached: !!imageToSend });

            // Clear inputs *after* capturing values and appending visual
            input.value = "";
            clearSelectedImage(); // Clear preview and stored image data/mime

            showTyping();
            input.disabled = true;
            imageUploadInput.disabled = true; // Disable file input during processing
            if (submitButton) submitButton.disabled = true;

            try {
                // --- Prepare Payload ---
                const payload = { message: userInput };
                if (imageToSend && mimeToSend) {
                    payload.image_data = imageToSend;
                    payload.image_mime_type = mimeToSend;
                    console.log(`Sending payload with image (Type: ${mimeToSend})`);
                } else {
                     console.log("Sending payload with text only");
                }

                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                removeTyping(); // Remove typing indicator regardless of success/failure

                if (!res.ok) {
                    let errorMsg = `Request failed: ${res.status} ${res.statusText}`;
                    try {
                        const errorData = await res.json();
                        errorMsg = errorData.error || errorMsg; // Use specific error from backend if available
                    } catch (jsonError) {
                        // Backend didn't send valid JSON error
                         errorMsg = await res.text() || errorMsg; // Use raw text response if possible
                    }
                     console.error("Chat API Error Response:", errorMsg); // Log the detailed error
                    throw new Error(errorMsg); // Throw the error to be caught below
                }

                const data = await res.json();

                // Append bot response with typing effect
                appendMessageVisual("bot", data.bot, data.time, { typeEffect: true });

                // Update chat title in sidebar if changed
                if (data.title) {
                    const pathParts = window.location.pathname.split('/');
                    const currentChatId = pathParts[pathParts.length - 1];
                    if (currentChatId) {
                        const chatLink = document.querySelector(`.chat-link[data-chat-id="${currentChatId}"] .chat-name`);
                        if (chatLink && chatLink.textContent !== data.title) {
                            chatLink.textContent = data.title;
                        }
                    }
                }

            } catch (err) {
                // removeTyping() was already called
                console.error("Chat API Fetch/Processing Error:", err);
                // Display error message in the chat
                appendMessageVisual("bot", `(Error: ${err.message || 'Failed to get response...'})`, null, { typeEffect: false }); // No effect for error
            } finally {
                // Re-enable inputs
                input.disabled = false;
                imageUploadInput.disabled = false;
                if (submitButton) submitButton.disabled = false;
                input.focus(); // Focus back on text input
                // Ensure image state is definitely clear (belt-and-suspenders)
                if (currentImageBase64) clearSelectedImage();
            }
        });
    } else {
         console.error("Chat form or inputs (#chat-input, #image-upload) not found.");
    }

    // --- Sidebar Toggle ---
    // [...] Keep existing sidebar logic

    // --- Settings Modal Logic ---
    // [...] Keep existing settings modal logic

    // --- Theme Selection Logic ---
    // [...] Keep existing theme logic

    // --- Global Click Listener ---
    // [...] Keep existing global click listener

    // --- Initial Scroll & Focus ---
    requestAnimationFrame(() => { setTimeout(scrollToBottom, 100); }); // Slightly longer delay
    if (input) input.focus();

    // --- Keyboard Shortcut (Ctrl/Cmd+Enter to Send) ---
    if (input) {
        input.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault(); // Prevent default newline behavior
                form.requestSubmit(); // Trigger form submission
            }
        });
    }

    // --- Process Existing Bot Messages on Load ---
    console.log("Processing existing bot messages for Markdown/Canvas...");
    // Use setTimeout to allow the initial render to potentially finish
    setTimeout(() => {
        const existingBotMessages = document.querySelectorAll('.message.bot[data-needs-processing="true"]');
        let processedCount = 0;
        existingBotMessages.forEach(messageDiv => {
            const bodyRaw = messageDiv.querySelector('.message-body-raw');
            if (bodyRaw) {
                const rawText = bodyRaw.textContent; // No trim here, process exactly what's saved
                processSingleMessageMarkdown(messageDiv, rawText);
                processedCount++;
            }
            messageDiv.removeAttribute('data-needs-processing'); // Mark as processed
        });
        console.log(`Processed ${processedCount} existing bot messages.`);
        // Scroll again after processing might have changed heights
        setTimeout(scrollToBottom, 200);
    }, 100); // Delay processing slightly after DOM ready

    // --- Define Global Functions needed by inline HTML ---
    // [...] Keep existing global function definitions (toggleDropdown, confirmDeleteAll, etc.)
    window.toggleDropdown = (e, id) => { e.stopPropagation(); document.querySelectorAll('.dropdown').forEach(d => { if (d.id !== 'dropdown-' + id) d.style.display = 'none'; }); const dropdown = document.getElementById('dropdown-' + id); if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block'; };
    window.confirmDeleteAll = () => { const o = document.getElementById('delete-all-overlay'); if (o) { o.style.display = 'flex'; requestAnimationFrame(() => { o.classList.add("visible"); }); } return false; }; // Prevent form submission
    window.proceedDeleteAll = () => { const f = document.querySelector("form[action*='/delete_all']"); if (f) f.submit(); else console.error("Delete all form not found."); };
    window.cancelDeleteAll = () => { const o = document.getElementById('delete-all-overlay'); if (o) { o.classList.remove("visible"); /* Use transitionend listener for hiding if needed */ } };
     // Close dropdowns on outside click
    document.addEventListener('click', (event) => {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            if (!dropdown.contains(event.target) && !event.target.classList.contains('dots-btn')) {
                dropdown.style.display = 'none';
            }
        });
         // Close modal if clicking outside the modal-box (optional)
         // if (event.target.classList.contains('modal-overlay') && !event.target.classList.contains('confirmation-overlay')) {
         //    closeSettingsModal(); // Or a more generic close function
         // }
    }, true); // Use capture phase to potentially catch clicks sooner


}); // End DOMContentLoaded
