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
