import urllib.request
import sys

url = "https://loremflickr.com/600/400/food,cheese,sandwich"

print(f"Testing URL: {url}")
try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        info = response.info()
        print(f"Status Code: {response.status}")
        print(f"Content Type: {info.get_content_type()}")
        print(f"Final URL (redirect): {response.geturl()}")
except Exception as e:
    print(f"Error fetching image: {e}")
