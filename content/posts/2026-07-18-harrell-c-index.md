---
title: Harrell 一致性指数（C-index）
date: 2026-07-18
tags:
  - 生存分析
  - 统计学
  - 模型评价
---

## 一、什么是 C-index

**Harrell 一致性指数**（Harrell's Concordance Index，简称 **C-index**）由 Frank E. Harrell Jr. 于 1996 年提出，是生存分析中最常用来衡量风险预测模型**区分能力（discrimination）**的指标。

通俗讲，它回答一个问题：

> 在任意两个研究对象中，真实发生事件更早的那一个，模型给出的风险评分是否也更高？

C-index 数值含义与 AUC 类似：

- **0.5**：模型预测与随机猜测无差别
- **1.0**：模型完美区分
- **0.7 ~ 0.8**：模型较好
- **< 0.5**：比随机还差（通常说明评分方向反了）

临床上一般把 C-index $\geq 0.75$ 视为良好区分能力。

## 二、形式化定义

设有 $n$ 个样本，第 $i$ 个样本的观测为：

- $T_i$：观测到的生存时间（或随访时间）
- $\delta_i \in \{0, 1\}$：事件指示（1 = 发生事件，0 = 删失）
- $\hat{R}_i$：模型给出的风险评分（risk score）

### 可比较对

对样本对 $(i, j)$，若同时满足：

1. $T_i \neq T_j$
2. 至少有一个未删失：$\max(\delta_i, \delta_j) > 0$
3. 较早时间对应的样本未被删失（否则信息不完整）

则称该对为**可比较对（comparable pair）**或**usable pair**。记可比较对集合为 $\mathcal{P}$。

### 一致性定义

设符号函数

$$
\operatorname{sign}(x) =
\begin{cases}
+1, & x > 0 \\
0,   & x = 0 \\
-1, & x < 0
\end{cases}
$$

对一对样本 $(i, j)$（设 $T_i < T_j$），记模型判断一致的判别函数为

$$
h(i, j) = \mathbb{1}\bigl[\hat{R}_i > \hat{R}_j\bigr] + 0.5 \cdot \mathbb{1}\bigl[\hat{R}_i = \hat{R}_j\bigr].
$$

也就是说：

- $\hat{R}_i > \hat{R}_j$：模型预测更早发生事件者风险更高 → 得 1 分
- $\hat{R}_i = \hat{R}_j$：模型无法区分 → 得 0.5 分
- $\hat{R}_i < \hat{R}_j$：模型预测方向相反 → 得 0 分

则 Harrell's C-index：

$$
\hat{C} =
\frac{\displaystyle\sum_{(i, j) \in \mathcal{P}} h(i, j)}
     {\lvert \mathcal{P} \rvert}.
$$

它等价于"风险评分高的样本，存活时间更短"的概率：

$$
\hat{C}
\approx \Pr\bigl(\hat{R}_i > \hat{R}_j \;\big|\; T_i < T_j,\; \delta_i = 1\bigr).
$$

## 三、与 AUC 的关系

- 二分类问题中，AUC 即 ROC 曲线下面积；
- 当数据中**没有删失**时，C-index 退化为标准的 AUC；
- 有删失时，C-index 是把删失对剔掉后计算的"广义 AUC"。

## 四、删除原理：为什么要剔掉删失对

假设 $T_i < T_j$，但 $\delta_i = 0$（$i$ 被删失）：

- 我们只能知道 $i$ 的真实事件时间**大于** $T_i$；
- 不能确定 $i$ 与 $j$ 谁先发生事件 —— 可能 $T_i^{\text{true}} > T_j$，也可能 $< T_j$；
- 故无法判定模型预测方向是否正确，必须剔掉。

这正是 C-index 与普通 AUC 的核心差异，体现该方法对生存分析中**右删失**数据的处理。

## 五、Python 计算

### 方法 1：lifelines

```python
import numpy as np
from lifelines import CoxPHFitter
from lifelines.utils import concordance_index

# 假装有一份生存数据
# columns: time（随访时间）, event（是否发生事件）, x1, x2（特征）
import pandas as pd

rng = np.random.default_rng(0)
n = 300
df = pd.DataFrame({
    "x1": rng.normal(size=n),
    "x2": rng.normal(size=n),
    "time": np.ceil(rng.exponential(scale=10, size=n)),
    "event": rng.binomial(1, 0.6, size=n),
})

# 拟合 Cox 模型
cph = CoxPHFitter()
cph.fit(df, duration_col="time", event_col="event")
print(cph.print_summary())

# 计算 C-index
# 注意 lifelines 中 concordance_index 的"评分"方向：
# 评分越高 → 时间越短（风险越高），此处用 -partial_hazard
risk = cph.predict_partial_hazard(df)
c = concordance_index(df["time"], -risk, df["event"])
print(f"C-index = {c:.4f}")
```

> lifelines 的 `concordance_index(observed_times, predicted_scores, event)` 中：
> `predicted_scores` **越高代表时间越长**（即风险越低）。
> 所以如果你给的是"风险高的分数高"，要多加一个负号。

