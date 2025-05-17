import os
import json
import gzip
import requests
from datetime import datetime, timedelta

def fetch_data():
    # Get yesterday's date (since data is for previous 24 hours)
    date = datetime.utcnow() - timedelta(days=1)
    date_str = date.strftime('%Y_%m_%d')
    
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Base URL
    base_url = f'https://pub.drednot.io/prod/econ/{date_str}'
    
    # Download summary.json
    summary_response = requests.get(f'{base_url}/summary.json')
    with open(f'data/summary_{date_str}.json', 'w') as f:
        json.dump(summary_response.json(), f)
    
    # Download and decompress ships.json.gz
    ships_response = requests.get(f'{base_url}/ships.json.gz')
    with gzip.open(f'data/ships_{date_str}.json.gz', 'wb') as f:
        f.write(ships_response.content)
    
    # Download and decompress log.json.gz
    log_response = requests.get(f'{base_url}/log.json.gz')
    with gzip.open(f'data/log_{date_str}.json.gz', 'wb') as f:
        f.write(log_response.content)

if __name__ == '__main__':
    fetch_data()