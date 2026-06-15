"""
RQ3 分析腳本（可重現）
產出：表 21–28 數據 + 圖 38–41
資料源：docs/oral/data/fresh/parsed_scores.csv（直接從生產資料庫撈出）
"""
import pandas as pd
import numpy as np
from scipy import stats
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import statsmodels.formula.api as smf
import os

DATA = 'docs/oral/data/fresh/parsed_scores.csv'
OUTDIR = 'docs/oral/data/fresh/figures'
os.makedirs(OUTDIR, exist_ok=True)

df = pd.read_csv(DATA)

# ===========================================================================
# 排除規則：剔除「Welcome & System Practice」系統練習作業
# ---------------------------------------------------------------------------
# 理由：此作業為協助學生熟悉系統操作之 onboarding 任務，並非課程教師指定之
#       正式反思作業，故不納入 RQ3 之書面反思表現分析。
# 影響：
#   - 排除 7 筆提交（皆無 AI 評分，故對 110 份有評分作業數無影響）
#   - 排除 2 筆採納決策（皆為 P2 階段事後測試按鈕之短回應）
#   - 採納決策總數由 36 → 34；採納率由 94.4% → 94.1%
# 此排除規則同步記錄於本目錄之 README.md。
# ===========================================================================
df = df[~df['assignment_name'].str.contains('Welcome', na=False)].copy()

df_scored = df.dropna(subset=['reflection', 'connection', 'development']).copy()

# ===========================================================================
# 排除規則 2：剔除評分異常之提交
# ---------------------------------------------------------------------------
# 理由：1 筆提交（a114524007，115/04/09 Assignment）三構面均為 0 分
#       （totalScore 0/12、無對話紀錄），超出評分規準 1–4 分之範圍，
#       研判為 AI 評分異常，非有效評分結果，故不納入 RQ3 分析。
# 影響：有效評分作業數由 110 → 109；該生其餘提交仍保留，學生數維持 28。
# ===========================================================================
df_scored = df_scored[~((df_scored['reflection'] == 0) &
                        (df_scored['connection'] == 0) &
                        (df_scored['development'] == 0))].copy()

df_scored['total'] = df_scored['reflection'] + df_scored['connection'] + df_scored['development']

# ---- Table 21 base ----
print(f"Active students with scores: {df_scored['student_email'].nunique()}")
print(f"Total scored submissions: {len(df_scored)}")
print(f"P1 / P2 split: {df_scored['phase'].value_counts().to_dict()}")
print(f"Decisions: {df['sparringDecision'].value_counts().to_dict()}")

# ---- Table 22: Three dimensions ----
print("\nThree-dimension descriptive stats:")
for c in ['reflection', 'connection', 'development']:
    s = df_scored[c]
    print(f"  {c}: M={s.mean():.2f}, SD={s.std():.2f}")

# ---- Table 23: Order x dimensions ----
print("\nOrder x dimensions:")
print(df_scored.groupby('order')[['reflection','connection','development','total']].mean().round(2))

# ---- Table 24: Mixed-effects model ----
print("\nMixed-effects model results:")
for dep in ['reflection','connection','development','total']:
    m = smf.mixedlm(f'{dep} ~ order', df_scored, groups=df_scored['student_email']).fit()
    print(f"  {dep}: β={m.params['order']:.4f}, SE={m.bse['order']:.4f}, p={m.pvalues['order']:.4f}")

# ---- Table 25: Mann-Whitney ----
# 報告慣例：MW 為等級檢定，除平均數外另報中位數、U 值與效果量 r。
# r 採 rank-biserial correlation，由 U 直接換算：r = 1 - 2U/(n1*n2)，
# 其中 U 為 early 組之統計量；r > 0 表示後期分數高於初期。
# 效果量解讀慣例：|r| ≈ .1 小、.3 中、.5 大。
print("\nMann-Whitney (early≤2 vs late≥5):")
early = df_scored[df_scored['order']<=2]
late = df_scored[df_scored['order']>=5]
n1, n2 = len(early), len(late)
print(f"  n_early={n1}, n_late={n2}")
for c in ['reflection','connection','development','total']:
    u, p = stats.mannwhitneyu(early[c], late[c], alternative='two-sided')
    r = 1 - 2 * u / (n1 * n2)
    print(f"  {c}: M_early={early[c].mean():.2f} (Mdn={early[c].median():.1f}), "
          f"M_late={late[c].mean():.2f} (Mdn={late[c].median():.1f}), "
          f"U={u:.1f}, p={p:.4f}, r={r:.2f}")

