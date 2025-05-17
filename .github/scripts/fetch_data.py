import os
import json
import gzip
import requests
from datetime import datetime, timedelta, timezone

def fetch_data():
    # Get yesterday's date (since data is for previous 24 hours)
    date = datetime.now(timezone.utc) - timedelta(days=1)
    date_str = date.strftime('%Y_%-m_%-d')

    print(f"Fetching data for {date_str}")

    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)

    # Base URL
    base_url = f'https://pub.drednot.io/prod/econ/{date_str}'

    try:
        # Download summary.json
        print("Downloading summary.json...")
        summary_response = requests.get(f'{base_url}/summary.json')
        summary_response.raise_for_status()

        with open(f'data/summary_{date_str}.json', 'w') as f:
            json.dump(summary_response.json(), f)
        print("✓ Summary data downloaded")

        # Download and decompress ships.json.gz
        print("Downloading ships.json.gz...")
        ships_response = requests.get(f'{base_url}/ships.json.gz')
        ships_response.raise_for_status()

        with gzip.open(f'data/ships_{date_str}.json.gz', 'wb') as f:
            f.write(ships_response.content)
        print("✓ Ships data downloaded")

        # Download and decompress log.json.gz
        print("Downloading log.json.gz...")
        log_response = requests.get(f'{base_url}/log.json.gz')
        log_response.raise_for_status()

        with gzip.open(f'data/log_{date_str}.json.gz', 'wb') as f:
            f.write(log_response.content)
        print("✓ Log data downloaded")

        # Update latest.json symlink
        latest_path = 'data/latest.json'
        if os.path.exists(latest_path):
            os.remove(latest_path)
        os.symlink(f'summary_{date_str}.json', latest_path)

        print(f"✓ Successfully downloaded all data for {date_str}")

    except requests.exceptions.RequestException as e:
        print(f"Error: {str(e)}")
        raise

if __name__ == '__main__':
    fetch_data()
