# chatbot.py
import os
import google.generativeai as genai

# Read API key from api_key.txt
with open("api_key.txt", "r") as f:
    api_key = f.read().strip()

genai.configure(api_key=api_key)

generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 1024,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro-002",  # Or gemini-ultra
    generation_config=generation_config,
)


def get_chatbot_response(user_message, chat_history=None):
    if chat_history is None:
        chat_history = []

    chat_session = model.start_chat(history=chat_history)
    response = chat_session.send_message(user_message)

    chat_history.append({"role": "user", "parts": [user_message]})
    chat_history.append({"role": "model", "parts": [response.text]})

    return response.text, chat_history
