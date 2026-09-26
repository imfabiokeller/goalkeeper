import json, os, re, time, urllib.request
from html2text import convert
UA = "GoalkeeperHackathon contact@goalkeeper.example"
sp=json.load(open('sp500_by_cik.json')); hits=json.load(open('ex991.json'))
os.makedirs("raw",exist_ok=True); os.makedirs("text2",exist_ok=True)
bycik={}
for h in hits:
    for cik in h["ciks"]:
        if cik in sp: bycik.setdefault(cik,[]).append(h)
def is_earnings(t):
    tl=t.lower()
    return (len(t)>5000 and "diluted" in tl and re.search(r"net (income|loss|earnings)",tl)
            and re.search(r"\b(revenue|revenues|net sales|total sales)\b",tl)
            and (re.search(r"(quarter|three months) ended",tl) or re.search(r"\bq[1-4] (fy)?20?26\b",tl)))
sel=[]; rejected=0; errors=0
for cik,cands in sorted(bycik.items(), key=lambda kv: sp[kv[0]]["ticker"]):
    for h in sorted(cands,key=lambda x:x["file_date"],reverse=True):
        fn=h["id"].split(":",1)[1]
        url=f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{h['adsh'].replace('-','')}/{fn}"
        key=f"{sp[cik]['ticker'].lower().replace('.','-')}-{h['file_date']}"
        rawp=f"raw/{key}.htm"
        if not os.path.exists(rawp):
            try:
                req=urllib.request.Request(url,headers={"User-Agent":UA})
                open(rawp,"wb").write(urllib.request.urlopen(req,timeout=60).read())
            except Exception as e:
                print("ERR",key,e); errors+=1; continue
            time.sleep(0.11)
        txt=convert(open(rawp,encoding="utf-8",errors="replace").read())
        if not is_earnings(txt):
            rejected+=1; continue
        open(f"text2/{key}.txt","w").write(txt)
        sel.append({"key":key,"company":sp[cik]["name"],"ticker":sp[cik]["ticker"],"cik":cik,
                    "sector":sp[cik]["sector"],"industry":sp[cik]["industry"],"filedAt":h["file_date"],
                    "edgarName":h["names"][0],"accession":h["adsh"],"source":url,"file":f"inputs/{key}.txt","chars":len(txt)})
        break
json.dump(sel,open('inputs.json','w'),indent=1)
print("selected",len(sel),"rejected",rejected,"errors",errors)
