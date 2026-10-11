"""Preserve source rows, join original lemmas by stable ID, apply explicit reviewed corrections."""
import csv
import json
import re
from collections import defaultdict
from pathlib import Path
root = Path(__file__).resolve().parent.parent
source = root / 'data/imports/harry-potter'
rows = list(csv.DictReader((source / 'hp_vocab_app.csv').open(encoding='utf-8-sig')))
master = {r['word_id']: r for r in csv.DictReader((source / 'words_master.csv').open(encoding='utf-8-sig'))}
labels = {'NOUN':'명사','VERB':'동사','ADJ':'형용사','ADV':'부사','PRON':'대명사','PROPN':'고유명사','ADP':'전치사','INTJ':'감탄사','NUM':'수사','AUX':'조동사','SCONJ':'종속접속사','DET':'한정사','CCONJ':'등위접속사','PART':'불변화사','PUNCT':'문장부호','X':'품사 확인 필요','phrasal_verb':'구동사','collocation':'연어','fixed_expression':'고정 표현','conversational_chunk':'회화 표현','british_expression':'영국식 표현','idiom':'관용구','discourse_marker':'담화 표현','other_mwe':'복합 표현','slang':'속어'}
corrections = json.loads((source / 'reviewed-corrections.json').read_text())
dialogue_reviews = defaultdict(dict)
for v in csv.DictReader((source / 'reviewed-dialogue.tsv').open(encoding='utf-8'), delimiter='\t', quoting=csv.QUOTE_NONE):
    dialogue_reviews[v['card_id']][v['sentence_id']] = v
# Keep only attributed dialogue, never scene directions or unreviewed extraction.
sentences = {s['sentence_id']: s for s in csv.DictReader((source/'sentences.csv').open(encoding='utf-8-sig'))}
word_keys = defaultdict(list)
for ident, m in master.items():
    word_keys[(m['lemma'].casefold(), m['pos'])].append(ident)
candidates = defaultdict(dict)
# OCR damage: stray symbols, detached punctuation/letters, words glued by punctuation, digits.
ocr_noise = re.compile(r"[@\[\]{}#\\*·;=+$%&/()]|\s[.,?!:]|\s'\s|[a-z][.,:][a-z]|(?<![\w'])[b-hj-zB-HJ-Z](?![\w'])|\d")
dictionary = {w.strip().casefold() for w in Path('/usr/share/dict/words').open()}
corpus_frequency = defaultdict(int)
for m in master.values():
    for form in {m['lemma'], m['display_form'], *m['forms'].split('|')}:
        corpus_frequency[form.casefold().strip()] += int(m['frequency_total'] or 0)
def known_word(token):
    k = token.casefold()
    if k in dictionary or corpus_frequency[k] >= 5: return True
    return any(k.endswith(suffix) and (k[:-len(suffix)] in dictionary or k[:-len(suffix)] + 'e' in dictionary) for suffix in ('s','es','ed','d','ing','ly','er','est'))
def readable(text):
    # Lowercase start means the line was cut mid-sentence by the page break.
    if ocr_noise.search(text) or not re.match(r"[\"'A-Z]", text): return False
    # Capitalized tokens are mostly names/spells; lowercase unknowns are mostly OCR splits (lcnow, act ually).
    for token in re.findall(r"(?<![\w'])[a-z]+(?![\w'])", text):
        if not known_word(token): return False
    # All-caps words are shouting lines where OCR errors cannot be checked (TBEY).
    return not re.search(r"\b[A-Z]{3,}\b", text)
def add(ident, occurrence):
    s = sentences.get(occurrence['sentence_id'])
    if not s or s['text_type'] != 'dialogue' or not s['speaker'] or s['review_required'] != 'false': return
    text = s['corrected_text'] or s['normalized_text']
    words = text.split()
    if not 4 <= len(words) <= 28 or not re.search(r'[.!?][\"\']?$', text): return
    if re.search(r'[|~<>_•]|\.{3}|[A-Za-z][0-9]', text) or not readable(text): return
    surface = occurrence['surface']
    if not re.search(r'(?<!\w)' + re.escape(surface) + r'(?!\w)', text, re.I): return
    candidates[ident][text.casefold()] = {'sentenceId':s['sentence_id'], 'text':text, 'surface':surface, 'speaker':s['speaker'], 'movie':s['movie_id'], 'page':s['source_page']}
for o in csv.DictReader((source/'word_occurrences.csv').open(encoding='utf-8-sig')):
    if o['is_stage_direction'] == 'true' or o['ambiguous'] == 'true': continue
    for ident in word_keys.get((o['lemma'].casefold(),o['pos']),[]): add(ident,o)
for o in csv.DictReader((source/'phrase_occurrences.csv').open(encoding='utf-8-sig')):
    if o['review_required'] == 'false': add(o['phrase_id'],o)
def select_examples(ident):
    options = sorted(candidates[ident].values(), key=lambda e:(abs(len(e['text'].split())-10),len(e['text']),e['sentenceId']))
    selected=[]
    # Prefer distinct movies before filling remaining slots with readable dialogue.
    for e in options:
        if not any(x['movie']==e['movie'] for x in selected): selected.append(e)
        if len(selected)==4: return selected
    for e in options:
        if e not in selected: selected.append(e)
        if len(selected)==4: break
    return selected
data=[]
for r in rows:
    m=master.get(r['item_id'])
    d={'id':r['item_id'],'word':m['lemma'] if m else r['form'],'surface':r['form'],'meaning':r['meaning_ko'],'alternative':r['meaning_ko_alt'],'note':r['usage_note_ko'],'level':r['cefr'] or '미분류','type':r['item_type'],'pos':labels.get(r['pos_or_type'],'품사 확인 필요'),'reviewed':False}
    d.update(corrections.get(r['item_id'],{}))
    # Reviewed junk entries (letter fragments, script directions) are dropped from the deck.
    if d.pop('exclude', False): continue
    example_id = r['item_id']
    # Reviewed headword/POS corrections must not inherit a different sense's occurrences.
    overrides = {'W-437bf7a520':('leave','VERB'), 'W-d169b6eb1a':('go','VERB'), 'W-455b4f5728':('good','ADJ')}
    if example_id in overrides:
        matches = word_keys.get(overrides[example_id], [])
        example_id = matches[0] if matches else ''
    d['examples']=select_examples(example_id)
    # Reviewed cards show only lines whose sense matches the card, with a Korean translation.
    if r['item_id'] in dialogue_reviews:
        review = dialogue_reviews[r['item_id']]
        d['examples'] = [{**e, 'ko': review[e['sentenceId']]['ko']} for e in d['examples'] if review.get(e['sentenceId'], {}).get('sense_match') == '1']
    data.append(d)
assert len(data)==len(rows)-sum(bool(c.get('exclude')) for c in corrections.values()) and len({r['id'] for r in data})==len(data)
(root/'apps/mobile/src/data/hp-vocabulary.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'records':len(data),'changedHeadwords':sum(d['word']!=d['surface'] for d in data),'reviewedCorrections':len(corrections)},ensure_ascii=False))

print(json.dumps({'withDialogue':sum(bool(d['examples']) for d in data),'withFour':sum(len(d['examples'])==4 for d in data)}))
