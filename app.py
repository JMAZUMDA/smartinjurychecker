import os
import json
import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Using flash for fast, cheap inference
model = genai.GenerativeModel('gemini-2.5-flash')

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict_symptoms', methods=['POST'])
def predict_symptoms():
    data = request.json
    
    # Check if Gemini API Key is configured
    if not os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") == "your_api_key_here":
        return jsonify({
            'likely_injury': "API Key Missing",
            'risk_score': "Medium",
            'first_aid_advice': "Please configure your GEMINI_API_KEY in the .env file and restart the server.",
            'visit_doctor_urgently': False
        })
    
    prompt = f"""
    You are an expert AI medical assistant. A user has reported an injury with the following details:
    - Injured Body Part: {data.get('body_part', 'Not specified')}
    - Pain Level (1-10): {data.get('pain_level')}
    - Visible Swelling: {data.get('swelling')}
    - Can move area: {data.get('can_move')}
    - Bruising: {data.get('bruising')}
    - Visible Deformity: {data.get('deformity')}
    - Type of Injury: {data.get('injury_type')}
    
    Analyze these symptoms and return a raw JSON object (without markdown code blocks) with exactly these 4 keys:
    1. "likely_injury": (String, your best medical guess of what the injury is based on the symptoms and body part)
    2. "risk_score": (String, strictly return either "Low", "Medium", or "High")
    3. "first_aid_advice": (String, provide clear, actionable, step-by-step first aid advice formatted in HTML. Use <ul> and <li> for bullet points. For each point, the main action MUST be bolded and highlighted using <mark><strong> tags (e.g. <li><mark><strong>Apply Ice:</strong></mark> wrap ice in a cloth...). If you suggest any medicines, the medicine name MUST be in BOLD AND CAPITAL LETTERS using <strong> tags (e.g. Take <strong>IBUPROFEN</strong> for pain).)
    4. "visit_doctor_urgently": (Boolean, strictly true or false)
    """

    try:
        response = model.generate_content(prompt)
        ai_response_text = response.text.replace('```json', '').replace('```', '').strip()
        result_json = json.loads(ai_response_text)
        return jsonify(result_json)
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return jsonify({
            'likely_injury': "Error communicating with AI",
            'risk_score': "Medium",
            'first_aid_advice': "There was an error generating your assessment. Please try again or seek medical attention if severe.",
            'visit_doctor_urgently': True
        })

@app.route('/predict_image', methods=['POST'])
def predict_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'})
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'})
        
    # Use Gemini Vision API
    if not os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") == "your_api_key_here":
        return jsonify({'error': 'Gemini API Key missing. Please configure .env file.'})
        
    try:
        img = Image.open(file)
        
        prompt = """
        You are an expert AI medical assistant. Examine this image of a potential injury.
        Visually inspect it for signs of trauma such as swelling, lacerations, bruising, or abnormal angles.
        Return a raw JSON object (without markdown code blocks) with exactly these 3 keys:
        1. "result": (String, a detailed description of what you observe)
        2. "confidence": (Integer, a percentage from 0 to 100 of how confident you are in this visual assessment)
        3. "recommendation": (String, next steps and formatted advice)
        """
        
        response = model.generate_content([prompt, img])
        ai_response_text = response.text.replace('```json', '').replace('```', '').strip()
        result_json = json.loads(ai_response_text)
        
        return jsonify(result_json)
    except Exception as e:
        print(f"Gemini Vision API Error: {e}")
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
