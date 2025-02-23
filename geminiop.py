import google.generativeai as genai
import requests
from PIL import Image
from io import BytesIO
import base64

def get_book_rating(image_url):
    """
    Analyze a book image and rate its second-hand value using Gemini API.
    
    Args:
        image_url (str): URL of the book image
        
    Returns:
        str: Rating number from 1-10
    """
    # Configure the API
    genai.configure(api_key="AIzaSyCRJ0f_qjXW_pE8DKx1tj-Z1ODNzPMQzEQ")  # Replace with your actual API key
    
    # Download and process the image
    try:
        response = requests.get(image_url)
        response.raise_for_status()
        image = Image.open(BytesIO(response.content))
        
        # Convert image to bytes
        buffer = BytesIO()
        image.save(buffer, format="JPEG")
        image_bytes = buffer.getvalue()
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        
    except Exception as e:
        return f"Error processing image: {str(e)}"

    # Create the prompt
    prompt = """
    Analyze the book in the provided image and rate its second-hand value on a scale of 1 to 10.

    Consider factors such as:
    - Condition (new, slightly used, heavily used, torn, or damaged)
    - Presence of torn pages or missing covers
    - Genre and Language
    - Estimated second-hand price in the market

    Output only a single number (1-10). No text, no explanation, just the number.
    """

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        # Create the message with proper role
        message = {
            "role": "user",
            "parts": [
                {"text": prompt},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": image_b64
                    }
                }
            ]
        }
        
        # Generate content with the properly structured message
        response = model.generate_content(message)
        return response.text.strip()
        
    except Exception as e:
        return f"Error generating content: {str(e)}"

# Example usage
if __name__ == "__main__":
    image_url = "https://res.cloudinary.com/dz25vdr3t/image/upload/v1740290287/clo_dlhtc3.jpg"
    rating = get_book_rating(image_url)
    print(f"Book Rating: {rating}")