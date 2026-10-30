// ---------------------------------------------------------------
// 产品与销售配置：换产品、换卖点，只改这一个文件
// ---------------------------------------------------------------
export const SPEC = {
  // 出文件名（build.py 用）
  fileName: "双转子平台-销售演示",

  // 品牌与标题
  brand: "/powertrain",
  docTitle: "双转子平台 · 交互演示",
  productNo: "No. 01",
  productName: "13B",
  productSub: "双转子平台",
  headline: "13B 双转子平台：三角转子在 8 字形缸体里完成进气、压缩、点火与排气",

  // 发动机参数（用于物理与标注）
  engine: {
    R: 105,          // 生成半径 mm
    e: 15,           // 偏心距 mm
    idle: 875,       // 怠速 rpm
    redline: 6900,   // 全开 rpm
    torquePeak: 190, // 峰值扭矩 N·m
    torqueCenter: 4000,
    torqueK: 4.64e-6
  },

  // 引线标注文案：[主标题, 副标题]
  labels: {
    plug: ["火花塞", "点火 230 次/秒"],
    body: ["8 字缸体", "生成半径 105 mm"],
    rotor: ["三角转子", "0.654 L · 1.25 kg"],
    shaft: ["偏心轴", "Ø 35 mm · 1/3 转速"],
    seal: ["顶角密封片", "3 片 / 转子"],
    intake: ["进气口", "Ø 35 mm · 1.00 bar"],
    exhaust: ["排气口", "1,048 °C"]
  },

  // 演示脚本：五个镜头，按空格/方向键切换
  tour: [
    {
      title: "整体：先让他知道这是什么",
      line: "「先看整体，这是一台双转子，三个腔永远在同时做功。」",
      state: { cut: 0, explode: 0, xray: false, fault: false, slow: false, throttle: 0.3, rot: 0.6 },
      cam: { theta: 0.36, phi: 1.31, radius: 8.6 }
    },
    {
      title: "切开：客户平时看不到的那一层",
      line: "「切开的这一层，就是平时看不到的地方：三个腔在同时进气、压缩、做功。」",
      state: { cut: 1, explode: 0, xray: false, fault: false, slow: false, throttle: 0.42, rot: 1.15 },
      cam: { theta: 0.12, phi: 1.5, radius: 8.3 }
    },
    {
      title: "慢放 + 油门：数字是算出来的",
      line: "「按一下慢放，您能看清三个腔的相位；功率不是我写死的，是扭矩乘角速度算的。」",
      state: { cut: 1, explode: 0, xray: false, fault: false, slow: true, throttle: 1.0, rot: 1.15 },
      cam: { theta: 0.16, phi: 1.48, radius: 8.2 }
    },
    {
      title: "故障：最坏的情况我先演给你看",
      line: "「密封片磨到 70% 是这样：功率掉、机器抖；换一片就恢复。」",
      state: { cut: 1, explode: 0, xray: false, fault: true, slow: false, throttle: 0.62, rot: 2.1 },
      cam: { theta: 0.18, phi: 1.5, radius: 8.2 }
    },
    {
      title: "拆开：数给他看，只有三个运动件",
      line: "「没有凸轮轴、没有正时链，拆开就这些。」",
      state: { cut: 0, explode: 1, xray: false, fault: false, slow: false, throttle: 0.2, rot: 2.6 },
      cam: { theta: 0.62, phi: 1.3, radius: 10.6 }
    }
  ],

  // 五个角色：点一下跳到他的 30 秒
  roles: [
    { k: "使用 / 工艺", step: 1, line: "三个腔连续做功，输出没有断点。" },
    { k: "设备 / 维修", step: 4, line: "三个运动件，密封片可单换，不用下机。" },
    { k: "采购", step: 2, line: "同样工况，三年 TCO 我算给您看。" },
    { k: "财务", step: 2, line: "贵 8%，但每年省的停机费是这个数。" },
    { k: "老板", step: 3, line: "最坏的情况我们演示过了，也写进合同了。" }
  ],

  // 演示话术：每个状态一句，销售照着念
  talks: {
    cut: "切开的这一层，就是客户平时看不到的地方：三个腔永远在同时进气、压缩、做功。",
    explode: "整个平台只有三个运动件，拆开看，没有配气机构、没有凸轮轴、没有正时链条。",
    xray: "外壳半透明，客户能直接看到转子怎么被偏心轴带着走。",
    fault: "密封片磨到 70%，功率掉三成、机器开始抖，这就是我们敢把维保写进合同的原因。"
  }
};
