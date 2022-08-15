/* global gsUtils, gsStorage */
(() => {
  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(this);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document).then(function() {
    //Set theme
    document.body.classList.add(gsStorage.getOption(gsStorage.THEME) === 'dark' ? 'dark' : null);

    const versionEl = document.querySelector('#aboutVersion');
    versionEl.innerHTML = 'v' + chrome.runtime.getManifest().version;

    //hide incompatible sidebar items if in incognito mode
    if (chrome.extension.inIncognitoContext) {
      Array.prototype.forEach.call(
        document.querySelectorAll('.noIncognito'),
        function(el) {
          el.style.display = 'none';
        },
      );
    }
  });

})();
