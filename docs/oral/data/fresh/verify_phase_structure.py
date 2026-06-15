"""
驗證 P1 / P2 的結構性差異
==========================

問題：課程一(P1)和課程二(P2)的：
- 作業總次數不一樣
- 學生組成不一樣
- 「order=1-2」可能全部都是 P1，「order>=5」可能全部都是 P2
   → 我們在比的不是「同一門課的前後」，是「兩門不同課的學生」

執行：python3 verify_phase_structure.py
"""
from __future__ import annotations
import pandas as pd
from pathlib import Path

BASE = Path(__file__).parent
df = pd.read_csv(BASE / "parsed_scores.csv")
df = df.dropna(subset=["totalScore"]).copy()
df["totalScore"] = df["totalScore"].astype(float)

print("=" * 70)
print("Q1：P1 / P2 各有多少作業？多少學生？")
print("=" * 70)
phase_summary = df.groupby("phase").agg(
    n_subs=("submission_id", "count"),
    n_students=("email", "nunique"),
    mean_score=("totalScore", "mean"),
).round(2)
print(phase_summary)
print()

# 每個學生的 P1/P2 出席
print("=" * 70)
print("Q2：學生 P1/P2 重疊狀況")
print("=" * 70)
attendance = df.groupby(["email", "phase"])["submission_id"].count().unstack(fill_value=0)
attendance.columns = [f"n_{c}" for c in attendance.columns]
attendance["both"] = ((attendance.get("n_P1", 0) > 0) & (attendance.get("n_P2", 0) > 0))
print(f"只在 P1：{((attendance.get('n_P1', 0) > 0) & (attendance.get('n_P2', 0) == 0)).sum()} 人")
print(f"只在 P2：{((attendance.get('n_P1', 0) == 0) & (attendance.get('n_P2', 0) > 0)).sum()} 人")
print(f"P1+P2 都有：{attendance['both'].sum()} 人")
print(f"總人數：{len(attendance)} 人")
print()

# order 分布
print("=" * 70)
print("Q3：order 1-2 vs order>=5 在 P1/P2 的分布")
print("=" * 70)
df["pool"] = df["order"].apply(lambda o: "early(1-2)" if o <= 2 else ("late(5+)" if o >= 5 else "mid(3-4)"))
ct = pd.crosstab(df["pool"], df["phase"])
print(ct)
print()

# 早期池子 vs 後期池子的 P1/P2 比例
early = df[df["order"] <= 2]
late = df[df["order"] >= 5]
print(f"早期池(order≤2): P1={len(early[early['phase']=='P1'])}, P2={len(early[early['phase']=='P2'])}")
print(f"後期池(order≥5): P1={len(late[late['phase']=='P1'])}, P2={len(late[late['phase']=='P2'])}")
print()

# 每個學生在每個 phase 內的 order 範圍
print("=" * 70)
print("Q4：每個 phase 內，學生最多寫到第幾份？")
print("=" * 70)
per_phase = df.groupby(["phase", "email"])["order"].agg(["min", "max", "count"]).reset_index()
print("P1 每位學生 order range 摘要：")
print(per_phase[per_phase["phase"]=="P1"][["min", "max", "count"]].describe().round(2))
print()
print("P2 每位學生 order range 摘要：")
print(per_phase[per_phase["phase"]=="P2"][["min", "max", "count"]].describe().round(2))
print()

# 關鍵：order 是「全課程連號」還是「phase 內重新編號」？
print("=" * 70)
print("Q5：order 是全課程連號還是 phase 內重新編號？")
print("=" * 70)
# 抽 3 個有兩 phase 的學生看 order
sample = attendance[attendance["both"]].head(3).index.tolist()
for s in sample:
    rows = df[df["email"] == s][["phase", "order", "upload_date", "totalScore"]].sort_values("upload_date")
    print(f"\n學生 {s[:20]}...")
    print(rows.to_string(index=False))
print()

# 如果 order 是全課程連號 → P2 的學生 order 一定 >= P1 最後一份
# 如果 P2 重新從 1 開始 → 後期池子(order>=5)可能其實也包含 P2 的「初學者」

# ---------- 在 P1 內單獨做 early vs late ----------
print("=" * 70)
print("Q6：只看 P1 內部：早期 vs 後期 還有差距嗎？")
print("=" * 70)
p1 = df[df["phase"] == "P1"].copy()
# P1 內，每個學生重新編號
p1["order_within_p1"] = p1.sort_values("upload_date").groupby("email").cumcount() + 1
p1_early = p1[p1["order_within_p1"] <= 2]
p1_late = p1[p1["order_within_p1"] >= 5]
print(f"P1 早期(1-2): n={len(p1_early)}, mean={p1_early['totalScore'].mean():.2f}, 學生數={p1_early['email'].nunique()}")
print(f"P1 後期(5+):  n={len(p1_late)}, mean={p1_late['totalScore'].mean():.2f}, 學生數={p1_late['email'].nunique()}")
if len(p1_late) >= 5:
    from scipy.stats import mannwhitneyu
    u, p = mannwhitneyu(p1_late["totalScore"], p1_early["totalScore"], alternative="greater")
    print(f"P1 內 Mann-Whitney p = {p:.4f}")
print()

print("=" * 70)
print("Q7：只看 P2 內部：早期 vs 後期 還有差距嗎？")
print("=" * 70)
p2 = df[df["phase"] == "P2"].copy()
p2["order_within_p2"] = p2.sort_values("upload_date").groupby("email").cumcount() + 1
p2_early = p2[p2["order_within_p2"] <= 2]
p2_late = p2[p2["order_within_p2"] >= 5]
print(f"P2 早期(1-2): n={len(p2_early)}, mean={p2_early['totalScore'].mean():.2f}, 學生數={p2_early['email'].nunique()}")
print(f"P2 後期(5+):  n={len(p2_late)}, mean={p2_late['totalScore'].mean():.2f}, 學生數={p2_late['email'].nunique()}")
if len(p2_late) >= 5:
    from scipy.stats import mannwhitneyu
    u, p = mannwhitneyu(p2_late["totalScore"], p2_early["totalScore"], alternative="greater")
    print(f"P2 內 Mann-Whitney p = {p:.4f}")
else:
    print("P2 後期樣本不足，無法做檢定")
print()

print("=" * 70)
print("總結")
print("=" * 70)
print("""
如果發現：
- P2 的 order>=5 樣本很少甚至為 0
- 後期池子 34 份幾乎全部是 P1 的學生
- P1 內單獨檢定後差距變小 / P2 內無法檢定
→ 表示我們原本的 Mann-Whitney 把『兩門不同課』混在一起比
  selection effect 之外，還疊加了 phase confounding
""")
