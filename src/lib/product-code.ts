import { randomUUID } from "crypto";

// products.product_code is required and unique per customer at the DB
// level (SKU-style), but neither the admin nor the portal product forms
// ask for one — generate a stand-in so inserts don't fail.
export function generateProductCode() {
  return randomUUID().slice(0, 8).toUpperCase();
}
