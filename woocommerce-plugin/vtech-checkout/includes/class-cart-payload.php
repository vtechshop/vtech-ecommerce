<?php
/**
 * VTC_CartPayload — turns WooCommerce cart lines and customer fields into the handoff
 * payload. Pure PHP (no WordPress calls) so it can be tested with tests/run-tests.php.
 */

defined('ABSPATH') || exit;

class VTC_CartPayload {
    /**
     * @param array $lines [['product_id' => int, 'variation_id' => int, 'quantity' => int], ...]
     *                     — every line of the WooCommerce cart.
     * @return array Handoff items; duplicate product/variation lines are merged.
     *               Only IDs and quantities are sent: VTech never trusts store prices.
     */
    public static function fromCartLines(array $lines): array {
        $items = [];
        foreach ($lines as $line) {
            $productId   = (string)(int)($line['product_id'] ?? 0);
            $variationId = (int)($line['variation_id'] ?? 0);
            $variantKey  = $variationId > 0 ? (string)$variationId : null;
            $key         = $productId . '|' . ($variantKey ?? '');

            if (isset($items[$key])) {
                $items[$key]['qty'] += (int)($line['quantity'] ?? 0);
            } else {
                $items[$key] = [
                    'wooProductId' => $productId,
                    'wooVariantId' => $variantKey,
                    'qty'          => (int)($line['quantity'] ?? 0),
                ];
            }
        }
        return array_values($items);
    }

    /**
     * Normalizes address fields to trimmed strings so PHP and Node sign identical bytes.
     */
    public static function address(array $fields): array {
        $out = [];
        foreach ($fields as $key => $value) {
            $out[(string)$key] = trim((string)($value ?? ''));
        }
        return $out;
    }

    /**
     * Pairs VTech's per-item errors with the store's own product names.
     *
     * @param array    $vtechItems [['wooProductId','wooVariantId','code','message'], ...]
     * @param callable $nameFor    fn(string $productId, ?string $variationId): ?string
     * @return array [['name' => string, 'message' => string], ...]
     */
    public static function describeErrors(array $vtechItems, callable $nameFor): array {
        $out = [];
        foreach ($vtechItems as $item) {
            $productId = isset($item['wooProductId']) ? (string)$item['wooProductId'] : '';
            $variantId = isset($item['wooVariantId']) && $item['wooVariantId'] !== null ? (string)$item['wooVariantId'] : null;
            $name      = $productId !== '' ? $nameFor($productId, $variantId) : null;
            $out[] = [
                'name'    => $name ?: ($productId !== '' ? 'Product #' . $productId : 'Cart'),
                'message' => (string)($item['message'] ?? 'This product cannot be checked out on VTech Kitchen.'),
            ];
        }
        return $out;
    }
}
