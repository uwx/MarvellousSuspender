/*global tgs, gsStorage, gsUtils */
(() => {
  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(this);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document).then(function() {
    const notice = tgs.requestNotice();
    if (
      notice &&
      Object.hasOwn(notice, 'text') &&
      Object.hasOwn(notice, 'version')
    ) {
      const noticeContentEl = document.querySelector('#gsNotice');
      noticeContentEl.innerHTML = notice.text;
      //update local notice version
      gsStorage.setNoticeVersion(notice.version);
    }

    //clear notice (to prevent it showing again)
    tgs.clearNotice();
  });
})();
