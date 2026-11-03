#!/usr/bin/env python3
"""Build attributed discovery cohorts; matching leads never become pins automatically."""
import json,pathlib,unicodedata,re
ROOT=pathlib.Path(__file__).resolve().parent.parent

def build():
 e=json.loads((ROOT/'data/editorial-candidates.json').read_text());d=json.loads((ROOT/'data/discussion-candidates.json').read_text())
 # All50 entries outside the2025new-cafes feature:2026ranked20,2025new10,
 # institutional7, specialistguide13. This is a selection rule, not a citywide qualityrank.
 chosen=[r for r in e['candidates'] if 'timeout-2025' not in r['source_ids']]
 assert len(chosen)==50,len(chosen)
 sources={s['id']:s for s in e['sources']+d['sources']}
 def source_rows(ids):return[{k:sources[sid].get(k) for k in ('id','publisher','title','url','published_at','checked_at')} for sid in ids]
 editorial=[]
 for r in chosen:
  editorial.append(dict(id=r['candidate_id'],name=r['name'],area=r['area'],sources=source_rows(r['source_ids']),publisher_rank=r['publisher_rank'],rank_scope=r['source_ids'][0] if r['publisher_rank'] else None,place_id=None,location_status='Choose a catalogue branch; source name is not a verified pin.'))
 discussion=[]
 for r in sorted(d['entries'],key=lambda r:(-r['distinct_threads'],r['name'].casefold())):
  ids=[s['source_id'] for s in r['sources']]
  assert len(set(ids))==r['distinct_threads']
  discussion.append(dict(id=r['id'],name=r['name'],area=r['area_hint'],sources=source_rows(ids),mentions=r['distinct_threads'],place_id=None,location_status='Discussion may name a brand rather than a branch.'))
 assert len(discussion)==50
 for r in editorial+discussion:
  assert r['name'] and r['sources'] and all(s['url'].startswith('https://') for s in r['sources'])
  assert r['place_id'] is None
 out=dict(version=1,checked_at='2026-11-03',editorial=dict(label='Editors & institutions · 50',method='50 entries: Time Out’s ranked 20 for 2026, 10 from The Thaiger’s 2025 new cafés, 7 institutional features/directories and 13 from Roadbook. Article ranks apply only within the linked article; this is not one Bangkok Top 50 ranking.',entries=editorial),discussion=dict(label='Public discussions · 50',method='50 names in four sampled public r/Bangkok threads, March–August 2026. Sorted by distinct sampled threads mentioning a name; alphabetical ties. Counts include positive and negative mentions. Not current trends, endorsements, votes or footfall.',entries=discussion))
 (ROOT/'public/data/discovery.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
 print('Discovery:50publisher/institutionentries +50discussionentities; no pin assignments.')
if __name__=='__main__':build()
