import json
import time
import os
import google.generativeai as genai

# Get the key from the environment variable
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Error: GEMINI_API_KEY not found in environment variables.")
    exit()

genai.configure(api_key=api_key)

def get_smart_keywords(jp, en):
    prompt = f"""
    You are an expert in Japanese SEO and hospitality.
    Provide 8-10 search keywords for this phrase:
    JP: "{jp}"
    EN: "{en}"
    
    Requirements:
    - Include Hiragana, Katakana, and Kanji variations.
    - Include 2-3 related synonyms (e.g., if 'sushi', include 'fish, seafood, washoku').
    - Return ONLY a comma-separated list of words.
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error processing {jp}: {e}")
        return ""

# 2. Load your file (Change 'menu.json' to whatever file you are working on)
target_file = 'data/menu.json'

if not os.path.exists(target_file):
    print(f"Error: {target_file} not found. Make sure the 'data' folder exists.")
    exit()

with open(target_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 3. Process Loop
print(f"Starting AI keyword generation for {len(data)} items...")

for i, item in enumerate(data):
    # Only process items that don't have keywords yet
    if "keywords" not in item or not item["keywords"]:
        print(f"[{i+1}/{len(data)}] Processing: {item['jp']}")
        item['keywords'] = get_smart_keywords(item['jp'], item['en'])
        
        # Pause to stay within free-tier rate limits
        time.sleep(2) 

        # Auto-save every 10 items
        if i % 10 == 0:
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)

# 4. Final Save
with open(target_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print("✨ Success! Your JSON is now smart.")