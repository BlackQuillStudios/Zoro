async function sendMessage() {
  const userInput = document.getElementById("userInput").value;
  if (!userInput.trim()) return;

  // Display user message
  addMessage("User", userInput);
  document.getElementById("userInput").value = "";

  try {
    // Send the message to the AI
    const response = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: userInput }),
    });
    const data = await response.json();

    // Display AI response
    addMessage("Zoro", data.response);
  } catch (error) {
    console.error("Error:", error);
    addMessage("Zoro", "Sorry, I couldn't process that. Please try again.");
  }
}

function addMessage(sender, message) {
  const chatbox = document.getElementById("chatbox");
  const messageElement = document.createElement("p");
  messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
  chatbox.appendChild(messageElement);
  chatbox.scrollTop = chatbox.scrollHeight;
}
