# --- START OF FILE App.py ---

from flask import Flask, request, render_template, session, redirect, url_for, jsonify
import subprocess
import os
import time
import uuid
import sys # Import sys for stderr printing

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "supersecret")

@app.route('/')
def root_redirect():
    if 'active_chat' not in session:
        return redirect(url_for('new_chat'))
    # Redirect to the currently active chat, or create a new one if none is active
    # This handles cases where the active_chat might have been deleted
    active_chat_id = session.get('active_chat')
    if active_chat_id and active_chat_id in session.get('chats', {}):
         return redirect(url_for('index', chat_id=active_chat_id))
    else:
        # If active chat doesn't exist (e.g., after deletion), clear it and redirect to new
        session.pop('active_chat', None)
        return redirect(url_for('new_chat'))


@app.route('/chat/<chat_id>')
def index(chat_id):
    if 'chats' not in session:
        session['chats'] = {}

    # Ensure the requested chat exists, otherwise redirect to new chat
    if chat_id not in session['chats']:
        # Maybe flash a message here? "Chat not found."
        return redirect(url_for('new_chat'))


    chat_history = session['chats'].get(chat_id, [])
    session['active_chat'] = chat_id # Set the current chat as active

    # Prepare list of saved chats for the sidebar
    saved_chats = {}
    # Ensure we iterate over a copy of keys in case session changes during iteration (less likely here)
    chat_ids_in_session = list(session.get('chats', {}).keys())
    for i, cid in enumerate(chat_ids_in_session):
         # Use f-string formatting for title key
         title_key = f"{cid}_title"
         # Provide a default title if none exists
         default_title = f"Chat {i+1}" # Consider making default based on creation time or first message later
         saved_chats[cid] = {'title': session.get(title_key, default_title)}

    return render_template(
        "index.html",
        chat_history=chat_history,
        saved_chats=saved_chats,
        active_chat=chat_id
    )

@app.route('/new')
def new_chat():
    if 'chats' not in session:
        session['chats'] = {}

    chat_id = str(uuid.uuid4())
    session['chats'][chat_id] = [] # Initialize with empty history
    session[f"{chat_id}_title"] = "" # Initialize empty title
    session['active_chat'] = chat_id
    session.modified = True # Ensure session changes are saved
    print(f"Created new chat: {chat_id}", file=sys.stderr)
    return redirect(url_for('index', chat_id=chat_id))

@app.route('/delete/<chat_id>', methods=['POST'])
def delete_chat(chat_id):
    next_chat_id = None
    if 'chats' in session and chat_id in session['chats']:
        print(f"Deleting chat: {chat_id}", file=sys.stderr)
        session['chats'].pop(chat_id, None)
        session.pop(f"{chat_id}_title", None) # Remove title as well

        # If the deleted chat was the active one, try to find the next available chat to make active
        if session.get('active_chat') == chat_id:
            session.pop('active_chat')
            # Find another chat to redirect to, if any exist
            remaining_chats = list(session.get('chats', {}).keys())
            if remaining_chats:
                next_chat_id = remaining_chats[0] # Go to the first remaining chat
                session['active_chat'] = next_chat_id

    session.modified = True
    # Redirect to the next chat if found, otherwise to the root (which handles creating a new one)
    if next_chat_id:
        return redirect(url_for('index', chat_id=next_chat_id))
    else:
        return redirect(url_for('root_redirect'))


