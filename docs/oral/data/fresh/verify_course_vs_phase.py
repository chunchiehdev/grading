"""
釐清兩個維度：
  維度 A：課程一(C1) vs 課程二(C2)  → 不同課、不同作業設計
  維度 B：P1(系統迭代早期) vs P2(系統迭代後期) → 同一系統的不同版本

關鍵問題：
  1. C1 和 C2 是不是不同學生？（用 email 重疊度檢查）
  2. 之前 Mann-Whitney 的 order=1-2 跟 order≥5 到底分布在 C1/C2、P1/P2 哪裡？
"""
from __future__ import annotations
import pandas as pd
from pathlib import Path

BASE = Path(__file__).parent
df = pd.read_csv(BASE / "parsed_scores.csv")
df = df.dropna(subset=["totalScore"]).copy()
df["totalScore"] = df["totalScore"].astype(float)

# 依照論文表 15 區分課程
C1_NAMES = {"【115/03/19 Assignment 】", "【115/03/26 Assignment 】", "【115/04/09 Assignment 】"}
C2_NAMES = {
    "【115/03/05 Assignment 】Reading Popper' s Paper",
    "【115/03/12 Assignment 】KB_gallery (p15-33)",
    "【115/03/19 Assignment 】KB gallery (40–69 )",
    "【115/03/26 Assignment 】KB gallery (109-153)",
    "【115/04/02 Assignment 】",
    "【115/04/09 Assignment 】",
    "【115/04/16 Assignment 】",
}
# 系統練習作業（非正式反思）— 論文有時會排除
PRACTICE = {"【115/03/05 Assignment 】Welcome & System Practice Submission"}

def label_course(name: str) -> str:
    if name in C1_NAMES:
        return "C1"
    if name in C2_NAMES:
        return "C2"
    if name in PRACTICE:
        return "Practice"
    return "Unknown"

# 注意：C1 和 C2 在 04/09 同名「【115/04/09 Assignment 】」可能有歧義
# 我先用論文表 15 的「提交人數」反推，若 04/09 有兩種不同提交群體可再細分
df["course"] = df["assignment_name"].apply(label_course)

print("=" * 70)
print("Step 1：每門課的作業數、提交數、學生數")
print("=" * 70)
ct = df.groupby("course").agg(
    n_subs=("submission_id", "count"),
    n_students=("email", "nunique"),
    n_assignments=("assignment_name", "nunique"),
    mean_score=("totalScore", "mean"),
).round(2)
print(ct)
print()
print(f"論文表 15 寫：課程一 3 項作業共 29 份；課程二 7 項作業共 81 份；合計 110 份")
print()

# ---------- 學生組成 ----------
print("=" * 70)
print("Step 2：C1 學生 vs C2 學生 — 重疊嗎？")
print("=" * 70)
c1_students = set(df[df["course"] == "C1"]["email"].unique())
c2_students = set(df[df["course"] == "C2"]["email"].unique())
practice_students = set(df[df["course"] == "Practice"]["email"].unique())

both = c1_students & c2_students
only_c1 = c1_students - c2_students
only_c2 = c2_students - c1_students

print(f"只上 C1：{len(only_c1)} 人")
print(f"只上 C2：{len(only_c2)} 人")
print(f"C1 + C2 都上：{len(both)} 人")
print(f"練習作業有提交者：{len(practice_students)} 人")
print()
print("→ 如果『只 C1』和『只 C2』各自不少 → C1/C2 學生群體基本上是分開的")
print("→ 比較 C1 早期 vs C2 後期 = 在比兩群不同學生")
print()

# ---------- order 分布 × 課程 × phase ----------
print("=" * 70)
print("Step 3：order=1-2 (早期池) 跟 order≥5 (後期池) 在 C1/C2 × P1/P2 怎麼分布？")
print("=" * 70)
df["pool"] = df["order"].apply(lambda o: "early(1-2)" if o <= 2 else ("late(5+)" if o >= 5 else "mid(3-4)"))

print("\n[早期池 order=1-2]")
early = df[df["pool"] == "early(1-2)"]
print(pd.crosstab(early["course"], early["phase"], margins=True))

