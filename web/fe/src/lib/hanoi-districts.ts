export const HANOI_DISTRICTS = [
  "Ba Dinh",
  "Bac Tu Liem",
  "Cau Giay",
  "Dong Da",
  "Ha Dong",
  "Hai Ba Trung",
  "Hoan Kiem",
  "Hoang Mai",
  "Long Bien",
  "Nam Tu Liem",
  "Tay Ho",
  "Thanh Xuan"
] as const;

export type HanoiDistrict = (typeof HANOI_DISTRICTS)[number];
