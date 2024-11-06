# app.py
from flask import Flask, render_template, request, jsonify
from chatbot import get_chatbot_response
import os


app = Flask(__name__)

chat_history = []

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    global chat_history

    user_message = request.get_json().get("message")
    bot_response, chat_history = get_chatbot_response(user_message, chat_history)
    return jsonify({"message": bot_response})


if __name__ == "__main__":
    app.run(debug=True)