print("\n[後期池 order≥5]")
late = df[df["pool"] == "late(5+)"]
print(pd.crosstab(late["course"], late["phase"], margins=True))
print()

print("早期池來自哪些學生 vs 後期池來自哪些學生：")
early_students = set(early["email"].unique())
late_students = set(late["email"].unique())
print(f"  早期池學生數：{len(early_students)}")
print(f"  後期池學生數：{len(late_students)}")
print(f"  兩池共同學生：{len(early_students & late_students)}")
print(f"  只在早期池：{len(early_students - late_students)} 人")
print(f"  只在後期池：{len(late_students - early_students)} 人")
print()

# ---------- 課程一 vs 課程二 直接比 ----------
print("=" * 70)
print("Step 4：C1 整體均分 vs C2 整體均分 — 課程本身差距")
print("=" * 70)
c1_scores = df[df["course"] == "C1"]["totalScore"]
c2_scores = df[df["course"] == "C2"]["totalScore"]
print(f"C1：n={len(c1_scores)}, mean={c1_scores.mean():.2f}, SD={c1_scores.std():.2f}")
print(f"C2：n={len(c2_scores)}, mean={c2_scores.mean():.2f}, SD={c2_scores.std():.2f}")
from scipy.stats import mannwhitneyu
u, p = mannwhitneyu(c2_scores, c1_scores, alternative="two-sided")
print(f"Mann-Whitney C1 vs C2 (雙尾) p = {p:.4f}")
print()

# ---------- 在 C2 內單獨檢定 (C2 學生較多，作業7項，比較有意義) ----------
print("=" * 70)
print("Step 5：只在 C2 內部做 early vs late（同一群學生、同一系列作業）")
print("=" * 70)
c2 = df[df["course"] == "C2"].copy()
# 在 C2 內部，依 upload_date 重新給 order
c2 = c2.sort_values("upload_date").copy()
c2["order_c2"] = c2.groupby("email").cumcount() + 1
c2_early = c2[c2["order_c2"] <= 2]
c2_late = c2[c2["order_c2"] >= 5]
print(f"C2 內早期(1-2): n={len(c2_early)}, mean={c2_early['totalScore'].mean():.2f}, 學生={c2_early['email'].nunique()}")
print(f"C2 內後期(5+):  n={len(c2_late)}, mean={c2_late['totalScore'].mean():.2f}, 學生={c2_late['email'].nunique()}")
if len(c2_late) >= 5:
    u, p = mannwhitneyu(c2_late["totalScore"], c2_early["totalScore"], alternative="greater")
    print(f"  C2 內 Mann-Whitney (late>early) p = {p:.4f}")
print()
# 配對
c2_both_students = set(c2_early["email"].unique()) & set(c2_late["email"].unique())
print(f"  C2 內早期且後期都有交的學生：{len(c2_both_students)}")
if len(c2_both_students) >= 5:
    pairs = []
    for s in c2_both_students:
        e = c2_early[c2_early["email"] == s]["totalScore"].mean()
        l = c2_late[c2_late["email"] == s]["totalScore"].mean()
        pairs.append({"early": e, "late": l, "delta": l - e})
    pdf = pd.DataFrame(pairs)
    print(f"  配對成長 mean = {pdf['delta'].mean():+.2f} (SD={pdf['delta'].std():.2f})")
    from scipy.stats import wilcoxon
    try:
        stat, p_w = wilcoxon(pdf["early"], pdf["late"])
        print(f"  Wilcoxon p = {p_w:.4f}")
    except Exception as e:
        print(f"  Wilcoxon 無法執行：{e}")
print()

print("=" * 70)
print("結論")
print("=" * 70)
print("""
我之前混淆了兩件事：
  ✘ 錯：以為 P1=課程一早期、P2=課程二後期
  ✓ 正：P1/P2 是「系統開發迭代」（按提交日期 04/05 為界）
        C1/C2 是「兩門不同的課」（不同作業設計、不同學生群）

這兩個維度是「正交」的：
  - 任何一份作業同時屬於某個課程(C1/C2) 和 某個系統階段(P1/P2)
  - C1 第 3 次作業 (04/09) 屬於 P2 階段
  - C2 第 1 次作業 (03/05) 屬於 P1 階段
""")
