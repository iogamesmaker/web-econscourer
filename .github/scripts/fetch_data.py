import os
import json
import gzip
import requests
from datetime import datetime, timedelta
import time

def fetch_data():
    # Add delay to ensure data is available
    time.sleep(300)  # Wait 5 minutes after UTC midnight
    
    # Get yesterday's date (since data is for previous 24 hours)
    date = datetime.utcnow() - timedelta(days=1)
    date_str = date.strftime('%Y_%m_%d')
    
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Base URL
    base_url = f'https://pub.drednot.io/prod/econ/{date_str}'
    
    max_retries = 3
    retry_delay = 600  # 10 minutes
    
    for attempt in range(max_retries):
        try:
            # Download summary.json
            summary_response = requests.get(f'{base_url}/summary.json')
            summary_response.raise_for_status()
            
            with open(f'data/summary_{date_str}.json', 'w') as f:
                json.dump(summary_response.json(), f)
            
            # Download and decompress ships.json.gz
            ships_response = requests.get(f'{base_url}/ships.json.gz')
            ships_response.raise_for_status()
            
            with gzip.open(f'data/ships_{date_str}.json.gz', 'wb') as f:
                f.write(ships_response.content)
            
            # Download and decompress log.json.gz
            log_response = requests.get(f'{base_url}/log.json.gz')
            log_response.raise_for_status()
            
            with gzip.open(f'data/log_{date_str}.json.gz', 'wb') as f:
                f.write(log_response.content)
                
            # Create a latest.json symlink
            latest_path = 'data/latest.json'
            if os.path.exists(latest_path):
                os.remove(latest_path)
            os.symlink(f'summary_{date_str}.json', latest_path)
            
            print(f"Successfully downloaded data for {date_str}")
            break
            
        except requests.exceptions.RequestException as e:
            print(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                print(f"Waiting {retry_delay} seconds before retrying...")
                time.sleep(retry_delay)
            else:
                raise Exception(f"Failed to download data after {max_retries} attempts")

if __name__ == '__main__':
    fetch_data()