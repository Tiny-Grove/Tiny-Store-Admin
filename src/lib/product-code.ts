import { randomUUID } from "crypto";

// products.product_code is required and unique per customer at the DB
// level (SKU-style), but the admin product form doesn't ask for one —
// generate a stand-in so inserts don't fail.
export function generateProductCode() {
  return randomUUID().slice(0, 8).toUpperCase();
}