# ---- Table 27: Trajectories ----
print("\nTrajectory classification:")
def classify(mean, mn, rho):
    if mean >= 11 and mn >= 10: return 'Ceiling'
    if not np.isnan(rho):
        if rho > 0.3: return 'Improver'
        if rho < -0.3: return 'Decliner'
    return 'Stable'

types = {'Ceiling':0,'Improver':0,'Stable':0,'Decliner':0}
for email,g in df_scored.groupby('student_email'):
    if len(g) >= 3:
        rho,_ = stats.spearmanr(g['order'], g['total']) if g['total'].std()>0 else (np.nan,np.nan)
        t = classify(g['total'].mean(), g['total'].min(), rho)
        types[t] += 1
total = sum(types.values())
for k,v in types.items():
    print(f"  {k}: {v} ({v/total*100:.1f}%)")

# ===========================================================================
# 探索性分析：進步型 vs 非進步型學生之 pattern 比較
# ---------------------------------------------------------------------------
# 目的：在 RQ3 主分析（混合效應、Mann-Whitney 前後期）之外，進一步觀察
#       「哪些學生有進步、哪些沒有」是否可從以下面向加以區分：
#         1. 初始分數（是否有進步空間）
#         2. 提交次數與提交間隔
#         3. 對話互動程度（chat_len）
#         4. 採納率（P2 階段）
#         5. 學生背景（本國/外籍）
# 樣本：提交 ≥3 次之 17 位學生
# 分組：
#   A. Improver (進步型, ρ>0.3)
#   B. Non-Improver 嚴格定義：Stable + Decliner（排除 Ceiling，因高分本就難進步）
#   C. Non-Improver 寬鬆定義：Stable + Decliner + Ceiling（全部非 Improver）
# 統計方法：Mann-Whitney U（連續變項）、Fisher's exact（類別變項）
# 限制：N 很小（8 vs 4 或 8 vs 9），檢力低，未達顯著為常態，僅作描述性觀察。
# ===========================================================================
print("\n" + "="*70)
print("Exploratory: Improver vs Non-Improver group comparison")
print("="*70)

def get_trajectory(g):
    if len(g) < 3:
        return 'TooFew'
    rho = np.nan
    if g['total'].std() > 0:
        rho, _ = stats.spearmanr(g['order'], g['total'])
    if g['total'].mean() >= 11 and g['total'].min() >= 10:
        return 'Ceiling'
    if not np.isnan(rho):
        if rho > 0.3: return 'Improver'
        if rho < -0.3: return 'Decliner'
    return 'Stable'

# Per-student features
records = []
for email, g in df_scored.groupby('student_email'):
    g_sorted = g.sort_values('order').copy()
    traj = get_trajectory(g_sorted)
    rec = {
        'email': email,
        'name': g_sorted.iloc[0].get('name', ''),
        'nationality': g_sorted.iloc[0].get('nationality', ''),
        'trajectory': traj,
        'n_subs': len(g_sorted),
        'initial_total': g_sorted.iloc[0]['total'],
        'final_total': g_sorted.iloc[-1]['total'],
        'delta_total': g_sorted.iloc[-1]['total'] - g_sorted.iloc[0]['total'],
        'mean_total': g_sorted['total'].mean(),
        'sd_total': g_sorted['total'].std(),
        'mean_chat_len': g_sorted['chat_len'].mean(),
        'total_chat_len': g_sorted['chat_len'].sum(),
    }
    # adoption rate (only on rows with a decision)
    dec = g_sorted[g_sorted['sparringDecision'].notna() & (g_sorted['sparringDecision'] != '')]
    rec['n_decisions'] = len(dec)
    if len(dec) > 0:
        rec['adoption_rate'] = (dec['sparringDecision'].astype(str).str.lower() == 'adopt').mean()
    else:
        rec['adoption_rate'] = np.nan
    # mean interval
    try:
        dates = pd.to_datetime(g_sorted['upload_date']).sort_values()
        if len(dates) >= 2:
            rec['mean_interval_days'] = dates.diff().dt.days.dropna().mean()
        else:
            rec['mean_interval_days'] = np.nan
    except Exception:
        rec['mean_interval_days'] = np.nan
    # P1 vs P2 split per student
    rec['n_p1_subs'] = (g_sorted['phase'] == 'P1').sum()
    rec['n_p2_subs'] = (g_sorted['phase'] == 'P2').sum()
    records.append(rec)

