# --- START OF FILE main.py ---

import base64
import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types
import mimetypes # Import mimetypes

load_dotenv()

# Modified generate function to accept image data
def generate(user_input, image_b64_data=None, image_mime_type=None):
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    # --- USER SPECIFIED MODEL ---
    # WARNING: 'gemini-2.0-flash' is primarily a text model.
    # Official Gemini documentation recommends vision-specific models
    # (e.g., 'gemini-1.5-flash', 'gemini-1.5-pro') for image input.
    # This configuration may result in the image being ignored or errors.
    model = "gemini-2.0-flash"
    # --------------------------

    parts = []
    # Add image part first if provided
    if image_b64_data and image_mime_type:
        try:
            # Decode the base64 image data
            image_bytes = base64.b64decode(image_b64_data)
            print(f"DEBUG: Decoded image bytes: {len(image_bytes)} bytes, MIME: {image_mime_type}", file=sys.stderr) # Debug output
            image_part = types.Part.from_data(data=image_bytes, mime_type=image_mime_type)
            parts.append(image_part)
        except base64.binascii.Error as e:
            print(f"ERROR: Failed to decode base64 image data: {e}", file=sys.stderr)
            # Inform the user about the failure
            print("\nSir, I encountered an issue processing the provided image data. Please ensure it was uploaded correctly.", end="")
            return # Stop generation if image decoding fails
        except Exception as e:
            print(f"ERROR: Unexpected error processing image data: {e}", file=sys.stderr)
            print("\nSir, an unexpected error occurred while handling the image.", end="")
            return

    # Add text part if provided
    if user_input:
        parts.append(types.Part.from_text(text=user_input))

    # Ensure there is at least one part to send
    if not parts:
        print("Sir, no text or valid image data was provided.", end="")
        return

    contents = [
        types.Content(
            role="user",
            parts=parts, # Send the list of parts (image and/or text)
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain",
        # Keep your existing system instruction
        system_instruction=[
            types.Part.from_text(text="""
You are Zoro, a helpful and respectful personal AI assistant for Blake C.
You should call him 'Sir' and always respond with politeness and clarity.

**NEW CAPABILITY: Canvases**

You now have the ability to create special 'canvases' in your responses. Use these to present distinct blocks of code or writing in a structured way when appropriate or requested.

**How to Create Canvases:**

To create a canvas, you MUST use the following exact syntax, typically on a **new line**:

`canvas(Type)("Content")`

**Rules for Canvas Command:**

1.  **`Type`:** Must be either `Code` or `Writing` (case-sensitive).
    *   `canvas(Code)("...")`: Use this for code snippets. The content inside the quotes should be the raw code. It will be displayed in a special code block with syntax highlighting.
    *   `canvas(Writing)("...")`: Use this for distinct blocks of text like notes, summaries, explanations, or other non-code writing that should be visually separated. The content inside the quotes is regular text.

2.  **`Content`:** Must be enclosed in double quotes (`"`). This is the text or code that will appear inside the canvas.
    *   Line breaks within the `Content` are allowed and should be represented by actual newlines (like pressing Enter). Do NOT use `\\n` literally within the quotes unless the code itself requires it.
    *   If the content itself needs double quotes, you must escape them with a backslash (`\"`).

3.  **Exact Syntax:** Adhere strictly to the `canvas(Type)("Content")` format. No extra spaces around parentheses unless naturally part of the content. The command should usually be on its own line for clarity.

4.  **When to Use:** Use canvases primarily for larger code blocks or when you want to present a specific piece of writing as a distinct visual element (like a note or callout). Do not overuse it for single sentences or simple formatting that Markdown handles (like bold/italic).

5.  **Output Only the Command:** Do NOT explain that you are creating a canvas. Just output the `canvas(Type)("Content")` command string directly where you want the canvas to appear in your response. The frontend will handle rendering it.

6.  **Do Not Format the Command:** Do NOT wrap the `canvas(...)` command itself in Markdown backticks, code blocks, bold, or italics. It must be plain text for the parser to find it.

7.  **When using a code canvas make sure you do not include ```**
**Examples:**

*   **Correct Code Canvas:**
    "Okay Sir, here is the Python function:
    canvas(Code)("def calculate_sum(a, b):\n  \"\"\"Calculates the sum of two numbers.\"\"\"\n  return a + b")
    Let me know if you need help using it."

*   **Correct Writing Canvas:**
    "Regarding your question about project timelines, Sir:
    canvas(Writing)("Please remember that the estimated delivery date is tentative and depends on receiving the required assets by the end of this week.")
    This is crucial for planning."

*   **Incorrect Usage:**
    *   `Here is a canvas: canvas(Code)("...")` (Don't explain)
    *   `canvas(code)("...")` (Incorrect type capitalization)
    *   `canvas("Code")("...")` (Type not in parentheses)
    *   `canvas(Code)(...)` (Content not in quotes)
    *   `**canvas(Writing)("...")**` (Command itself is formatted)

**Remember to use standard Markdown for all other formatting.**
            """)
        ],
    )

    try:
        # Stream the response
        print(f"DEBUG: Sending request to model '{model}' with {len(parts)} part(s).", file=sys.stderr)
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            print(chunk.text, end="")
    except types.generation_types.BlockedPromptException as e:
         print(f"\nSir, my apologies, but the request was blocked. This might be due to safety settings regarding the text or image provided. Details: {e}", end="")
    except types.generation_types.StopCandidateException as e:
         print(f"\nSir, I had to stop the response generation prematurely. This might be due to content restrictions. Details: {e}", end="")
    except Exception as e:
        # Catch other potential API errors, including invalid arguments if the model doesn't support the input type
        print(f"\nERROR during generation: {type(e).__name__} - {e}", file=sys.stderr) # Log detailed error
        # Provide a helpful message, hinting at potential model incompatibility
        if "unary call" in str(e).lower() or "request payload" in str(e).lower() or "invalid argument" in str(e).lower():
             print("\nSir, I apologize, but I encountered an error generating the response. This might be related to the type of input provided (like an image) not being fully supported by the current model configuration ('gemini-2.0-flash'). Please check the input or consider model compatibility.", end="")
        else:
             print("\nSir, I apologize, but I encountered an unexpected error while generating the response.", end="")


if __name__ == "__main__":
    # Expecting: script_name user_input [image_base64 [image_mime_type]]
    user_input = sys.argv[1] if len(sys.argv) > 1 else ""
    image_b64_data = sys.argv[2] if len(sys.argv) > 2 else None
    image_mime_type = sys.argv[3] if len(sys.argv) > 3 else None

    # Basic validation
    if image_b64_data and not image_mime_type:
        print("ERROR: Image data provided without MIME type.", file=sys.stderr)
        sys.exit(1)
    if image_mime_type and not image_b64_data:
         print("ERROR: Image MIME type provided without image data.", file=sys.stderr)
         sys.exit(1)

    # Proceed if there's either text or an image
    if user_input or image_b64_data:
        generate(user_input, image_b64_data, image_mime_type)
    else:
        # Handle case where script is called with no arguments
        print("Sir, please provide some text input or image data.", end="")
        sys.exit(0) # Exit cleanly if no input

# --- END OF FILE main.py ---