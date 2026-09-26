# Builds sp500_by_cik.json from the Wikipedia constituents list.
import json, re, urllib.request, urllib.parse
url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode({"action": "parse", "page": "List of S&P 500 companies", "prop": "wikitext", "format": "json", "formatversion": 2})
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 goalkeeper-hackathon"})
t = json.loads(urllib.request.urlopen(req).read())["parse"]["wikitext"]
out = {}
for m in re.finditer(r"\|\|\s*\{\{\w+Symbol\|([A-Z.\-]+)\}\}\s*\n\|\|\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*\n\|\|\s*([^\n|]+?)\s*\n\|\|\s*([^\n|]+?)\s*\n\|\|[^\n]*\n\|\|[^\n]*\n\|\|\s*(\d{10})", t):
    out[m.group(5)] = {"ticker": m.group(1), "name": m.group(2).strip(), "sector": m.group(3), "industry": m.group(4)}
# Alphabet's row is formatted differently on the page and is added by hand.
out.setdefault("0001652044", {"ticker": "GOOGL", "name": "Alphabet Inc. (Class A)", "sector": "Communication Services", "industry": "Interactive Media & Services"})
json.dump(out, open("sp500_by_cik.json", "w"), indent=1)
print(len(out))
