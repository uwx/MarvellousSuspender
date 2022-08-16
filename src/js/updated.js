/*global gsSession, gsUtils */
(function(global) {
  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(global);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  function toggleUpdated() {
    document.querySelector('#updating').style.display = 'none';
    document.querySelector('#updated').style.display = 'block';
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document).then(function() {
    // var versionEl = document.getElementById('updatedVersion');
    // versionEl.innerHTML = 'v' + chrome.runtime.getManifest().version;

    document.querySelector('#sessionManagerLink').addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.extension.getURL('history.html') });
    });

    const updateType = gsSession.getUpdateType();
    if (updateType === 'major') {
      document.querySelector('#patchMessage').style.display = 'none';
      document.querySelector('#minorUpdateDetail').style.display = 'none';
    } else if (updateType === 'minor') {
      document.querySelector('#patchMessage').style.display = 'none';
      document.querySelector('#majorUpdateDetail').style.display = 'none';
    } else {
      document.querySelector('#updateDetail').style.display = 'none';
    }

    if (gsSession.isUpdated()) {
      toggleUpdated();
    }
  });

  global.exports = {
    toggleUpdated,
  };
})(this);
