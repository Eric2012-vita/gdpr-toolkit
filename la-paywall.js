/**
 * LegalAIPay shared export paywall
 * Add ONE line to each tool page's <head>:
 *   <script src="/la-paywall.js"></script>
 *
 * Works on: privacy-generator-v2, us-compliance, contract-review,
 *            dpa-template, pipia, gdpr/* (breach, transfer, etc.)
 */
(function () {
  'use strict';

  var KEY = 'la_credits';

  function getStore() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d || typeof d.credits !== 'number') return null;
      if (d.expires < Date.now()) return null;
      return d;
    } catch (e) { return null; }
  }

  function creditsRemaining() {
    var d = getStore();
    return d ? Math.max(0, d.credits) : 0;
  }

  function useCredit() {
    var d = getStore();
    if (!d || d.credits <= 0) return false;
    d.credits = d.credits - 1;
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    return true;
  }

  function showModal() {
    var existing = document.getElementById('la-pw-modal');
    if (existing) { existing.style.display = 'flex'; return; }
    var overlay = document.createElement('div');
    overlay.id = 'la-pw-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif';
    overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35)">'
      + '<div style="width:58px;height:58px;background:#eff6ff;border-radius:50%;display:grid;place-items:center;margin:0 auto 16px;font-size:26px">🔒</div>'
      + '<h2 style="color:#0f1e3d;margin:0 0 8px;font-size:20px;font-weight:800">Export requires a credit</h2>'
      + '<p style="color:#64748b;font-size:14px;margin:0 0 22px;line-height:1.6">Download a clean, watermark-free document for <strong>$4.99</strong><br>— or buy a bundle of 5 for <strong>$20</strong>.</p>'
      + '<div style="display:grid;gap:10px">'
      + '<a href="/pricing" style="display:block;background:#0f1e3d;color:#fff;padding:13px;border-radius:9px;text-decoration:none;font-size:15px;font-weight:800">Get export credit →</a>'
      + '<button onclick="document.getElementById('la-pw-modal').style.display='none'" style="background:#edf2f7;color:#0f1e3d;border:none;padding:13px;border-radius:9px;cursor:pointer;font-size:14px;font-weight:600;width:100%">Cancel</button>'
      + '</div>'
      + '<p style="color:#94a3b8;font-size:12px;margin:14px 0 0">Have a token? <a href="/thank-you" style="color:#3182ce">Restore credits here</a></p>'
      + '</div>';
    overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.style.display='none'; });
    document.body.appendChild(overlay);
  }

  var WM_CLASS = 'la-wm-banner';
  var WM_HTML = '<div class="la-wm-banner" style="background:rgba(255,248,225,.97);border:1px solid #ffe082;border-radius:7px;padding:9px 14px;margin-top:10px;font-size:12px;color:#7c5a00;text-align:center">'
    + '⚠️ <strong>DRAFT</strong> — preview only. '
    + '<a href="/pricing" style="color:#3182ce;font-weight:700">Export for $4.99</a> to download a clean, watermark-free document.'
    + '</div>';

  function injectWatermark(el) {
    if (!el || el.querySelector('.'+WM_CLASS)) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = WM_HTML;
    el.appendChild(tmp.firstChild);
  }

  function removeWatermark(el) {
    if (!el) return;
    var wm = el.querySelector('.'+WM_CLASS);
    if (wm) wm.parentNode.removeChild(wm);
  }

  function watchOutput(el) {
    if (!el) return;
    var obs = new MutationObserver(function() {
      var txt = (el.textContent || '').trim();
      if (!txt || txt.length < 20) return;
      if (creditsRemaining() > 0) { removeWatermark(el); } else { injectWatermark(el); }
    });
    obs.observe(el, { childList:true, subtree:true, characterData:true });
  }

  function guard(fn, context) {
    return function() {
      var args = arguments;
      if (creditsRemaining() > 0) { useCredit(); fn.apply(context||this, args); } else { showModal(); }
    };
  }

  function patchGlobal(name) {
    if (typeof window[name] === 'function') window[name] = guard(window[name]);
  }

  function patchBtn(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.onclick) { el.onclick = guard(el.onclick, el); }
    else if (el.getAttribute('onclick')) {
      var orig = el.getAttribute('onclick');
      el.removeAttribute('onclick');
      el.addEventListener('click', guard(function(){ (new Function(orig)).call(el); }));
    }
  }

  function patchBtnsByOnclick(keyword) {
    document.querySelectorAll('[onclick]').forEach(function(el) {
      var oc = el.getAttribute('onclick') || '';
      if (oc.indexOf(keyword) !== -1) {
        var orig = oc;
        el.removeAttribute('onclick');
        el.addEventListener('click', guard(function(){ (new Function(orig)).call(el); }));
      }
    });
  }

  function patchPage() {
    var path = window.location.pathname.toLowerCase();
    var host = window.location.hostname.toLowerCase();

    if (path.indexOf('privacy-policy-generator') !== -1 || path.indexOf('privacy-generator') !== -1) {
      patchGlobal('copyOut');
      watchOutput(document.getElementById('output'));
      return;
    }
    if (path.indexOf('us-compliance') !== -1 || path.indexOf('us-state') !== -1 || path.indexOf('us-privacy') !== -1) {
      ['downloadPack','downloadPackWord','downloadPackHtml','downloadCounselMemo','copyOut'].forEach(patchGlobal);
      watchOutput(document.getElementById('out'));
      return;
    }
    if (path.indexOf('contract-review') !== -1) {
      patchBtn('copyBtn'); patchBtn('downloadMemoBtn'); patchBtn('downloadRedlineBtn');
      watchOutput(document.getElementById('memoView'));
      return;
    }
    if (path.indexOf('dpa') !== -1) {
      ['copyTemplate','downloadTemplate','copyGeneratedDpa','downloadGeneratedDpa'].forEach(patchBtn);
      patchBtnsByOnclick('window.print');
      watchOutput(document.getElementById('generatedDpa'));
      return;
    }
    if (path.indexOf('pipia') !== -1) {
      ['guardedExportReport','guardedGeneratePolicy'].forEach(patchGlobal);
      patchBtnsByOnclick('window.print');
      watchOutput(document.getElementById('summaryGrid'));
      return;
    }
    if (host.indexOf('gdpr') !== -1 || path.indexOf('gdpr') !== -1) {
      ['exportHtml','exportJson','downloadReport','copyReport','copyOut'].forEach(patchGlobal);
      patchBtnsByOnclick('window.print');
      patchBtnsByOnclick('export');
      patchBtnsByOnclick('download');
      ['output','out','result','reportOut','letter33','letter34'].forEach(function(id){ watchOutput(document.getElementById(id)); });
      return;
    }
  }

  window.LAPay = { credits: creditsRemaining, guard: guard, showModal: showModal };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchPage);
  } else {
    patchPage();
  }

}());
