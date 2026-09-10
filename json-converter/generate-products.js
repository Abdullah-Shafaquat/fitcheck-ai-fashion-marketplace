/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const XLSX = require("xlsx");

const INPUT_FILE = "products.json";
const OUTPUT_FILE = "FitCheck_Products_10030.xlsx";

console.log("📦 Reading JSON file...");

const rawData = fs.readFileSync(INPUT_FILE, "utf8");
const products = JSON.parse(rawData);

console.log(`✅ Loaded ${products.length} products`);

function arrayToText(value) {
  if (!Array.isArray(value)) return value ?? "";
  return value.join(", ");
}

const rows = products.map((product, index) => ({
  "#": index + 1,
  ID: product.id ?? "",
  Name: product.name ?? "",
  Slug: product.slug ?? "",
  Description: product.description ?? "",
  Price: product.price ?? "",
  OldPrice: product.oldPrice ?? "",
  Category: product.category ?? "",
  SubCategory: product.subCategory ?? "",
  Gender: product.gender ?? "",
  Sizes: arrayToText(product.sizes),
  Colors: arrayToText(product.colors),
  Images: arrayToText(product.images),
  Stock: product.stock ?? "",
  SKU: product.sku ?? "",
  Rating: product.rating ?? "",
  Reviews: product.reviews ?? "",
  Badge: product.badge ?? "",
  Featured: product.featured ?? "",
  LatestArrival: product.latestArrival ?? "",
  IsActive: product.isActive ?? "",
  CreatedAt: product.createdAt ?? "",
  UpdatedAt: product.updatedAt ?? ""
}));

console.log("📊 Creating Excel workbook...");

const worksheet = XLSX.utils.json_to_sheet(rows);

// Set useful column widths
worksheet["!cols"] = [
  { wch: 6 },
  { wch: 28 },
  { wch: 30 },
  { wch: 30 },
  { wch: 60 },
  { wch: 12 },
  { wch: 12 },
  { wch: 18 },
  { wch: 18 },
  { wch: 12 },
  { wch: 25 },
  { wch: 35 },
  { wch: 60 },
  { wch: 10 },
  { wch: 18 },
  { wch: 10 },
  { wch: 10 },
  { wch: 15 },
  { wch: 12 },
  { wch: 15 },
  { wch: 12 },
  { wch: 25 },
  { wch: 25 }
];

const workbook = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  workbook,
  worksheet,
  "Products"
);

console.log("💾 Writing Excel file...");

XLSX.writeFile(workbook, OUTPUT_FILE);

console.log("");
console.log("====================================");
console.log("✅ CONVERSION COMPLETE");
console.log("====================================");
console.log(`📦 Products: ${products.length}`);
console.log(`📄 Excel: ${OUTPUT_FILE}`);
console.log("====================================");