// 官方公开套餐数据的演示快照；金额并非当前门店实时报价。
const examples=[
  {
    "id": "demo:9900005456",
    "name": "麦辣鸡腿汉堡三件套",
    "price": 3350,
    "meat": "chicken",
    "fried": true,
    "tags": [
      "单品",
      "人气经典",
      "外酥里嫩",
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/20260824/product/MS_9900005456_600.png",
    "mainCode": "1440",
    "items": [
      "麦辣鸡腿汉堡【可特调】 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900005462",
    "name": "板烧鸡腿堡三件套",
    "price": 3450,
    "meat": "chicken",
    "fried": false,
    "tags": [
      "单品",
      "板烧滋滋",
      "多汁惹味",
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/20260824/product/MS_9900005462_600.png",
    "mainCode": "1406",
    "items": [
      "板烧鸡腿堡【可特调】 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900005464",
    "name": "双层吉士汉堡中套餐",
    "price": 3400,
    "meat": "beef",
    "fried": null,
    "tags": [
      "单品",
      "100%纯牛肉",
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/20260824/product/MS_9900005464_600.png",
    "mainCode": "1120",
    "items": [
      "双层吉士汉堡【可特调】 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900005466",
    "name": "巨无霸三件套",
    "price": 3650,
    "meat": "beef",
    "fried": null,
    "tags": [
      "单品",
      "100%纯牛肉",
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/20260824/product/MS_9900005466_600.png",
    "mainCode": "1100",
    "items": [
      "巨无霸【可特调】 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900005449",
    "name": "吉士汉堡包中套餐",
    "price": 2600,
    "meat": "beef",
    "fried": null,
    "tags": [
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/20260824/product/MS_9900005449_600.png",
    "mainCode": "1010",
    "items": [
      "吉士汉堡包【可特调】 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900005453",
    "name": "麦香鸡中套餐",
    "price": 2800,
    "meat": "chicken",
    "fried": true,
    "tags": [
      "单品",
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/20260824/product/MS_9900005453_600.png",
    "mainCode": "1450",
    "items": [
      "麦香鸡【可特调】 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900016075",
    "name": "龙焰芝士棒鸡腿堡三件套",
    "price": 2990,
    "meat": "chicken",
    "fried": null,
    "tags": [
      "上新",
      "浓郁奶香拉丝芝士",
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/ProductPool/product/MS_9900016075_600.png",
    "mainCode": "521953",
    "items": [
      "龙焰芝士棒鸡腿堡【可特调】 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900016073",
    "name": "龙焰鸡腿堡三件套",
    "price": 2690,
    "meat": "chicken",
    "fried": null,
    "tags": [
      "韩式辣椒黄油风味",
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/ProductPool/product/MS_9900016073_600.png",
    "mainCode": "521952",
    "items": [
      "龙焰鸡腿堡【可特调】 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900004835",
    "name": "麦乐鸡经典中套餐",
    "price": 2500,
    "meat": "chicken",
    "fried": null,
    "tags": [
      "单品",
      "人气",
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/20260824/product/MS_9900004835_600.png",
    "mainCode": "1401",
    "items": [
      "麦乐鸡5块 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900011128",
    "name": "“堡”你欢乐套餐",
    "price": 2800,
    "meat": null,
    "fried": null,
    "tags": [
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/ProductPool/product/MS_9900011128_600.png",
    "mainCode": "1000",
    "items": [
      "汉堡包【可特调】 × 1",
      "麦乐鸡4块 × 1",
      "苹果片一袋(60g) × 1",
      "无糖可口可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900011123",
    "name": "“辣”么快乐套餐",
    "price": 2400,
    "meat": "chicken",
    "fried": true,
    "tags": [
      "单品",
      "黄金酥脆",
      "鲜嫩多汁"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/ProductPool/product/MS_9900011123_600.png",
    "mainCode": "1700",
    "items": [
      "麦辣鸡翅2块 × 1",
      "麦乐鸡4块 × 1",
      "无糖可口可乐中杯【可特调】 × 1"
    ]
  },
  {
    "id": "demo:9900005451",
    "name": "麦辣鸡翅4块中套餐",
    "price": 3650,
    "meat": "chicken",
    "fried": true,
    "tags": [
      "小食"
    ],
    "image": "https://menu-img.mcd.cn/pcm/prod/menu/20260824/product/MS_9900005451_600.png",
    "mainCode": "1705",
    "items": [
      "麦辣鸡翅4块 × 1",
      "中薯条 × 1",
      "可乐中杯【可特调】 × 1"
    ]
  }
];
export const demoMeals=examples.map(m=>({...m,quote:{at:Date.now(),store:"demo"}}));