# --- UPDATED /api/chat ENDPOINT ---
@app.route('/api/chat', methods=['POST'])
def api_chat():
    try:
        data = request.get_json()
        if not data:
             return jsonify({"error": "Invalid request data."}), 400

        user_input = data.get('message', '') # Default to empty string
        chat_id = session.get('active_chat')

        # Get potential image data from the request
        image_b64_data = data.get('image_data') # Expecting base64 string (data only, no prefix)
        image_mime_type = data.get('image_mime_type') # E.g., 'image/jpeg', 'image/png'

        if not chat_id:
            print("ERROR: No active chat session found.", file=sys.stderr)
            return jsonify({"error": "No active chat session. Please start a new chat."}), 400

        # Validate input - Ensure there's at least text or an image
        if not user_input and not image_b64_data:
             print("ERROR: No message or image provided.", file=sys.stderr)
             return jsonify({"error": "Please provide a message or attach an image."}), 400
        if image_b64_data and not image_mime_type:
             print("ERROR: Image data provided without MIME type.", file=sys.stderr)
             return jsonify({"error": "Image data is missing its type information (MIME type)."}), 400

        start = time.time()

        # --- Build the command for subprocess ---
        # Ensure the path to your Python executable in the virtual environment is correct
        python_executable = "c:/Users/blake/Documents/Projects/AI/venv/Scripts/python.exe"
        # Alternatively, if the venv is activated globally or you run flask from within it:
        # python_executable = sys.executable # This uses the python that runs Flask

        main_script = "main.py"
        cmd = [python_executable, main_script, user_input]

        # Append image data and mime type as separate arguments if they exist
        if image_b64_data and image_mime_type:
            cmd.append(image_b64_data)
            cmd.append(image_mime_type)
            print(f"DEBUG: Calling main.py for chat {chat_id} with text and image (MIME: {image_mime_type}, Size: ~{len(image_b64_data)*3/4} bytes)", file=sys.stderr)
        else:
             print(f"DEBUG: Calling main.py for chat {chat_id} with text only", file=sys.stderr)
        # --------------------------------------

        # Consider a longer timeout if image processing might take time
        timeout_seconds = 60
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True, # Keep as text; base64 is text-safe
                check=False, # Don't raise exception on non-zero exit; we check stderr
                timeout=timeout_seconds
            )
        except subprocess.TimeoutExpired:
            print(f"ERROR: main.py subprocess timed out after {timeout_seconds} seconds.", file=sys.stderr)
            return jsonify({"error": f"The request took too long to process (>{timeout_seconds}s). Please try again, perhaps with a smaller image or simpler query."}), 504 # 504 Gateway Timeout
        except FileNotFoundError:
             print(f"ERROR: Python executable or main.py not found. Checked path: {python_executable}, {main_script}", file=sys.stderr)
             return jsonify({"error": "Server configuration error: Cannot execute the AI script."}), 500
        except Exception as proc_err: # Catch other potential subprocess errors
             print(f"ERROR: Failed to run main.py subprocess: {proc_err}", file=sys.stderr)
             return jsonify({"error": f"Server error executing AI script: {proc_err}"}), 500


        end = time.time()
        duration = f"{(end - start):.2f}s"
        bot_response = result.stdout.strip()
        stderr_output = result.stderr.strip()

        # Print stderr from main.py for debugging
        if stderr_output:
            # Log stderr from the AI script for server-side debugging
            print(f"DEBUG (main.py stderr for chat {chat_id}):\n{stderr_output}", file=sys.stderr)

        # Improved Error Handling based on subprocess output
        if result.returncode != 0 and not bot_response:
            # If subprocess failed and gave no stdout, try to use stderr
            error_detail = stderr_output if stderr_output else f"Process exited with code {result.returncode}"
            # Sanitize potentially long errors before sending to client
            if len(error_detail) > 500:
                error_detail = error_detail[:500] + "..."
            print(f"ERROR: main.py execution failed for chat {chat_id}. Exit code: {result.returncode}. Stderr: {stderr_output}", file=sys.stderr)
            # Try to extract a specific error if main.py formatted it
            if "ERROR:" in stderr_output:
                 extracted_error = stderr_output.split("ERROR:")[-1].strip()
                 user_error_message = f"AI script failed: {extracted_error}"
            else:
                 user_error_message = f"AI script encountered an error (Code {result.returncode}). Check server logs for details."

            return jsonify({"error": user_error_message}), 500 # Internal Server Error
        elif not bot_response:
             # Handle cases where the script ran okay (exit code 0) but output nothing
             # This could be due to safety filters or legitimate empty responses
             print(f"WARN: main.py produced no output for chat {chat_id}. Stderr: {stderr_output}", file=sys.stderr)
             bot_response = "(No response generated. This could be due to safety filters or the nature of the request.)"


        # --- Update Chat History ---
        # Create the user entry text, noting if an image was attached
        user_entry_display = user_input
        if image_b64_data:
            # Add a marker to the displayed user message
            user_entry_display += " [Image attached]"

        new_entry = {'user': user_entry_display, 'bot': bot_response, 'time': duration}

        if 'chats' not in session:
            session['chats'] = {} # Should not happen if chat_id exists, but safe check
        if chat_id not in session['chats']:
             # This case should ideally not be hit due to checks above, but as a fallback:
             print(f"WARN: Chat ID {chat_id} not found in session during history update. Re-initializing.", file=sys.stderr)
             session['chats'][chat_id] = []

        session['chats'][chat_id].append(new_entry)
        session.modified = True # Crucial to save the session changes

        # --- Automatic Title Generation (only if title is missing or empty) ---
        current_chat = session['chats'][chat_id]
        title_key = f"{chat_id}_title"
        existing_title = session.get(title_key, "").strip()

        # Generate title only if needed (first few messages and no existing title)
        # Limit title generation to prevent excessive API calls
        if isinstance(current_chat, list) and len(current_chat) <= 3 and not existing_title:
            # Create transcript for title generation (limit length)
            transcript_parts = []
            for m in current_chat[-5:]: # Use last 5 exchanges max
                 user_msg = m.get('user', '').replace('[Image attached]', '').strip() # Remove image marker for title gen
                 bot_msg = m.get('bot', '').strip()
                 if user_msg: transcript_parts.append(f"user: {user_msg}")
                 if bot_msg: transcript_parts.append(f"system: {bot_msg}") # Using 'system' as per titlegen prompt context
            transcript = "\n".join(transcript_parts)
            trimmed_transcript = transcript[-4000:]  # Limit transcript size for titlegen

            if trimmed_transcript: # Only run if there's content
                try:
                    title_proc = subprocess.run(
                        [python_executable, "titlegen.py", trimmed_transcript],
                        capture_output=True,
                        text=True,
                        timeout=15 # Slightly longer timeout for titlegen
                    )
                    title = title_proc.stdout.strip()
                    title_stderr = title_proc.stderr.strip()
                    if title_stderr:
                         print(f"DEBUG (titlegen.py stderr for chat {chat_id}):\n{title_stderr}", file=sys.stderr)

                    if title_proc.returncode == 0 and title:
                        session[title_key] = title
                        session.modified = True
                        print(f"Generated title for chat {chat_id}: '{title}'", file=sys.stderr)
                    elif title_proc.returncode != 0:
                         print(f"ERROR: Title generation failed for chat {chat_id}. Exit code: {title_proc.returncode}", file=sys.stderr)

                except subprocess.TimeoutExpired:
                     print(f"ERROR: Title generation timed out for chat {chat_id}.", file=sys.stderr)
                except Exception as e:
                    print(f"ERROR: Title generation failed unexpectedly for chat {chat_id}: {e}", file=sys.stderr)

        # --- Prepare and Send Response ---
        # Get the potentially updated title
        final_title = session.get(title_key, "")
        full_response = {**new_entry, "title": final_title}

        # Avoid logging potentially huge base64 strings or long bot responses to console
        loggable_response = {
            k: (v[:100] + '...' if isinstance(v, str) and len(v) > 100 else v)
            for k, v in full_response.items()
        }
        print(f"Returning response for chat {chat_id}: {loggable_response}", file=sys.stderr)

        return jsonify(full_response)

    # Catch top-level exceptions in the route handler
    except Exception as e:
        # Log the full error trace server-side for debugging
        import traceback
        print(f"FATAL ERROR in /api/chat: {e}\n{traceback.format_exc()}", file=sys.stderr)
        # Return a generic error to the client
        return jsonify({"error": "An unexpected server error occurred. Please try again later."}), 500

