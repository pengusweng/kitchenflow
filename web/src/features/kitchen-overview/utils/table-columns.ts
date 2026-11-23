// Column classes shared by the tickets table header, rows and skeleton rows.
// Ticket has no width of its own and takes what's left.
export const COL = {
  ticket: "",
  brand: "xl:w-[18%]",
  stage: "xl:w-[15%]",
  sinceSent: "xl:w-[26%]",
  created: "xl:w-[13%]",
  view: "xl:w-[9%]",
};

export const COLUMN_COUNT = Object.keys(COL).length;
