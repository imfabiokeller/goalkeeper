import json, time, urllib.request, urllib.parse
UA = "GoalkeeperHackathon contact@goalkeeper.example"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    return urllib.request.urlopen(req, timeout=30).read()
hits = {h["adsh"]: h for h in json.load(open("ex991.json"))}
qs = ['"announces financial results"', '"announces second quarter"', '"announces third quarter"', '"reports second quarter"', '"reports third quarter"', '"reports fourth quarter"', '"announces fourth quarter"', '"quarter 2026 results"', '"fiscal 2026 results"', '"reports first quarter"', '"announces first quarter"', '"diluted earnings per share"']
for q in qs:
    for frm in range(0, 1000, 100):
        url = "https://efts.sec.gov/LATEST/search-index?" + urllib.parse.urlencode({
            "q": q, "forms": "8-K", "dateRange": "custom", "startdt": "2026-07-01", "enddt": "2026-09-26", "from": frm})
        d = None
        for attempt in range(3):
            try:
                d = json.loads(get(url)); break
            except Exception as e:
                print("err", q, frm, e); time.sleep(1.5)
        if not d: break
        hs = d["hits"]["hits"]
        if not hs: break
        for h in hs:
            s = h["_source"]
            if s.get("file_type") != "EX-99.1": continue
            adsh = s["adsh"]
            if adsh in hits: continue
            hits[adsh] = {"id": h["_id"], "adsh": adsh, "ciks": s["ciks"], "names": s["display_names"], "file_date": s["file_date"], "period_ending": s.get("period_ending")}
        time.sleep(0.12)
    print(q, len(hits), flush=True)
json.dump(list(hits.values()), open("ex991.json", "w"), indent=1)
print("total ex-99.1", len(hits))