@app.route('/delete_all', methods=['POST'])
def delete_all_chats():
    # Clear all chat-related data from the session
    chat_keys = [k for k in session.keys() if k == 'chats' or k.endswith('_title') or k == 'active_chat']
    for key in chat_keys:
        session.pop(key, None)
    session.modified = True
    print("Deleted all chats.", file=sys.stderr)
    return redirect(url_for('root_redirect')) # Redirect to create a new chat

@app.route('/clear/<chat_id>') # Changed route to include chat_id
def clear_chat_history(chat_id):
    # Clear history only for the specified chat_id
    if chat_id and 'chats' in session and chat_id in session['chats']:
        session['chats'][chat_id] = [] # Reset history to empty list
        session.pop(f"{chat_id}_title", None) # Optionally clear the title too
        session.modified = True
        print(f"Cleared history for chat: {chat_id}", file=sys.stderr)
        # Redirect back to the same (now empty) chat
        return redirect(url_for('index', chat_id=chat_id))
    else:
        # If chat_id is invalid or not found, redirect to root/new
        print(f"WARN: Attempted to clear history for non-existent chat: {chat_id}", file=sys.stderr)
        return redirect(url_for('root_redirect'))


if __name__ == '__main__':
    # Use host='0.0.0.0' to make it accessible on your network if needed
    # Remove debug=True for production deployment
    app.run(debug=True, host='127.0.0.1', port=5000)

# --- END OF FILE App.py ---