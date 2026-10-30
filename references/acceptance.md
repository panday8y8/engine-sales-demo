# 验收清单（8 条）

演示拿去见客户之前，逐条过。任何一条不通过，都不要发出去。

## 结构

- [ ] **1. 顶角贴壁**：取 6 个不同转子角度截图，三个顶角始终贴着缸壁，没有悬空、没有穿模
- [ ] **2. 三腔分色**：三个工作腔颜色不同，并且随转子转动在「进气 / 压缩 / 做功 / 排气」之间切换
- [ ] **3. 切开有效**：前盖和前隔板真的让开，能看到转子和 8 字腔，没有残留挡片

## 数字

- [ ] **4. 功率对得上**：油门 0 / 50 / 100 三档，转速和功率与参数表的误差 < 2%（P = T·2πn/60）
- [ ] **5. 单位正确**：kW、N·m、rpm、bar、°C、mm，小数点位数全篇一致

## 状态

- [ ] **6. 故障可恢复**：故障后功率下降、密封片变色、有轻微抖动；再点一次完全恢复
- [ ] **7. 拆开不散架**：拆开后零件仍穿在主轴上，没有飘在空中

## 观感

- [ ] **8. 1600×900 无瑕疵**：没有元素重叠、文字溢出、被裁切；中文无错别字

## 怎么截图

用 Playwright，固定视口，逐个状态截：

```python
from playwright.sync_api import sync_playwright

STATES = [
    ("01-hero",   {}),
    ("02-cut",    {"cut": 1, "throttle": 0.42}),
    ("03-explode",{"explode": 1}),
    ("04-xray",   {"xray": True}),
    ("05-fault",  {"fault": True, "throttle": 0.62}),
]

with sync_playwright() as p:
    b = p.chromium.launch(headless=False)
    page = b.new_context(viewport={"width": 1600, "height": 900}).new_page()
    page.goto("file:///绝对路径/你的演示.html")
    page.wait_for_function("window.__ready === true")
    for name, st in STATES:
        page.evaluate("s => window.__demo.set(s)", st)
        page.wait_for_timeout(1500)
        page.screenshot(path=f"shots/{name}.png")
    b.close()
```

> 模板内置了 `window.__demo.set({cut, explode, xray, fault, throttle, phi, cam})`，可以直接驱动到任意状态。

## 见客户前的三次彩排

1. **自己跑一遍**：从打开到讲完，掐表 3 分钟。
2. **给同事跑一遍**：让他自己点，你观察他在哪里卡住。
3. **用客户的分辨率跑一遍**：投影仪常见 1280×720，笔记本常见 1920×1080。别在 4K 屏上调好就去投影。
