export function run(input) {

  const operations = [];

  // Bundle prices are stored in the shop currency (USD); the price set on a line
  // is read in the buyer's checkout currency, so convert using the market rate.
  const currencyRate = parseFloat(input.presentmentCurrencyRate) || 1;

  console.error("==========================================================");
  console.error("=== BUNDLE CART TRANSFORM FUNCTION RUNNING ===");
  console.error("==========================================================");

  for (const line of input.cart.lines) {

    const isBundle = line.bundle?.value === "true";

    if (!isBundle) continue;

    console.error("Processing bundle line:", line.id);

    // Parse bundle price — stored as "$1200.00"
    const bundlePriceStr = line.bundlePrice?.value ?? "0";
    const bundleTotalShop = parseFloat(bundlePriceStr.replace(/[^0-9.]/g, "")) || 0;
    const bundleTotal = bundleTotalShop * currencyRate;

    // Ensure full HTTPS URL (Liquid image_url returns protocol-relative "//...")
    const rawImageUrl = line.bundleImage?.value || line.bundleImageVisible?.value || "";
    const bundleImageUrl = rawImageUrl.startsWith("//") ? `https:${rawImageUrl}` : rawImageUrl;
    const bundleName = line.bundleName?.value;

    // Expand into component products when the theme sends "_bundle_items":
    // [{ "variantId": 123, "quantity": 1, "price": 129.00 }, ...] (regular unit price, shop currency)
    const items = parseBundleItems(line.bundleItems?.value);

    if (items.length) {
      const regularTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      // Spread the bundle price across the items in proportion to their regular prices
      const ratio = regularTotal > 0 ? bundleTotal / (regularTotal * currencyRate) : 0;

      const expandOp = {
        cartLineId: line.id,
        title: bundleName,
        expandedCartItems: items.map((item) => ({
          merchandiseId: `gid://shopify/ProductVariant/${item.variantId}`,
          quantity: item.quantity,
          price: {
            adjustment: {
              fixedPricePerUnit: {
                amount: (item.price * currencyRate * ratio).toFixed(2),
              },
            },
          },
        })),
      };

      if (bundleImageUrl) {
        expandOp.image = { url: bundleImageUrl };
      }

      operations.push({ lineExpand: expandOp });

      console.error(`=== EXPAND OK: "${bundleName}" → ${items.length} item(s), ${bundleTotal.toFixed(2)} ===`);
      continue;
    }

    const updateOp = {
      cartLineId: line.id,
      title: bundleName,
      price: {
        adjustment: {
          fixedPricePerUnit: {
            amount: bundleTotal.toFixed(2),
          },
        },
      },
    };

    if (bundleImageUrl) {
      updateOp.image = { url: bundleImageUrl };
    }

    operations.push({ lineUpdate: updateOp });

    console.error(`=== UPDATE OK: "${bundleName}" → $${bundleTotal.toFixed(2)} ===`);
  }

  console.error(`=== DONE: ${operations.length} operation(s) generated ===`);

  return { operations };
}

function parseBundleItems(value) {
  if (!value) return [];

  try {
    const items = JSON.parse(value);
    if (!Array.isArray(items)) return [];

    return items
      .map((item) => ({
        variantId: String(item.variantId ?? "").replace(/\D/g, ""),
        quantity: parseInt(item.quantity, 10) || 1,
        price: parseFloat(item.price) || 0,
      }))
      .filter((item) => item.variantId);
  } catch (error) {
    console.error("Invalid _bundle_items:", value);
    return [];
  }
}
