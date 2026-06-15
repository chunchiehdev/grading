"""
用可靠的 course_name 欄位，重做課程二內部前後對比
=================================================
資料來源：submissions_full.csv（有 course_name、ai_total_score、phase、isLatest、status）
目標：盡量對齊論文口徑（28 學生 / 110 份 AI 評分作業），再做課程二內部 early vs late
"""
from __future__ import annotations
import pandas as pd
from pathlib import Path

BASE = Path(__file__).parent
df = pd.read_csv(BASE / "submissions_full.csv")

print("=" * 70)
print("Step 0：資料總覽")
print("=" * 70)
print(f"總列數：{len(df)}")
print(f"\ncourse_name 分布：")
print(df["course_name"].value_counts())
print(f"\nstatus 分布：")
print(df["status"].value_counts(dropna=False))
print(f"\nisLatest 分布：")
print(df["isLatest"].value_counts(dropna=False))
print(f"\n有 ai_total_score 的列：{df['ai_total_score'].notna().sum()}")
print()

# ---------- 嘗試對齊論文 110 份 / 28 人 ----------
print("=" * 70)
print("Step 1：嘗試對齊論文口徑（110 份 AI 評分 / 28 人）")
print("=" * 70)

graded = df[df["ai_total_score"].notna()].copy()
print(f"有 AI 評分：{len(graded)} 份、{graded['student_email'].nunique()} 人")

# 排除練習作業
practice_mask = graded["assignment_name"].str.contains("Welcome|System Practice|Practice", case=False, na=False)
print(f"其中練習作業（Welcome/Practice）：{practice_mask.sum()} 份")

graded_no_practice = graded[~practice_mask].copy()
print(f"排除練習後：{len(graded_no_practice)} 份、{graded_no_practice['student_email'].nunique()} 人")
print()

# 看 isLatest 過濾
if "isLatest" in graded_no_practice.columns:
    latest_only = graded_no_practice[graded_no_practice["isLatest"] == True]
    print(f"再只取 isLatest=True：{len(latest_only)} 份、{latest_only['student_email'].nunique()} 人")
print()

# 選定工作集：有AI評分 + 排除練習
work = graded_no_practice.copy()
print(f"==> 採用工作集：{len(work)} 份、{work['student_email'].nunique()} 人")
print(f"   （論文寫 110 份 / 28 人，差距：{len(work)-110:+d} 份、{work['student_email'].nunique()-28:+d} 人）")
print()

print("工作集的 course_name 分布：")
print(work["course_name"].value_counts())
print()

# ---------- Step 2：辨識課程二 ----------
print("=" * 70)
print("Step 2：課程二內部 early vs late")
print("=" * 70)
courses = work["course_name"].dropna().unique()
print(f"課程清單：{list(courses)}")
print()

# 課程二 = 7 項作業那門（Knowledge Creation）
for cname in courses:
    sub = work[work["course_name"] == cname]
    n_assign = sub["assignment_name"].nunique()
    n_stu = sub["student_email"].nunique()
    print(f"  「{cname[:45]}」：{len(sub)} 份、{n_stu} 人、{n_assign} 項作業")
print()

# 自動挑作業數最多的當課程二
c2_name = max(courses, key=lambda c: work[work["course_name"] == c]["assignment_name"].nunique())
print(f"==> 判定課程二 = 「{c2_name[:50]}」")
c2 = work[work["course_name"] == c2_name].copy()
c2["ai_total_score"] = c2["ai_total_score"].astype(float)
print(f"   課程二：{len(c2)} 份、{c2['student_email'].nunique()} 人、{c2['assignment_name'].nunique()} 項作業")
print()

# 在課程二內，依上傳時間給每位學生重新編 order
c2 = c2.sort_values("uploadedAt")
c2["order_in_c2"] = c2.groupby("student_email").cumcount() + 1

early = c2[c2["order_in_c2"] <= 2]
late = c2[c2["order_in_c2"] >= 5]
print(f"課程二內 早期(第1-2次): n={len(early)}, 平均={early['ai_total_score'].mean():.2f}, {early['student_email'].nunique()} 人")
print(f"課程二內 後期(第5次+): n={len(late)}, 平均={late['ai_total_score'].mean():.2f}, {late['student_email'].nunique()} 人")
print()

from scipy.stats import mannwhitneyu, wilcoxon
if len(late) >= 3 and len(early) >= 3:
    u, p = mannwhitneyu(late["ai_total_score"], early["ai_total_score"], alternative="greater")
    print(f"課程二內 Mann-Whitney (late > early): p = {p:.4f}")
else:
    print("課程二後期樣本太少，無法做未配對檢定")
print()

# 配對：同一群學生（早晚期都有交）
both = set(early["student_email"]) & set(late["student_email"])
print(f"課程二內 早期+後期都有交的學生：{len(both)} 人")
if len(both) >= 3:
    rows = []
    for s in both:
        e = early[early["student_email"] == s]["ai_total_score"].mean()
        l = late[late["student_email"] == s]["ai_total_score"].mean()
        rows.append({"early": e, "late": l, "delta": l - e})
    pdf = pd.DataFrame(rows)
    print(f"  配對前後：早期={pdf['early'].mean():.2f} → 後期={pdf['late'].mean():.2f}")
    print(f"  個人成長 = {pdf['delta'].mean():+.2f} (SD={pdf['delta'].std():.2f})")
    try:
        stat, pw = wilcoxon(pdf["early"], pdf["late"])
        print(f"  Wilcoxon 配對 p = {pw:.4f}")
    except Exception as e:
        print(f"  Wilcoxon 無法執行：{e}")
print()

print("=" * 70)
print("結論")
print("=" * 70)
print("這版用 course_name 可靠欄位，沒有 Unknown 問題。")
print("數字可作為『課程二內部穩健性檢驗』的依據。")
