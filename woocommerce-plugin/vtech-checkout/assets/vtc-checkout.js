/* global jQuery, vtcCheckout */
(function ($, cfg) {
  'use strict';

  var busy = false;

  function setButtons(disabled, label) {
    $('.vtc-proceed').prop('disabled', disabled).each(function () {
      $(this).text(label || cfg.i18n.label);
    });
  }

  function showError($btn, data) {
    var $box = $btn.siblings('.vtc-error');
    $box.empty();
    // text() only — never inject server strings as HTML
    $('<p>').text((data && data.message) || cfg.i18n.failed).appendTo($box);
    if (data && data.items && data.items.length) {
      var $list = $('<ul>');
      data.items.forEach(function (item) {
        $('<li>').text(item.name + ': ' + item.message).appendTo($list);
      });
      $box.append($list);
    }
    $box.prop('hidden', false);
  }

  function submitToVtech(action, token) {
    // POST body only — the token never goes into a URL
    var form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.rel = 'noreferrer';
    form.style.display = 'none';
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'token';
    input.value = token;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }

  $(document).on('click', '.vtc-proceed', function (event) {
    event.preventDefault();
    if (busy) return;
    busy = true;

    var $btn = $(this);
    $('.vtc-error').prop('hidden', true).empty();
    setButtons(true, cfg.i18n.redirecting);

    function fail(data) {
      busy = false;
      setButtons(false);
      showError($btn, data);
    }

    $.post(cfg.ajaxUrl, { action: 'vtc_handoff', nonce: cfg.nonce })
      .done(function (res) {
        if (res && res.success && res.data && res.data.token) {
          submitToVtech(res.data.action, res.data.token);
          return;
        }
        fail(res && res.data);
      })
      .fail(function (xhr) {
        fail(xhr.responseJSON && xhr.responseJSON.data);
      });
  });

  // Coming back with the browser Back button restores this page from cache; re-enable it.
  $(window).on('pageshow', function (event) {
    if (event.originalEvent && event.originalEvent.persisted) {
      busy = false;
      setButtons(false);
    }
  });
})(jQuery, vtcCheckout);
