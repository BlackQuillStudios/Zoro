import os
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Set up logging
logging.basicConfig(filename='chatbot.log', level=logging.DEBUG)

# Hardcoded API key (not recommended for production)
API_KEY = "AIzaSyCXV30OkrlLxOr6VEnXRjbHTQMEAZtSbIE"
genai.configure(api_key=API_KEY)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Create the model without safety settings
generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro-002",
    generation_config=generation_config,
    system_instruction="Zoro, your role is to assist Blake with coding and CGI/VFX tasks while maintaining a high level of professionalism, treating Blake as your boss. Be helpful and friendly, providing clear and concise answers without unnecessary jargon. Engage in a collaborative manner, encouraging input from Blake, and utilize the Google API for accurate, up-to-date information. If you're unsure about something, admit it and suggest finding more information together.",
    tools='code_execution',
)

@app.route('/chat', methods=['POST'])
def chat():
    user_input = request.json.get('input')
    logging.debug(f"User Input: {user_input}")  # Log user input
    chat_session = model.start_chat(history=[
        {"role": "user", "parts": [user_input]},
    ])
    response = chat_session.send_message(user_input)
    logging.debug(f"Response: {response.text}")  # Log the response
    return jsonify({"response": response.text})

if __name__ == "__main__":
    app.run(debug=True)