feat = pd.DataFrame(records)

# Trajectory counts (sanity check)
print("\nTrajectory counts (sanity check):")
print(feat['trajectory'].value_counts().to_string())

# Print per-student table (sorted by trajectory then by delta)
print("\nPer-student profile (≥3 submissions only):")
shown = feat[feat['trajectory'] != 'TooFew'].copy()
shown = shown.sort_values(['trajectory', 'delta_total'], ascending=[True, False])
cols = ['trajectory','n_subs','initial_total','final_total','delta_total',
        'mean_chat_len','adoption_rate','n_decisions','mean_interval_days',
        'nationality']
print(shown[cols].round(2).to_string(index=False))

# ---- Group A: Improver vs Strict Non-Improver (Stable + Decliner) ----
improver = feat[feat['trajectory'] == 'Improver']
non_strict = feat[feat['trajectory'].isin(['Stable', 'Decliner'])]
non_loose = feat[feat['trajectory'].isin(['Stable', 'Decliner', 'Ceiling'])]

def compare(label, a, b, cols_to_test):
    print(f"\n--- {label} (Improver N={len(a)} vs N={len(b)}) ---")
    print(f"{'feature':<22} {'Imp_M':>7} {'Imp_SD':>7} {'NI_M':>7} {'NI_SD':>7} {'U':>7} {'p':>7}")
    for c in cols_to_test:
        x = a[c].dropna()
        y = b[c].dropna()
        if len(x) < 2 or len(y) < 2:
            print(f"{c:<22} (insufficient N)")
            continue
        try:
            u, p = stats.mannwhitneyu(x, y, alternative='two-sided')
            print(f"{c:<22} {x.mean():>7.2f} {x.std():>7.2f} {y.mean():>7.2f} {y.std():>7.2f} {u:>7.1f} {p:>7.4f}")
        except ValueError as e:
            print(f"{c:<22} (error: {e})")

cont_cols = ['n_subs','initial_total','final_total','mean_total','sd_total',
             'mean_chat_len','total_chat_len','adoption_rate','n_decisions',
             'mean_interval_days']

compare("Strict: Improver vs Stable+Decliner (excl. Ceiling)",
        improver, non_strict, cont_cols)

compare("Loose: Improver vs Stable+Decliner+Ceiling",
        improver, non_loose, cont_cols)

# Fisher's exact for nationality (本國生 'T' / 外籍生 'F' or similar)
print("\nNationality cross-tab (Improver vs Stable+Decliner):")
ct = pd.crosstab(
    feat[feat['trajectory'].isin(['Improver','Stable','Decliner'])]['trajectory'],
    feat[feat['trajectory'].isin(['Improver','Stable','Decliner'])]['nationality'])
print(ct.to_string())
if ct.shape == (2, 2) or ct.shape == (3, 2):
    try:
        # collapse to 2x2: Improver vs not, by nationality
        binary = feat[feat['trajectory'].isin(['Improver','Stable','Decliner'])].copy()
        binary['is_improver'] = (binary['trajectory'] == 'Improver').astype(int)
        ct2 = pd.crosstab(binary['is_improver'], binary['nationality'])
        if ct2.shape == (2, 2):
            odds, p = stats.fisher_exact(ct2.values)
            print(f"Fisher's exact (2x2): odds_ratio={odds:.2f}, p={p:.4f}")
    except Exception as e:
        print(f"  (Fisher exact skipped: {e})")

# Save per-student feature table
out_csv = os.path.join(OUTDIR, '..', 'student_features.csv')
feat.to_csv(out_csv, index=False)
print(f"\nSaved per-student features: {out_csv}")
