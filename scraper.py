import csv
import time
from bs4 import BeautifulSoup
import requests

# Homecare scheduling keywords to target
KEYWORDS = [
    "home care scheduler",
    "care coordinator",
    "scheduling assistant",
    "caregiver scheduler",
    "intake coordinator",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}


def search_jobs(keyword):
    """Searches OnlineJobs.ph for homecare roles matching the keyword."""
    results = []
    formatted_keyword = keyword.replace(" ", "+")
    url = f"https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword={formatted_keyword}"

    print(f"Scanning listings for: '{keyword}'...")

    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            print(f"Server responded with status code: {response.status_code}")
            return results

        soup = BeautifulSoup(response.text, "html.parser")
        job_cards = soup.select(".jobpost-cat-box") or soup.select(".job-card")

        for card in job_cards:
            title_elem = card.select_one("h2") or card.select_one("h4")
            link_elem = card.select_one("a")
            desc_elem = card.select_one("p") or card.select_one(".desc")

            if title_elem and link_elem:
                title = title_elem.get_text(strip=True)
                link = link_elem.get("href", "")
                if link.startswith("/"):
                    link = "https://www.onlinejobs.ph" + link

                description = (
                    desc_elem.get_text(strip=True) if desc_elem else ""
                )

                results.append(
                    {
                        "Search Term": keyword,
                        "Job Title": title,
                        "Job Link": link,
                        "Snippet": description[:180] + "...",
                    }
                )

        # Pause 1.5 seconds so we do not flood the server
        time.sleep(1.5)

    except Exception as error:
        print(f"An error occurred while scanning '{keyword}': {error}")

    return results


def main():
    collected_jobs = []

    for kw in KEYWORDS:
        jobs = search_jobs(kw)
        collected_jobs.extend(jobs)

    output_filename = "homecare_jobs.csv"

    if collected_jobs:
        with open(output_filename, "w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=collected_jobs[0].keys())
            writer.writeheader()
            writer.writerows(collected_jobs)

        print(
            f"\nDone! Found {len(collected_jobs)} jobs. Saved to '{output_filename}'."
        )
    else:
        print("\nScan completed, but no jobs matched.")


if __name__ == "__main__":
    main()