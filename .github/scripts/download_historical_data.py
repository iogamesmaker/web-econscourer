import os
import json
import gzip
import requests
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

def format_date(date):
    """Format date as YYYY_M_D without zero padding"""
    return date.strftime('%Y_%-m_%-d')

def download_day(date_str):
    """Download data for a specific date"""
    base_url = f'https://pub.drednot.io/prod/econ/{date_str}'
    date_dir = os.path.join('data', date_str)

    try:
        # Create directory if it doesn't exist
        os.makedirs(date_dir, exist_ok=True)

        # Check if files already exist
        if (os.path.exists(os.path.join(date_dir, 'summary.json')) and
            os.path.exists(os.path.join(date_dir, 'ships.json.gz')) and
            os.path.exists(os.path.join(date_dir, 'log.json.gz'))):
            print(f"✓ Data for {date_str} already exists, skipping...")
            return True

        # Download summary.json
        summary_response = requests.get(f'{base_url}/summary.json')
        summary_response.raise_for_status()

        with open(os.path.join(date_dir, 'summary.json'), 'w') as f:
            json.dump(summary_response.json(), f)

        # Download ships.json.gz
        ships_response = requests.get(f'{base_url}/ships.json.gz')
        ships_response.raise_for_status()

        with open(os.path.join(date_dir, 'ships.json.gz'), 'wb') as f:
            f.write(ships_response.content)

        # Download log.json.gz
        log_response = requests.get(f'{base_url}/log.json.gz')
        log_response.raise_for_status()

        with open(os.path.join(date_dir, 'log.json.gz'), 'wb') as f:
            f.write(log_response.content)

        print(f"✓ Successfully downloaded data for {date_str}")
        return True

    except requests.exceptions.RequestException as e:
        if e.response and e.response.status_code == 404:
            print(f"× No data available for {date_str}")
        else:
            print(f"× Error downloading {date_str}: {str(e)}")
        return False

def download_historical_data():
    # Get current UTC time
    current_time = datetime.now(timezone.utc)
    print(f"Current Date and Time (UTC): {current_time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Start date: 2022-11-23
    start_date = datetime(2022, 11, 23, tzinfo=timezone.utc)

    # End date: today
    end_date = current_time

    # Create list of dates to process
    dates = []
    current_date = start_date
    while current_date <= end_date:
        dates.append(format_date(current_date))
        current_date += timedelta(days=1)

    print(f"Downloading historical data from {format_date(start_date)} to {format_date(end_date)}")
    print(f"Total days to process: {len(dates)}")

    # Create base data directory
    os.makedirs('data', exist_ok=True)

    # Download data with multiple threads
    successful_downloads = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_date = {executor.submit(download_day, date): date for date in dates}

        for future in as_completed(future_to_date):
            date = future_to_date[future]
            if future.result():
                successful_downloads += 1

    # Create/update latest symlink to point to most recent data
    latest_date = format_date(end_date)
    latest_link = os.path.join('data', 'latest')
    if os.path.exists(latest_link):
        if os.path.islink(latest_link):
            os.unlink(latest_link)
        else:
            os.rmdir(latest_link)
    os.symlink(latest_date, latest_link)

    print("\nDownload Summary:")
    print(f"Total days processed: {len(dates)}")
    print(f"Successfully downloaded: {successful_downloads}")
    print(f"Failed/Skipped: {len(dates) - successful_downloads}")
    print(f"\nLatest symlink points to: {latest_date}")

if __name__ == '__main__':
    download_historical_data()
