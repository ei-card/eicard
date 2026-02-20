import google.generativeai as genai
import os
import json
import time

# 1. Setup API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("❌ Error: GEMINI_API_KEY not found.")
    exit()

genai.configure(api_key=api_key)

print("--- Currently Available Models ---")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"Model ID: {m.name}")

# 2. Model Failover System
model_pool = ['gemini-3.1-pro','gemini-3.0-flash','gemini-3.0-pro','gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']
# Initialize with the newest model
current_model_index = 0
model = genai.GenerativeModel(model_pool[current_model_index])

def get_smart_keywords(jp, en):
    global model, current_model_index
    prompt = f"Provide 8-10 search keywords for JP: '{jp}' and EN: '{en}'. Return ONLY a comma-separated list."
    
    while current_model_index < len(model_pool):
        try:
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            # Check for Quota (429) or Deprecation/Not Found (404)
            if "429" in str(e) or "404" in str(e):
                error_type = "Quota Reached" if "429" in str(e) else "Model Retired"
                print(f"⚠️ {error_type} for {model_pool[current_model_index]}.")
                
                current_model_index += 1
                if current_model_index < len(model_pool):
                    print(f"🔄 Switching to {model_pool[current_model_index]}...")
                    model = genai.GenerativeModel(model_pool[current_model_index])
                    continue # Retry with the next model
                else:
                    print("🛑 All models exhausted or unavailable.")
                    return "STOP_SCRIPT"
            else:
                print(f"Error: {e}")
                return ""

# 3. File Processing Logic
data_folder = 'data/'
json_files = [f for f in os.listdir(data_folder) if f.endswith('.json')]

for file_name in json_files:
    target_path = os.path.join(data_folder, file_name)
    print(f"\n--- 📂 Processing: {file_name} ---")
    
    with open(target_path, 'r', encoding='utf-8') as f:
        file_content = json.load(f)

    changed = False
    for i, item in enumerate(file_content):
        # Skip if keywords already exist
        if "keywords" in item and item["keywords"]:
            continue

        print(f"[{i+1}/{len(file_content)}] ✨ Generating for: {item['jp']}")
        result = get_smart_keywords(item['jp'], item['en'])
        
        if result == "QUOTA_EXCEEDED":
            # Save progress before quitting
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(file_content, f, ensure_ascii=False, indent=2)
            print("💾 Progress saved. Goodbye!")
            exit()
            
        item['keywords'] = result
        item['verified'] = False
        changed = True
        time.sleep(2) # Protect against per-minute limits

    if changed:
        with open(target_path, 'w', encoding='utf-8') as f:
            json.dump(file_content, f, ensure_ascii=False, indent=2)
        print(f"✅ Saved updates to {file_name}")

print("\n🚀 Mission Accomplished: All files updated.")