/* global gsUtils */
(() => {
  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(this);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  function init() {
    document
      .querySelector('#restartExtension')
      .addEventListener('click', function() {
        chrome.runtime.reload();
      });
    document
      .querySelector('#sessionManagementLink')
      .addEventListener('click', function() {
        chrome.tabs.create({ url: chrome.extension.getURL('history.html') });
      });
  }
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      init();
    });
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document);

})(this);
