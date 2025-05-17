import os
import json
import gzip
import requests
from datetime import datetime, timedelta, timezone

def fetch_data():
    # Get current UTC time
    current_time = datetime.now(timezone.utc)
    print(f"Current Date and Time (UTC): {current_time.strftime('%Y-%m-%d %H:%M:%S')}")

    date = current_time
    date_str = date.strftime('%Y_%-m_%-d')  # For Linux/Mac

    print(f"Fetching data for {date_str}")

    # Create base data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)

    # Create date-specific directory
    date_dir = os.path.join('data', date_str)
    os.makedirs(date_dir, exist_ok=True)

    # Base URL
    base_url = f'https://pub.drednot.io/prod/econ/{date_str}'

    try:
        # Download summary.json
        print(f"Downloading from {base_url}/summary.json...")
        summary_response = requests.get(f'{base_url}/summary.json')
        summary_response.raise_for_status()

        with open(os.path.join(date_dir, 'summary.json'), 'w') as f:
            json.dump(summary_response.json(), f)
        print("✓ Summary data downloaded")

        # Download ships.json.gz
        print("Downloading ships.json.gz...")
        ships_response = requests.get(f'{base_url}/ships.json.gz')
        ships_response.raise_for_status()

        with open(os.path.join(date_dir, 'ships.json.gz'), 'wb') as f:
            f.write(ships_response.content)
        print("✓ Ships data downloaded")

        # Download log.json.gz
        print("Downloading log.json.gz...")
        log_response = requests.get(f'{base_url}/log.json.gz')
        log_response.raise_for_status()

        with open(os.path.join(date_dir, 'log.json.gz'), 'wb') as f:
            f.write(log_response.content)
        print("✓ Log data downloaded")

        # Create/update latest symlink to point to today's directory
        latest_link = os.path.join('data', 'latest')
        if os.path.exists(latest_link):
            if os.path.islink(latest_link):
                os.unlink(latest_link)
            else:
                os.rmdir(latest_link)
        os.symlink(date_str, latest_link)

        print(f"✓ Successfully downloaded all data for {date_str}")

    except requests.exceptions.RequestException as e:
        print(f"Error: {str(e)}")
        raise

if __name__ == '__main__':
    fetch_data()
