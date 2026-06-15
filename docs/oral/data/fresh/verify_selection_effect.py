"""
驗證 Mann-Whitney 與 混合效應 衝突的真正原因
==============================================

假設：
H1. 高分學生交比較多次 → selection effect 把後期池子拉高
H2. 後期池子(order>=5)的學生「平均能力」本來就比較高
H3. 控制學生組成後，後期 vs 初期 的差距會縮小或消失

執行：
    python verify_selection_effect.py
"""

from __future__ import annotations
import pandas as pd
import numpy as np
from pathlib import Path

BASE = Path(__file__).parent
SCORES = BASE / "parsed_scores.csv"
FEATURES = BASE / "student_features.csv"

# ---------- 載入 ----------
df = pd.read_csv(SCORES)
feat = pd.read_csv(FEATURES)

# 只保留有 totalScore 的 graded 作業
df = df.dropna(subset=["totalScore"]).copy()
df["totalScore"] = df["totalScore"].astype(float)

print("=" * 70)
print("驗證資料總覽")
print("=" * 70)
print(f"有 totalScore 的作業：{len(df)} 份")
print(f"學生人數：{df['email'].nunique()} 人")
print()

# ---------- H1: 高分學生是否交比較多次？ ----------
print("=" * 70)
print("H1：學生「平均分數」 vs 「提交次數」 的關係")
print("=" * 70)

per_student = df.groupby("email").agg(
    n_subs=("submission_id", "count"),
    mean_score=("totalScore", "mean"),
    sd_score=("totalScore", "std"),
).reset_index()

# 分桶：低提交(1-2)、中(3-4)、高(5+)
def bucket(n):
    if n <= 2:
        return "Low (1-2)"
    if n <= 4:
        return "Mid (3-4)"
    return "High (5+)"

per_student["bucket"] = per_student["n_subs"].apply(bucket)
summary = per_student.groupby("bucket").agg(
    n_students=("email", "count"),
    mean_of_means=("mean_score", "mean"),
    sd_of_means=("mean_score", "std"),
).round(2)
print(summary)
print()

# Spearman 相關
from scipy.stats import spearmanr
rho, p = spearmanr(per_student["n_subs"], per_student["mean_score"])
print(f"Spearman ρ(提交次數, 平均分) = {rho:.3f}, p = {p:.4f}")
if p < 0.05:
    print("→ 顯著：交越多次的學生，平均分越高 → SELECTION EFFECT 存在")
else:
    print("→ 不顯著：交多交少的學生分數沒差很多 → SELECTION EFFECT 弱")
print()

# ---------- H2: 後期池子的學生組成 ----------
print("=" * 70)
print("H2：早期池子(order 1-2) vs 後期池子(order>=5) 的學生組成")
print("=" * 70)

early = df[df["order"] <= 2].copy()
late = df[df["order"] >= 5].copy()

print(f"早期池子：{len(early)} 份作業，來自 {early['email'].nunique()} 位學生")
print(f"後期池子：{len(late)} 份作業，來自 {late['email'].nunique()} 位學生")
print()

# 每個學生的「整體平均分」（不分早晚）作為個人能力代理
ability = df.groupby("email")["totalScore"].mean().rename("personal_mean")

early_students = early["email"].unique()
late_students = late["email"].unique()

early_ability = ability.loc[early_students].mean()
late_ability = ability.loc[late_students].mean()

print(f"早期池子 → 學生「個人整體平均」 = {early_ability:.2f}")
print(f"後期池子 → 學生「個人整體平均」 = {late_ability:.2f}")
print(f"差距：{late_ability - early_ability:+.2f}")
print()
print("解讀：如果差距>0，代表後期池子的學生『本來就比較強』")
print("     → Mann-Whitney 的差距，有一部分是『誰留下來』造成的")
print()

# ---------- H3: 控制學生後的差距 ----------
print("=" * 70)
print("H3：只看『早期+後期都有交』的學生(內部對比)，前後差距還剩多少？")
print("=" * 70)

both = set(early_students) & set(late_students)
print(f"早期 ∩ 後期 都有交的學生：{len(both)} 位")
print()

if len(both) > 0:
    pairs = []
    for s in both:
        e_score = early[early["email"] == s]["totalScore"].mean()
        l_score = late[late["email"] == s]["totalScore"].mean()
        pairs.append({"email": s, "early": e_score, "late": l_score, "delta": l_score - e_score})
    paired = pd.DataFrame(pairs)
    print(f"這 {len(paired)} 位學生『自己跟自己比』：")
    print(f"  早期平均 = {paired['early'].mean():.2f}")
    print(f"  後期平均 = {paired['late'].mean():.2f}")
    print(f"  個人成長 = {paired['delta'].mean():+.2f}  (SD={paired['delta'].std():.2f})")
    print()

    from scipy.stats import wilcoxon
    try:
        stat, p_wilcox = wilcoxon(paired["early"], paired["late"])
        print(f"  Wilcoxon signed-rank (配對) p = {p_wilcox:.4f}")
        if p_wilcox < 0.05:
            print("  → 即使配對檢定也顯著：真的有個人成長")
        else:
            print("  → 配對檢定不顯著：個人成長幅度太小，Mann-Whitney 的差距主要來自 selection")
    except Exception as e:
        print(f"  Wilcoxon 無法執行：{e}")
print()

# ---------- 對比：Mann-Whitney 原始結果 ----------
print("=" * 70)
print("對比：未配對 Mann-Whitney (原本論文的做法)")
print("=" * 70)
from scipy.stats import mannwhitneyu
u, p_mw = mannwhitneyu(late["totalScore"], early["totalScore"], alternative="greater")
print(f"Mann-Whitney U (late > early) p = {p_mw:.4f}")
print(f"  早期 mean = {early['totalScore'].mean():.2f} (n={len(early)})")
print(f"  後期 mean = {late['totalScore'].mean():.2f} (n={len(late)})")
print()

# ---------- 結論 ----------
print("=" * 70)
print("最終診斷")
print("=" * 70)
print(f"1. 提交次數 vs 平均分相關：ρ={rho:.3f}, p={p:.4f}")
print(f"2. 早期 vs 後期池子的學生能力差：{late_ability - early_ability:+.2f} 分")
print(f"3. 早期∩後期 配對學生內部成長：{paired['delta'].mean():+.2f} 分" if len(both) > 0 else "3. 無配對學生")
print()
print("→ 如果(1)顯著正相關 + (2)>0.5 + (3)很小")
print("   → 可以對教授講：『Mann-Whitney 的差距主要來自 selection effect，")
print("                    不是真實的個人成長』")
