# talk to reddit and bring back raw posts, returns as a list of dictionaries

from datetime import datetime, timezone
import requests

USER_AGENT = "reddit-thesis-dashboard/0.1 by MeltedEgg" # identifies us to reddit, requests without a user agent get blocked
BASE_URL = "https://arctic-shift.photon-reddit.com/api/posts/search"

def fetch_new_posts(subreddit_name: str, limit: int = 100) -> list[dict]:
    response = requests.get(
        BASE_URL,
        params = {"subreddit": subreddit_name, "limit": limit, "sort": "desc"},
        headers = {"User-Agent": USER_AGENT},
        timeout = 45,
    )

    response.raise_for_status() # if reddit returns an error, throws immediately
    listing = response.json() # parses the response body into a json dict

    posts = []
    for post in listing["data"]:
        text = post["title"] + "\n" + (post.get("selftext") or "")
        posts.append({
            "redditId": post["name"],
            "subreddit": subreddit_name,
            "author": post.get("author") or "[deleted]",
            "permalink": f"https://reddit.com{post['permalink']}",
            "text": text,
            "score": post.get("score") or 0,  # upvotes at scrape time — drives extraction priority
            "postedAt": datetime.fromtimestamp(post["created_utc"], tz=timezone.utc),
        })

    return posts
    