<?php
/**
 * VTC_HmacSigner — builds the canonical HMAC payload and signs it.
 *
 * The canonical string must be byte-identical to the Node.js implementation
 * in shop/apps/api/src/utils/wooHmac.js.
 *
 * Format (each field on its own line, joined with \n):
 *   METHOD
 *   PATH
 *   EXTERNAL_SOURCE
 *   NONCE
 *   TIMESTAMP
 *   ITEMS_JSON
 *   ADDRESS_JSON
 *
 * Items sorted: wooProductId ASC (string), then wooVariantId ASC (null → "").
 * Item keys in fixed order: qty, wooProductId, wooVariantId.
 * Address keys sorted alphabetically.
 * Both JSON blocks compact (no spaces), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES.
 */

defined('ABSPATH') || exit;

class VTC_HmacSigner {
    private string $secret;
    private string $externalSource;

    public function __construct(string $secret, string $externalSource) {
        $this->secret         = $secret;
        $this->externalSource = $externalSource;
    }

    /**
     * Builds the canonical string and returns the HMAC-SHA256 signature (hex).
     * NEVER log the return value or $this->secret.
     */
    public function sign(
        string $method,
        string $path,
        string $nonce,
        int    $timestamp,
        array  $items,
        array  $address
    ): string {
        $canonical = $this->buildCanonical($method, $path, $nonce, $timestamp, $items, $address);
        return hash_hmac('sha256', $canonical, $this->secret);
    }

    /**
     * Public for test-only access; not intended for production callers.
     */
    public function buildCanonicalPublic(
        string $method,
        string $path,
        string $nonce,
        int    $timestamp,
        array  $items,
        array  $address
    ): string {
        return $this->buildCanonical($method, $path, $nonce, $timestamp, $items, $address);
    }

    private function buildCanonical(
        string $method,
        string $path,
        string $nonce,
        int    $timestamp,
        array  $items,
        array  $address
    ): string {
        // Sort items: by wooProductId ASC, then wooVariantId ASC (null → "")
        usort($items, function (array $a, array $b): int {
            $pa  = (string)$a['wooProductId'];
            $pb  = (string)$b['wooProductId'];
            $cmp = strcmp($pa, $pb);
            if ($cmp !== 0) return $cmp;
            $va = $a['wooVariantId'] === null ? '' : (string)$a['wooVariantId'];
            $vb = $b['wooVariantId'] === null ? '' : (string)$b['wooVariantId'];
            return strcmp($va, $vb);
        });

        // Normalize items: fixed key order qty → wooProductId → wooVariantId
        $normalizedItems = array_map(function (array $item): array {
            return [
                'qty'          => (int)$item['qty'],
                'wooProductId' => (string)$item['wooProductId'],
                'wooVariantId' => $item['wooVariantId'] === null ? null : (string)$item['wooVariantId'],
            ];
        }, $items);

        // SORT_STRING matches JS Array.prototype.sort() on ASCII keys
        ksort($address, SORT_STRING);

        // LINE_TERMINATORS: JSON.stringify leaves U+2028/U+2029 unescaped
        $jsonFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS;

        return implode("\n", [
            strtoupper($method),
            $path,
            $this->externalSource,
            $nonce,
            (string)$timestamp,
            json_encode(array_values($normalizedItems), $jsonFlags),
            // (object) so an empty address encodes as {} like Node, not []
            json_encode((object)$address, $jsonFlags),
        ]);
    }
}
