<?php
/**
 * PHP HMAC Signer test runner.
 * Run from the plugin root: php tests/run-tests.php
 *
 * Uses the same test vectors as the Node.js integration tests.
 * If all tests pass, both implementations produce identical canonical strings.
 */

// Must be defined before the include: the class file exits silently without it.
if (!defined('ABSPATH')) define('ABSPATH', '/');

require_once dirname(__DIR__) . '/includes/class-hmac-signer.php';

$vectorsFile = dirname(__DIR__) . '/test-vectors.json';
$data = json_decode(file_get_contents($vectorsFile), true);

if (!$data || empty($data['vectors'])) {
    echo "FAIL: Could not load test vectors\n";
    exit(1);
}

$pass = 0;
$fail = 0;
$testSecret = $data['testSecret'];

foreach ($data['vectors'] as $vector) {
    $in = $vector['input'];

    // Reconstruct items as PHP arrays with wooVariantId null/string
    $items = array_map(function ($item) {
        return [
            'wooProductId' => $item['wooProductId'],
            'wooVariantId' => $item['wooVariantId'],
            'qty'          => $item['qty'],
        ];
    }, $in['items']);

    $signer = new VTC_HmacSigner($testSecret, $in['externalSource']);
    $canonical = $signer->buildCanonicalPublic(
        $in['method'],
        $in['path'],
        $in['nonce'],
        (int)$in['timestamp'],
        $items,
        $in['address']
    );

    $expected = $vector['expectedCanonical'];
    // Test vectors store \n as literal characters in JSON — PHP json_decode converts them to actual newlines ✓

    if ($canonical === $expected) {
        echo "PASS [{$vector['id']}]: {$vector['description']}\n";
        $pass++;
    } else {
        echo "FAIL [{$vector['id']}]: {$vector['description']}\n";
        echo "  Expected: " . json_encode($expected) . "\n";
        echo "  Got:      " . json_encode($canonical) . "\n";
        $fail++;
    }

    // Signature must equal the value Node.js produced for the same vector
    $sig = $signer->sign($in['method'], $in['path'], $in['nonce'], (int)$in['timestamp'], $items, $in['address']);
    if (hash_equals($vector['expectedSignature'], $sig)) {
        echo "PASS [{$vector['id']}-signature]: PHP HMAC matches Node HMAC\n";
        $pass++;
    } else {
        echo "FAIL [{$vector['id']}-signature]: PHP HMAC differs from Node HMAC\n";
        $fail++;
    }
}

// HMAC round-trip test
echo "\n--- HMAC round-trip test ---\n";
$secret    = 'round-trip-secret-xyz';
$items     = [['wooProductId' => '42', 'wooVariantId' => null, 'qty' => 1]];
$address   = ['city' => 'Chennai', 'country' => 'IN', 'fullName' => 'Alice', 'addressLine1' => '1 Test St', 'phone' => '0000000000', 'state' => 'TN', 'zipCode' => '600001'];
$nonce     = 'roundtrip12345a';
$timestamp = 1700005000;
$signer    = new VTC_HmacSigner($secret, 'woo_vegetablecuttingmachine');
$sig1      = $signer->sign('POST', '/api/woo/handoff', $nonce, $timestamp, $items, $address);
$sig2      = $signer->sign('POST', '/api/woo/handoff', $nonce, $timestamp, $items, $address);
if ($sig1 === $sig2 && strlen($sig1) === 64 && ctype_xdigit($sig1)) {
    echo "PASS [hmac-deterministic]: Same inputs → same HMAC output\n";
    $pass++;
} else {
    echo "FAIL [hmac-deterministic]: Signatures differ or malformed\n";
    $fail++;
}

// --- Cart payload (WooCommerce cart lines → handoff items) ---
echo "\n--- Cart payload tests ---\n";
require_once dirname(__DIR__) . '/includes/class-cart-payload.php';

function vtc_check(string $id, bool $ok, int &$pass, int &$fail): void {
    echo ($ok ? 'PASS' : 'FAIL') . " [$id]\n";
    $ok ? $pass++ : $fail++;
}

$items = VTC_CartPayload::fromCartLines([
    ['product_id' => 300, 'variation_id' => 12, 'quantity' => 1],
    ['product_id' => 100, 'variation_id' => 0,  'quantity' => 2],
    ['product_id' => 300, 'variation_id' => 12, 'quantity' => 3], // same line added twice
    ['product_id' => 300, 'variation_id' => 13, 'quantity' => 1],
]);
vtc_check('payload-merges-duplicate-lines', $items === [
    ['wooProductId' => '300', 'wooVariantId' => '12', 'qty' => 4],
    ['wooProductId' => '100', 'wooVariantId' => null, 'qty' => 2],
    ['wooProductId' => '300', 'wooVariantId' => '13', 'qty' => 1],
], $pass, $fail);

vtc_check('payload-simple-product-has-null-variant',
    VTC_CartPayload::fromCartLines([['product_id' => 5, 'variation_id' => 0, 'quantity' => 1]])[0]['wooVariantId'] === null,
    $pass, $fail);

vtc_check('payload-address-strings-trimmed',
    VTC_CartPayload::address(['city' => '  Coimbatore ', 'addressLine2' => null, 'zipCode' => 641006])
        === ['city' => 'Coimbatore', 'addressLine2' => '', 'zipCode' => '641006'],
    $pass, $fail);

// A real cart line run through the payload builder must sign exactly like Node vector v1
$v1 = $data['vectors'][0];
$fromCart = VTC_CartPayload::fromCartLines([['product_id' => 101, 'variation_id' => 0, 'quantity' => 2]]);
$sig = (new VTC_HmacSigner($testSecret, $v1['input']['externalSource']))
    ->sign('POST', '/api/woo/handoff', $v1['input']['nonce'], (int)$v1['input']['timestamp'], $fromCart, $v1['input']['address']);
vtc_check('payload-from-cart-matches-node-signature', hash_equals($v1['expectedSignature'], $sig), $pass, $fail);

$described = VTC_CartPayload::describeErrors(
    [
        ['wooProductId' => '42', 'wooVariantId' => '7', 'code' => 'MAPPING_INACTIVE', 'message' => 'No longer available.'],
        ['wooProductId' => '99', 'wooVariantId' => null, 'code' => 'MAPPING_NOT_FOUND', 'message' => 'Not available.'],
    ],
    fn($p, $v) => $p === '42' && $v === '7' ? 'Kurta - Red' : null
);
vtc_check('errors-use-store-product-names', $described === [
    ['name' => 'Kurta - Red', 'message' => 'No longer available.'],
    ['name' => 'Product #99', 'message' => 'Not available.'],
], $pass, $fail);

echo "\n$pass passed, $fail failed\n";
exit($fail > 0 ? 1 : 0);
