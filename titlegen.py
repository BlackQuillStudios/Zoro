import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

def generate():
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    model = "gemini-2.0-flash"

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=sys.argv[1])],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="text/plain",
        system_instruction=[
            types.Part.from_text(text="""You are a chat naming AI.

Your task is to generate a short, descriptive, and creative title for the current conversation between a user and an AI assistant.

Rules:
- Respond ONLY with the chat title — do not explain, introduce, greet, or output anything else.
- Your response MUST be a single sentence fragment (e.g., Asking About AI Ethics or Debugging Python Script).
- DO NOT include quotation marks, punctuation at the end, or any formatting like markdown or bold.
- Keep it short (maximum 6 words).
- Capture the core theme or task of the conversation.

IMPORTANT:
Never write explanations, intros, or follow-up text. Output only the final title with no context or fluff.
""")
        ]
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        print(chunk.text, end="")

if __name__ == "__main__":
    generate()