### 方法 2：sksurv

```python
from sksurv.ensemble import RandomSurvivalForest
from sksurv.metrics import concordance_index_censored
import numpy as np

X = np.column_stack([rng.normal(size=n) for _ in range(5)])
y = np.array(
    [("event" if e else "cens", t) for e, t in zip(event, time)],
    dtype=[("event", bool), ("time", float)],
)

rsf = RandomSurvivalForest(n_estimators=100).fit(X, y)
score = rsf.predict(X)                        # 风险分数
c = concordance_index_censored(y["event"], y["time"], score)
print(f"C-index = {c[0]:.4f}")
```

## 六、手写实现（便于理解）

```python
def harrell_c_index(time, event, score):
    """
    time  : 随访时间（越大越晚）
    event : 事件指示 0/1
    score : 模型风险评分，越高表示风险越大（则预期时间短）
    """
    n = len(time)
    concordant = 0.0
    permissible = 0

    for i in range(n):
        for j in range(i + 1, n):
            # 时间短的作为比较基准
            if time[i] < time[j] and event[i] == 1:
                permissible += 1
                if score[i] > score[j]:      concordant += 1
                elif score[i] == score[j]:   concordant += 0.5
            elif time[j] < time[i] and event[j] == 1:
                permissible += 1
                if score[j] > score[i]:      concordant += 1
                elif score[j] == score[i]:   concordant += 0.5
            # 时间相等或较短者删失：跳过

    return concordant / permissible if permissible else float("nan")

# 测试：与 lifelines 对照
import numpy as np
rng = np.random.default_rng(0)
n = 100
time  = rng.exponential(10, n)
event = rng.integers(0, 2, n)
score = -time + rng.normal(0, 1, n)   # 负相关，预期 C 接近 1
print(harrell_c_index(time, event, score))
```

## 七、注意事项

### 1. 评分方向

- Cox 模型输出的 $\beta^{\top} x$ 是**对风险（hazard）**进行打分，**数值越大风险越高、预期时间越短**。
- `lifelines.utils.concordance_index` 期望"分数越高时间越长"，所以常加负号；
- `sksurv.metrics.concordance_index_censored` 期望"分数越高风险越高"，方向一致即可。

### 2. 对删失重的数据有偏

当删失比例较高时，C-index 会出现：

- **可比较对偏少**：估计方差变大；
- **偏向早期可比较对**：高删失集中在后段时，C-index 主要反映模型在早期事件的区分能力，可能高估整体性能。

替代/补充指标：

- **Uno's C-statistic**：基于逆概率删失加权（IPCW）修正删失偏倚；
- **时间相关 AUC**（time-dependent AUC）：在 $t$ 时刻的判别能力；
- **Brier score / 时间依赖 ROC**：综合判别与校准。

### 3. 区分能力 ≠ 校准

C-index 只关心"谁的风险更高 / 谁先发生"，不关心"概率值是否准确"。一个模型可能 C-index 接近 1 但绝对风险预测严重偏高/偏低。

校准指标：

- Hosmer–Lemeshow 类校准
- Brier score
- Calibration plot（预测概率 vs 观测概率）

### 4. 不能直接比较不同随访长度的样本

切分训练/测试集时务必保证两集合关于时间跨度与删失特征的层面分布相近，否则 C-index 估计会失真。

### 5. 全局 vs 时间点 C-index

有时用 **time-dependent C-index**（按 $t$ 求截至时刻的判别能力），C-index 与时变 AUC 共用更稳妥。

## 八、R 中常用函数速查

```r
# survival 包
library(survival)
fit <- coxph(Surv(time, event) ~ x1 + x2, data = df)
summary(fit)$concordance     # 输出 c 及其方差估计

# rms 包（Harrell 原版）
library(rms)
f <- cph(Surv(time, event) ~ x1 + x2, data = df, x = TRUE, y = TRUE)
validate(f)                 # Dxy = 2(C - 0.5)
```

## 九、总结速记

| 关键点     | 说法                                                        |
| :--------- | :---------------------------------------------------------- |
| 是什么     | 风险预测模型对"谁先发生事件"判别能力的总体指标              |
| 范围       | 0 ~ 1，0.5 随机，1 完美，常用 0.75 表示良好                  |
| 与 AUC 关系 | 无删失时 == AUC；有删失时是 AUC 的删失修正版本              |
| 删失处理   | 较早时间被删失的对剔除；不予计入                            |
| 局限       | 不反映校准；高删失下有偏；需要配合校准指标综合评价          |
| Python     | `lifelines.utils.concordance_index`、`sksurv` 系列          |

## 参考

- Harrell FE, Calif RM, Pryor DB, Lee KL, Rosati RA. *Evaluating the yield of medical tests*. JAMA 1982; 247:2543–2546.
- Harrell FE. *Regression Modeling Strategies*, 2nd ed. Springer, 2015.
- Pencina MJ, D'Agostino RB. *Evaluating discrimination of risk prediction models*. JAMA 2009.
- lifelines 文档：<https://lifelines.readthedocs.io/>