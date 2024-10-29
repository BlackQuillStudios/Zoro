document.getElementById("send-button").addEventListener("click", function() {
    const userInput = document.getElementById("user-input").value;
    if (userInput) {
        displayMessage(userInput, 'user');
        document.getElementById("user-input").value = '';
        getResponse(userInput);
    }
});

function displayMessage(message, sender) {
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");
    messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
    messageDiv.innerText = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
}

function getResponse(userInput) {
    // Send the user input to the Flask backend
    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: userInput }),
    })
    .then(response => response.json())
    .then(data => {
        displayMessage(data.response, 'bot');
    })
    .catch(error => {
        console.error('Error:', error);
        displayMessage("Sorry, I couldn't process that. Please try again.", 'bot');
    });
}
