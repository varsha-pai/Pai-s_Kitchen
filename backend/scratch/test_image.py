import urllib.request
import urllib.parse
import sys

prompt = "Savory Grilled Cheese with Potato, Caramelized Onion, and Garlic, delicious authentic traditional recipe, professional close-up food photography, beautiful rustic table setting, natural window light, appetizing and fresh, high quality, 8k resolution"
url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=600&height=400&nologo=true&seed=2050472421"

print(f"Testing URL: {url}")
try:
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response:
        info = response.info()
        print(f"Status Code: {response.status}")
        print(f"Content Type: {info.get_content_type()}")
        print(f"Content Length: {info.get('Content-Length')}")
except Exception as e:
    print(f"Error fetching image: {e}")
