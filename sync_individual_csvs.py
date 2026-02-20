import csv
import json
import os

def sync_csv_to_json():
    csv_folder = 'data/csvs/'
    data_folder = 'data/'
    categories = ['admin', 'hotel', 'menu', 'pay', 'sign']
    
    for cat in categories:
        csv_path = f"{csv_folder}{cat}.csv"
        json_path = os.path.join(data_folder, f"{cat}.json")
        
        if os.path.exists(csv_path):
            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                rows = []
                for row in reader:
                    # Convert 'verified' string back to boolean
                    row['verified'] = row['verified'].lower() == 'true'
                    rows.append(row)
                
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(rows, f, ensure_ascii=False, indent=2)
            print(f"✅ Updated JSON: {json_path}")
        else:
            print(f"⏭️ Skipped: {csv_path} (not found)")

if __name__ == "__main__":
    sync_csv_to_json()