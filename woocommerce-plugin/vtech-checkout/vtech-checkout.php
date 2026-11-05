<?php
/**
 * Plugin Name: VTech Central Checkout
 * Plugin URI: https://www.vtechkitchen.com/
 * Description: Sends the whole WooCommerce cart to VTech Kitchen central checkout via an HMAC-signed handoff.
 * Version: 1.1.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * WC requires at least: 7.0
 * Author: VTech Kitchen
 * License: Proprietary
 */

defined('ABSPATH') || exit;

define('VTC_VERSION', '1.1.0');
define('VTC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('VTC_PLUGIN_URL', plugin_dir_url(__FILE__));
// Overridable in wp-config.php for a staging VTech environment
if (!defined('VTC_VTECH_BASE_URL')) define('VTC_VTECH_BASE_URL', 'https://www.vtechkitchen.com');
// The signed path is fixed: VTech verifies against its own mounted route
define('VTC_HANDOFF_PATH', '/api/woo/handoff');
define('VTC_LANDING_PATH', '/api/woo/landing');
define('VTC_TOKEN_REQUEST_TIMEOUT', 10); // seconds
define('VTC_LOCK_SECONDS', 15);         // blocks a second handoff while the first is redirecting

require_once VTC_PLUGIN_DIR . 'includes/class-hmac-signer.php';
require_once VTC_PLUGIN_DIR . 'includes/class-cart-payload.php';

/**
 * Secrets live in wp-config.php, never in this plugin:
 *   define('VTECH_WOO_HMAC_SECRET', '<same value as WOO_SECRET_VEGETABLE or WOO_SECRET_STYLE>');
 *   define('VTECH_EXTERNAL_SOURCE', 'woo_vegetablecuttingmachine'); // or woo_styleyourlyf
 */
function vtc_get_config(): array {
    if (!defined('VTECH_WOO_HMAC_SECRET') || !defined('VTECH_EXTERNAL_SOURCE')) {
        return [];
    }
    return [
        'secret'         => VTECH_WOO_HMAC_SECRET,
        'externalSource' => VTECH_EXTERNAL_SOURCE,
    ];
}

function vtc_is_ready(): bool {
    return !empty(vtc_get_config()) && function_exists('WC') && WC()->cart && !WC()->cart->is_empty();
}

function vtc_button(string $extraClass = ''): string {
    return '<div class="vtc-proceed-wrap">'
        . '<button type="button" class="button alt vtc-proceed ' . esc_attr($extraClass) . '">'
        . esc_html__('Proceed to VTech Checkout', 'vtech-checkout')
        . '</button>'
        . '<div class="vtc-error woocommerce-error" role="alert" hidden></div>'
        . '</div>';
}

// Cart page — above the native checkout button
add_action('woocommerce_proceed_to_checkout', function () {
    if (vtc_is_ready()) echo vtc_button('checkout-button wc-forward'); // phpcs:ignore WordPress.Security.EscapeOutput
}, 5);

// Cart block: drawn in the browser, so woocommerce_proceed_to_checkout never runs there.
// Add the same button after the block, outside the element its script re-renders.
add_filter('render_block_woocommerce/cart', function ($html) {
    return vtc_is_ready() ? $html . vtc_button('wp-element-button') : $html; // phpcs:ignore WordPress.Security.EscapeOutput
});

function vtc_checkout_notice(string $buttonClass = ''): string {
    return '<div class="woocommerce-info vtc-checkout-notice">'
        . esc_html__('Complete your purchase securely on VTech Kitchen. Your whole cart will be transferred.', 'vtech-checkout')
        . '</div>'
        . vtc_button($buttonClass);
}

// Checkout page entry point
add_action('woocommerce_before_checkout_form', function () {
    if (vtc_is_ready()) echo vtc_checkout_notice(); // phpcs:ignore WordPress.Security.EscapeOutput
}, 5);

// Checkout block: drawn in the browser, so woocommerce_before_checkout_form never runs there
add_filter('render_block_woocommerce/checkout', function ($html) {
    return vtc_is_ready() ? vtc_checkout_notice('wp-element-button') . $html : $html; // phpcs:ignore WordPress.Security.EscapeOutput
});

// Mini-cart widget
add_action('woocommerce_widget_shopping_cart_buttons', function () {
    if (vtc_is_ready()) echo vtc_button(); // phpcs:ignore WordPress.Security.EscapeOutput
}, 30);

// Mini-Cart block drawer: WooCommerce renders it on the server from the mini-cart template part,
// so the button goes right after its "Go to checkout" block. Not tied to the current cart: the
// filled-cart section is already hidden while the cart is empty, and items can be added later
// without a page reload.
add_filter('render_block_woocommerce/mini-cart-checkout-button-block', function ($html) {
    if (empty(vtc_get_config())) return $html;
    return $html . '<div class="vtc-mini-cart-action">' . vtc_button('wp-element-button wc-block-components-button') . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput
});

add_action('wp_enqueue_scripts', function () {
    if (empty(vtc_get_config()) || is_admin()) return;

    wp_enqueue_script('vtc-checkout', VTC_PLUGIN_URL . 'assets/vtc-checkout.js', ['jquery'], VTC_VERSION, true);
    // The Mini-Cart drawer lays its buttons out in a row; give ours its own full-width line
    wp_register_style('vtc-checkout', false, [], VTC_VERSION);
    wp_enqueue_style('vtc-checkout');
    wp_add_inline_style('vtc-checkout', '.vtc-mini-cart-action{flex-basis:100%;width:100%}.vtc-mini-cart-action .vtc-proceed{width:100%}');
    wp_localize_script('vtc-checkout', 'vtcCheckout', [
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('vtc-handoff'),
        'i18n'    => [
            'label'       => __('Proceed to VTech Checkout', 'vtech-checkout'),
            'redirecting' => __('Taking you to checkout…', 'vtech-checkout'),
            'failed'      => __('We could not start checkout. Please try again.', 'vtech-checkout'),
        ],
    ]);
});

add_action('wp_ajax_vtc_handoff', 'vtc_handle_handoff');
add_action('wp_ajax_nopriv_vtc_handoff', 'vtc_handle_handoff');

/**
 * Sends the entire cart to VTech and returns { action, token } for the browser to POST.
 * The WooCommerce cart is never modified, so it is intact if anything fails.
 */
function vtc_handle_handoff(): void {
    if (!check_ajax_referer('vtc-handoff', 'nonce', false)) {
        vtc_fail('SESSION_EXPIRED', __('Your session expired. Refresh the page and try again.', 'vtech-checkout'), 403);
    }

    $config = vtc_get_config();
    if (empty($config)) {
        vtc_fail('NOT_CONFIGURED', __('VTech checkout is not available right now.', 'vtech-checkout'), 503);
    }

    $cart = function_exists('WC') ? WC()->cart : null;
    if (!$cart || $cart->is_empty()) {
        vtc_fail('EMPTY_CART', __('Your cart is empty.', 'vtech-checkout'), 400);
    }

    $session = WC()->session;
    $lockedAt = $session ? (int)$session->get('vtc_handoff_lock') : 0;
    if ($lockedAt && time() - $lockedAt < VTC_LOCK_SECONDS) {
        vtc_fail('DUPLICATE_SUBMISSION', __('Checkout is already starting. Please wait a moment.', 'vtech-checkout'), 429);
    }
    if ($session) $session->set('vtc_handoff_lock', time());

    $lines = [];
    foreach ($cart->get_cart() as $cartItem) {
        $lines[] = [
            'product_id'   => (int)$cartItem['product_id'],
            'variation_id' => (int)($cartItem['variation_id'] ?? 0),
            'quantity'     => (int)$cartItem['quantity'],
        ];
    }
    $items   = VTC_CartPayload::fromCartLines($lines);
    $address = vtc_get_customer_address();

    $signer    = new VTC_HmacSigner($config['secret'], $config['externalSource']);
    $timestamp = time();
    $nonce     = bin2hex(random_bytes(16));
    $signature = $signer->sign('POST', VTC_HANDOFF_PATH, $nonce, $timestamp, $items, $address);

    $response = wp_remote_post(VTC_VTECH_BASE_URL . VTC_HANDOFF_PATH, [
        'timeout' => VTC_TOKEN_REQUEST_TIMEOUT,
        'headers' => [
            'Content-Type'    => 'application/json',
            'X-Woo-Signature' => 'sha256=' . $signature,
        ],
        'body' => wp_json_encode([
            'externalSource' => $config['externalSource'],
            'nonce'          => $nonce,
            'timestamp'      => $timestamp,
            'items'          => $items,
            'address'        => $address,
        ]),
    ]);

    if (is_wp_error($response)) {
        vtc_release_lock();
        vtc_fail('VTECH_UNREACHABLE', __('VTech Kitchen could not be reached. Please try again.', 'vtech-checkout'), 502);
    }

    $status = (int)wp_remote_retrieve_response_code($response);
    $body   = json_decode(wp_remote_retrieve_body($response), true);

    if ($status === 422 && ($body['error']['code'] ?? '') === 'CART_NOT_TRANSFERABLE') {
        vtc_release_lock();
        $details = VTC_CartPayload::describeErrors($body['error']['items'] ?? [], 'vtc_product_name');
        wp_send_json_error([
            'code'    => 'CART_NOT_TRANSFERABLE',
            'message' => __('These products cannot be checked out on VTech Kitchen. Remove them from your cart, or contact us for help:', 'vtech-checkout'),
            'items'   => $details,
        ], 422);
    }

    if ($status !== 201 || empty($body['token']) || !is_string($body['token'])) {
        vtc_release_lock();
        vtc_fail('TOKEN_REQUEST_FAILED', __('We could not start checkout. Please try again.', 'vtech-checkout'), 502);
    }

    // The lock stays set while the browser redirects. Token is never logged or stored.
    wp_send_json_success([
        'action' => VTC_VTECH_BASE_URL . VTC_LANDING_PATH,
        'token'  => $body['token'],
    ]);
}

function vtc_fail(string $code, string $message, int $status): void {
    wp_send_json_error(['code' => $code, 'message' => $message], $status);
}

function vtc_release_lock(): void {
    if (WC()->session) WC()->session->set('vtc_handoff_lock', 0);
}

function vtc_product_name(string $productId, ?string $variationId): ?string {
    $product = wc_get_product((int)($variationId ?: $productId));
    return $product ? wp_strip_all_tags($product->get_name()) : null;
}

/**
 * Customer details for VTech checkout pre-fill. Shipping address when set, else billing.
 * No WooCommerce login, password or session data is ever sent.
 */
function vtc_get_customer_address(): array {
    $customer = WC()->customer;
    if (!$customer) return [];

    $prefix = $customer->get_shipping_address_1() !== '' ? 'shipping' : 'billing';
    $get = function (string $field) use ($customer, $prefix) {
        $method = "get_{$prefix}_{$field}";
        return (string)$customer->$method();
    };

    $country = $get('country') ?: 'IN';
    $stateCode = $get('state');
    $states = WC()->countries ? WC()->countries->get_states($country) : [];
    $state = is_array($states) && isset($states[$stateCode])
        ? html_entity_decode($states[$stateCode], ENT_QUOTES, 'UTF-8')
        : $stateCode;

    return VTC_CartPayload::address([
        'fullName'     => trim($get('first_name') . ' ' . $get('last_name')),
        'email'        => $customer->get_billing_email(),
        'phone'        => $customer->get_billing_phone(),
        'addressLine1' => $get('address_1'),
        'addressLine2' => $get('address_2'),
        'city'         => $get('city'),
        'state'        => $state,
        'zipCode'      => $get('postcode'),
        'country'      => $country,
    ]);
}
