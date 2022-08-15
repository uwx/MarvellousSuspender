/*global tgs, gsStorage, gsUtils */
(function(global) {
  'use strict';

  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(global);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document).then(function() {
    var notice = tgs.requestNotice();
    if (
      notice &&
      Object.hasOwn(notice, 'text') &&
      Object.hasOwn(notice, 'version')
    ) {
      var noticeContentEl = document.getElementById('gsNotice');
      noticeContentEl.innerHTML = notice.text;
      //update local notice version
      gsStorage.setNoticeVersion(notice.version);
    }

    //clear notice (to prevent it showing again)
    tgs.clearNotice();
  });
})(this);
