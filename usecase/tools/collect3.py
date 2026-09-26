# Fill-in pass: one search per S&P 500 company not yet selected.
import json, time, urllib.request, urllib.parse
UA = "GoalkeeperHackathon contact@goalkeeper.example"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    return urllib.request.urlopen(req, timeout=30).read()
sp=json.load(open('sp500_by_cik.json'))
have={s["cik"] for s in json.load(open('inputs.json'))}
hits={h["adsh"]: h for h in json.load(open("ex991.json"))}
n=0
for cik in sorted(sp, key=lambda c: sp[c]["ticker"]):
    if cik in have: continue
    url="https://efts.sec.gov/LATEST/search-index?"+urllib.parse.urlencode({"q":'"per share"',"forms":"8-K","ciks":cik,"dateRange":"custom","startdt":"2026-07-01","enddt":"2026-09-26"})
    d=None
    for attempt in range(3):
        try: d=json.loads(get(url)); break
        except Exception as e: print("err",cik,e); time.sleep(2)
    if not d or "hits" not in d: continue
    for h in d["hits"]["hits"]:
        s=h["_source"]
        if s.get("file_type")!="EX-99.1" or s["adsh"] in hits: continue
        hits[s["adsh"]]={"id":h["_id"],"adsh":s["adsh"],"ciks":s["ciks"],"names":s["display_names"],"file_date":s["file_date"],"period_ending":s.get("period_ending")}; n+=1
    time.sleep(0.12)
json.dump(list(hits.values()),open("ex991.json","w"),indent=1)
print("new exhibits",n,"total",len(hits))
