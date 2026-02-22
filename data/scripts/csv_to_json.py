import csv
import json
import os

def convert_csv_to_json():
    # Destination folder for your website's data
    data_folder = 'data/'
    csv_folder = 'data/csv/'  # Assuming your CSV files are in a 'csv' subfolder
    
    # Ensure the data directory exists
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)
        print(f"📁 Created directory: {data_folder}")

    # List of files to process (matches your current naming convention)
    categories = ['admin', 'hotel', 'menu', 'pay', 'sign']
    
    for cat in categories:
        csv_filename = os.path.join(csv_folder, f"{cat}.csv")
        json_filename = os.path.join(data_folder, f"{cat}.json")
        
        if os.path.exists(csv_filename):
            print(f"⏳ Converting {csv_filename}...")
            
            json_list = []
            # utf-8-sig handles the 'BOM' if you saved the file via Excel
            with open(csv_filename, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Logic to convert 'verified' back to a real Boolean (True/False)
                    # CSV saves them as strings, but JSON needs them as actual booleans
                    if 'verified' in row:
                        val = str(row['verified']).lower()
                        row['verified'] = True if val == 'true' else False
                    
                    json_list.append(row)
            
            # Save the formatted JSON
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(json_list, f, ensure_ascii=False, indent=2)
            
            print(f"✅ Success: {json_filename} updated.")
        else:
            print(f"⏭️ Skipped: {csv_filename} not found in this folder.")

if __name__ == "__main__":
    convert_csv_to_json()
    print("\n🚀 All files synced! You are ready to git push.")