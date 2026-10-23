// 所有名称、组合和金额均为演示样例，不代表门店菜单或官方报价。
export const demoMeals=[
 ['chicken-crisp','香酥鸡腿堡','chicken',true,2900,'🍔',['不辣'],'脆薯（小）','冰红茶（中）'],
 ['beef-double','双层牛肉堡','beef',false,3400,'🍔',['不辣'],'脆薯（小）','可乐（中）'],
 ['fish','酥脆鳕鱼堡','fish',true,3200,'🐟',['不辣'],'玉米杯','柠檬茶（中）'],
 ['chicken-grill','嫩烤鸡腿堡','chicken',false,3300,'🍗',['不辣'],'玉米杯','无糖茶（中）'],
 ['chicken-spicy','热辣鸡腿堡','chicken',true,2800,'🌶️',[],'脆薯（小）','可乐（中）'],
 ['beef-classic','经典牛肉堡','beef',false,2500,'🍔',['不辣'],'玉米杯','可乐（中）'],
 ['chicken-light','轻享烤鸡堡','chicken',false,1900,'🥪',['不辣'],'玉米杯','无糖茶（小）'],
 ['beef-feast','丰盛牛肉堡','beef',false,4200,'🍔',['不辣'],'脆薯（大）','可乐（大）'],
].map(([id,name,meat,fried,price,icon,tags,side,drink])=>({id,name,meat,fried,price,icon,tags,items:[name,side,drink],quote:{at:Date.now(),store:'demo'}}));
