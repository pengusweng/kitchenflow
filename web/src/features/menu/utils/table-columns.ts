// Column classes shared by the menu table header, rows and skeleton rows.
// Item has no width of its own, so it takes the Brand column's share when a
// single brand is picked and that column drops out.
export const COL = {
  item: "",
  brand: "xl:w-[19%]",
  price: "xl:w-[12%]",
  channels: "xl:w-[17%]",
  availability: "xl:w-[19%]",
  view: "xl:w-[9%]",
};

export function columnCount(showBrand: boolean) {
  return Object.keys(COL).length - (showBrand ? 0 : 1);
}
