// Column classes shared by the recipes table header, rows and skeleton rows.
// Recipe has no width of its own, so it takes the Brand column's share when a
// single brand is picked and that column drops out.
export const COL = {
  recipe: "",
  brand: "xl:w-[20%]",
  version: "xl:w-[9%]",
  updated: "xl:w-[16%]",
  status: "xl:w-[13%]",
  view: "xl:w-[9%]",
};

export function columnCount(showBrand: boolean) {
  return Object.keys(COL).length - (showBrand ? 0 : 1);
}
