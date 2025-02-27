import os
import google.generativeai as genai
from google.generativeai import types  # Import types
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# --- The generate function (from above) ---
def generate(user_input):
    client = genai.Client(
        api_key=os.environ.get("AIzaSyCZqsY6xNsNQHUKylCfmvbGdrXuKv9n7v0"),
    )

    model = "gemini-2.0-pro-exp-02-05"  # Using the exact model name provided

    # Load Zoro's instructions
    with open("zoro_instructions.txt", "r") as f:
        zoro_instructions = f.read()

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=f"Sir: {user_input}"), # User input with "Sir:"
            ],
        ),
        types.Content( #Placeholder for AI
            role="model",
            parts=[
                types.Part.from_text(text=""),
            ]
        )
    ]
    generate_content_config = types.GenerateContentConfig(
        temperature=1,
        top_p=0.95,
        top_k=64,
        max_output_tokens=8192,
        system_instruction=[
            types.Part.from_text(text=zoro_instructions), # System instructions
        ],
    )

    # Use generate_content_stream for streaming responses
    response_stream = client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    )

    full_response = ""
    for chunk in response_stream:
        full_response += chunk.text
        #print(chunk.text, end="") # Prints as it streams NO NEED TO PRINT HERE
    return full_response #Return full response

# --- Flask routes ---

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        user_message = request.json["message"]
        ai_response = generate(user_message)  # Call the generate function
        return jsonify({"response": ai_response})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"response": "Sorry, I encountered an error."}), 500

if __name__ == "__main__":
    app.run(debug=True)
