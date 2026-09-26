import re
from html.parser import HTMLParser
BLOCK = {"p","div","br","li","h1","h2","h3","h4","h5","h6","table","ul","ol","section","article"}
CELL = {"td","th"}
class T(HTMLParser):
    def __init__(s):
        super().__init__(); s.out=[]; s.skip=0; s.row=0
    def handle_starttag(s,tag,attrs):
        if tag in ("script","style","head"): s.skip+=1
        elif tag=="tr": s.row+=1; s.out.append("\n")
        elif tag in CELL: s.out.append(" | ")
        elif tag in BLOCK: s.out.append(" " if s.row else "\n")
    def handle_endtag(s,tag):
        if tag in ("script","style","head"): s.skip=max(0,s.skip-1)
        elif tag=="tr": s.row=max(0,s.row-1); s.out.append("\n")
        elif tag in BLOCK: s.out.append(" " if s.row else "\n")
    def handle_data(s,d):
        if not s.skip: s.out.append(d)
def convert(raw):
    raw=re.sub(r"<(TYPE|SEQUENCE|FILENAME|DESCRIPTION|TEXT|DOCUMENT)>[^\n<]*","",raw)
    p=T(); p.feed(raw); t="".join(p.out)
    t=t.replace("\xa0"," ")
    t=re.sub(r"[ \t\r\f\v]+"," ",t)
    t=re.sub(r" ?\n ?","\n",t)
    t=re.sub(r"([ \t]*\|[ \t]*)+"," | ",t)
    lines=[l.strip(" |") for l in t.split("\n")]
    t="\n".join(lines)
    t=re.sub(r"\n{3,}","\n\n",t)
    out=t.strip()
    if len(out)>60000: out=out[:60000].rsplit("\n",1)[0]+"\n\n[input truncated at 60,000 characters]"
    return out+"\n"
if __name__=="__main__":
    import sys; sys.stdout.write(convert(open(sys.argv[1],encoding="utf-8",errors="replace").read()))
