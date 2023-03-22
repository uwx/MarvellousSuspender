/*global historyUtils, gsSession, gsChrome, gsUtils */
(function(global) {
  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(global);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document).then(function() {
    document.querySelector('#exportBackupBtn').addEventListener('click', async function(e) {
      const currentSession = await gsSession.buildCurrentSession();
      historyUtils.exportSession(currentSession, function() {
        document.querySelector('#exportBackupBtn').style.display = 'none';
      });
    });
    document.querySelector('#setFilePermissiosnBtn').addEventListener('click', async function(
      e
    ) {
      await gsChrome.tabsCreate({
        url: 'chrome://extensions?id=' + chrome.runtime.id,
      });
    });
  });
})(this);
