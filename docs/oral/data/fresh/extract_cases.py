"""
抽取三位代表性學生之完整對話歷程。
產出可讀文字檔，供個案分析報告使用。
"""
import pandas as pd
import json
import os

DATA_PARSED = 'docs/oral/data/fresh/parsed_scores.csv'
DATA_AI = 'docs/oral/data/fresh/ai_analysis_full.csv'
OUTDIR = 'docs/oral/data/fresh/cases'
os.makedirs(OUTDIR, exist_ok=True)

CASES = [
    ('a085250@gmail.com', 'S01', 'Improver',
     '進步型 / 本國生 / 7→12 (+5) / 採納率 0%'),
    ('damaralbaribin@gmail.com', 'S08', 'Ceiling',
     '天花板型 / 外籍生 / 11→12 (+1) / n=10 / 採納率 100%'),
    ('lily414016@gmail.com', 'S15', 'Stable',
     '互動但下降型 / 本國生 / 9→5 (-4) / 採納率 100%'),
]

scores = pd.read_csv(DATA_PARSED)
ai = pd.read_csv(DATA_AI)
scores = scores[~scores['assignment_name'].str.contains('Welcome', na=False)]
ai = ai[~ai['assignment_name'].str.contains('Welcome', na=False)]


def extract_chat(chat_obj):
    """Extract turns from chatHistory list or _chatMessagesMap dict."""
    turns = []
    if isinstance(chat_obj, list):
        for t in chat_obj:
            role = t.get('role', '')
            text = ''
            if 'parts' in t:
                for p in t['parts']:
                    if isinstance(p, dict) and 'text' in p:
                        text += p['text']
            elif 'content' in t:
                text = t['content'] if isinstance(t['content'], str) else str(t['content'])
            if text.strip():
                turns.append((role, text.strip()))
    elif isinstance(chat_obj, dict):
        for k, v in sorted(chat_obj.items()):
            if isinstance(v, list):
                turns.extend(extract_chat(v))
    return turns


def process_student(email, code, traj, desc):
    fn = os.path.join(OUTDIR, f'{code}.md')
    sub_scores = scores[scores['student_email'] == email].sort_values('order')
    sub_ai = ai[ai['student_email'] == email]

    lines = []
    lines.append(f'# 個案 {code}（{desc}）\n')
    lines.append(f'**軌跡分類**：{traj}')
    lines.append(f'**提交次數**：{len(sub_scores)}\n')
    lines.append('## 分數歷程\n')
    lines.append('| 序 | 作業 | reflection | connection | development | total | 採納 |')
    lines.append('|---|---|---|---|---|---|---|')
    for _, r in sub_scores.iterrows():
        a_name = str(r['assignment_name'])[:50]
        dec = r.get('sparringDecision', '') or '-'
        lines.append(
            f"| {int(r['order'])} | {a_name} | {r['reflection']} | "
            f"{r['connection']} | {r['development']} | {r['totalScore']} | {dec} |"
        )
    lines.append('')

    for _, r in sub_scores.iterrows():
        sid = r['submission_id']
        ai_row = sub_ai[sub_ai['submission_id'] == sid]
        if ai_row.empty:
            continue
        try:
            j = json.loads(ai_row.iloc[0]['ai_analysis_json'])
        except Exception:
            continue

        lines.append(f"\n---\n\n## 第 {int(r['order'])} 次提交：{str(r['assignment_name'])[:60]}\n")
        lines.append(f"**分數**：R={r['reflection']} / C={r['connection']} / D={r['development']} / total={r['totalScore']}\n")

        # overallFeedback
        ofb = j.get('overallFeedback', '')
        if ofb:
            lines.append('### AI 整體回饋\n')
            lines.append(ofb[:500] + ('...' if len(ofb) > 500 else ''))
            lines.append('')

        # sparring questions
        sq = j.get('sparringQuestions', [])
        if sq:
            lines.append('### AI 挑戰式提問\n')
            for i, q in enumerate(sq[:3]):
                strat = q.get('provocation_strategy', '?')
                lines.append(f"**問題 {i+1}**（策略：{strat}）：{q.get('question', '')}")
                lines.append('')

        # dialogue
        chat_obj = j.get('chatHistory') or j.get('_chatMessagesMap')
        turns = extract_chat(chat_obj) if chat_obj else []
        if turns:
            lines.append('### 對話歷程\n')
            for role, text in turns[:20]:  # first 20 turns
                t = text.replace('\n', ' ').strip()
                if len(t) > 300:
                    t = t[:300] + '...'
                lines.append(f'- **{role}**: {t}')
            if len(turns) > 20:
                lines.append(f'- ...（共 {len(turns)} 輪，僅顯示前 20）')
            lines.append('')

        # convergence (recommendation + decision)
        # already part of chatHistory if present
        if r.get('sparringDecision'):
            reason = r.get('sparringDecisionReason') or ''
            lines.append(f"### 採納決策\n")
            lines.append(f"**決策**：{r['sparringDecision']}")
            if reason:
                lines.append(f"**理由**：{reason}")
            lines.append('')

    with open(fn, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'Wrote {fn}')


for email, code, traj, desc in CASES:
    process_student(email, code, traj, desc)
