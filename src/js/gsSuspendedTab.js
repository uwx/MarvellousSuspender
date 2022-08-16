/*global tgs, gsFavicon, gsStorage, gsSession, gsUtils, gsIndexedDb, gsChrome, chrome */
// eslint-disable-next-line no-unused-vars
const gsSuspendedTab = window.gsSuspendedTab = (function() {
  async function initTab(tab, tabView, { quickInit }) {
    // Nothing
  }

  function showNoConnectivityMessage(tabView) {
    if (!tabView.document.querySelector('#disconnectedNotice')) {
      loadToastTemplate(tabView.document);
    }
    tabView.document.querySelector('#disconnectedNotice').style.display =
      'none';
    setTimeout(function() {
      tabView.document.querySelector('#disconnectedNotice').style.display =
        'block';
    }, 50);
  }

  function updateCommand(tabView, suspensionToggleHotkey) {
    setCommand(tabView.document, suspensionToggleHotkey);
  }

  function updateTheme(tabView, tab, theme, isLowContrastFavicon) {
    setTheme(tabView.document, theme, isLowContrastFavicon);
  }

  async function updatePreviewMode(tabView, tab, previewMode) {
    const previewUri = await getPreviewUri(tab.url);
    await toggleImagePreviewVisibility(
      tabView.document,
      tab,
      previewMode,
      previewUri,
    );

    const scrollPosition = gsUtils.getSuspendedScrollPosition(tab.url);
    setScrollPosition(tabView.document, scrollPosition, previewMode);
  }

  function showContents(_document) {
    _document.querySelector('body').classList.remove('hide-initially');
  }

  function setScrollPosition(_document, scrollPosition, previewMode) {
    const scrollPosAsInt = (scrollPosition && parseInt(scrollPosition)) || 0;
    const scrollImagePreview = previewMode === '2';
    if (scrollImagePreview && scrollPosAsInt > 15) {
      const offsetScrollPosition = scrollPosAsInt + 151;
      _document.body.scrollTop = offsetScrollPosition;
      _document.documentElement.scrollTop = offsetScrollPosition;
    } else {
      _document.body.scrollTop = 0;
      _document.documentElement.scrollTop = 0;
    }
  }

  function setTitle(_document, title) {
    _document.title = title;
    _document.querySelector('#gsTitle').innerHTML = title;
    _document.querySelector('#gsTopBarTitle').innerHTML = title;

    //Check if there are updates
    let el = _document.querySelector('#tmsUpdateAvailable');
    el.style.display = gsStorage.getOption(gsStorage.UPDATE_AVAILABLE) ? 'block' : 'none';
    el.style.paddingTop = '80px';
    // Prevent unsuspend by parent container
    // Using mousedown event otherwise click can still be triggered if
    // mouse is released outside of this element
    _document.querySelector('#gsTopBarTitle').addEventListener('mousedown', function(e) {
      e.stopPropagation();
    });

    setGoToUpdateHandler(_document);
  }

  function setGoToUpdateHandler(_document) {
    _document.querySelector('#gotoUpdatePage').addEventListener('click', async function(e) {
      await gsChrome.tabsCreate(chrome.extension.getURL('update.html'));
    });
  }

  function setUrl(_document, url) {
    _document.querySelector('#gsTopBarUrl').innerHTML = cleanUrl(url);
    _document.querySelector('#gsTopBarUrl').setAttribute('href', url);
    _document.querySelector('#gsTopBarUrl').addEventListener('mousedown', function(e) {
      e.stopPropagation();
    });
  }

  function setFaviconMeta(_document, faviconMeta) {
    _document
      .querySelector('#gsTopBarImg')
      .setAttribute('src', faviconMeta.normalisedDataUrl);
    _document
      .querySelector('#gsFavicon')
      .setAttribute('href', faviconMeta.transparentDataUrl);
  }

  function setTheme(_document, theme, isLowContrastFavicon) {
    if (theme === 'dark') {
      _document.querySelector('body').classList.add('dark');
    } else {
      _document.querySelector('body').classList.remove('dark');
    }

    if (theme === 'dark' && isLowContrastFavicon) {
      _document
        .querySelector('#faviconWrap')
        .classList.add('faviconWrapLowContrast');
    } else {
      _document
        .querySelector('#faviconWrap')
        .classList.remove('faviconWrapLowContrast');
    }
  }

  function setReason(_document, reason) {
    let reasonMsgEl = _document.querySelector('#reasonMsg');
    if (!reasonMsgEl) {
      reasonMsgEl = _document.createElement('div');
      reasonMsgEl.setAttribute('id', 'reasonMsg');
      reasonMsgEl.classList.add('reasonMsg');
      const containerEl = _document.querySelector('#suspendedMsg-instr');
      containerEl.insertBefore(reasonMsgEl, containerEl.firstChild);
    }
    reasonMsgEl.innerHTML = reason;
  }

  async function getPreviewUri(suspendedUrl) {
    const originalUrl = gsUtils.getOriginalUrl(suspendedUrl);
    const preview = await gsIndexedDb.fetchPreviewImage(originalUrl);
    let previewUri = null;
    if (
      preview &&
      preview.img &&
      preview.img !== null &&
      preview.img !== 'data:,' &&
      preview.img.length > 10000
    ) {
      previewUri = preview.img;
    }
    return previewUri;
  }

  function buildImagePreview(_document, tab, previewUri) {
    return new Promise(resolve => {
      const previewEl = _document.createElement('div');
      const bodyEl = _document.querySelectorAll('body')[0];
      previewEl.setAttribute('id', 'gsPreviewContainer');
      previewEl.classList.add('gsPreviewContainer');
      previewEl.innerHTML = _document.querySelector(
        '#previewTemplate',
      ).innerHTML;
      const unsuspendTabHandler = buildUnsuspendTabHandler(_document, tab);
      previewEl.addEventListener('click', unsuspendTabHandler);
      gsUtils.localiseHtml(previewEl);
      bodyEl.append(previewEl);

      const previewImgEl = _document.querySelector('#gsPreviewImg');
      const onLoadedHandler = function() {
        previewImgEl.removeEventListener('load', onLoadedHandler);
        previewImgEl.removeEventListener('error', onLoadedHandler);
        resolve();
      };
      previewImgEl.setAttribute('src', previewUri);
      previewImgEl.addEventListener('load', onLoadedHandler);
      previewImgEl.addEventListener('error', onLoadedHandler);
    });
  }

  function addWatermarkHandler(_document) {
    _document.querySelector('.watermark').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.extension.getURL('about.html') });
    });
  }

  async function toggleImagePreviewVisibility(
    _document,
    tab,
    previewMode,
    previewUri,
  ) {
    const builtImagePreview =
      _document.querySelector('#gsPreviewContainer') !== null;
    if (
      !builtImagePreview &&
      previewUri &&
      previewMode &&
      previewMode !== '0'
    ) {
      await buildImagePreview(_document, tab, previewUri);
    } else {
      addWatermarkHandler(_document);
    }

    if (!_document.querySelector('#gsPreviewContainer')) {
      return;
    }
    const overflow = previewMode === '2' ? 'auto' : 'hidden';
    _document.body.style['overflow'] = overflow;

    if (previewMode === '0' || !previewUri) {
      _document.querySelector('#gsPreviewContainer').style.display = 'none';
      _document.querySelector('#suspendedMsg').style.display = 'flex';
      _document.body.classList.remove('img-preview-mode');
    } else {
      _document.querySelector('#gsPreviewContainer').style.display = 'block';
      _document.querySelector('#suspendedMsg').style.display = 'none';
      _document.body.classList.add('img-preview-mode');
    }
  }

  function setCommand(_document, command) {
    const hotkeyEl = _document.querySelector('#hotkeyWrapper');
    if (command) {
      hotkeyEl.innerHTML =
        '<span class="hotkeyCommand">(' + command + ')</span>';
    } else {
      const reloadString = chrome.i18n.getMessage(
        'js_suspended_hotkey_to_reload',
      );
      hotkeyEl.innerHTML = `<a id='setKeyboardShortcut' href='#'>${reloadString}</a>`;
    }
  }

  function setUnloadTabHandler(_window, tab) {
    // beforeunload event will get fired if: the tab is refreshed, the url is changed,
    // the tab is closed, or the tab is frozen by chrome ??
    // when this happens the STATE_UNLOADED_URL gets set with the suspended tab url
    // if the tab is refreshed, then on reload the url will match and the tab will unsuspend
    // if the url is changed then on reload the url will not match
    // if the tab is closed, the reload will never occur
    _window.addEventListener('beforeunload', function(e) {
      gsUtils.log(tab.id, 'BeforeUnload triggered: ' + tab.url);
      if (tgs.isCurrentFocusedTab(tab)) {
        tgs.setTabStatePropForTabId(tab.id, tgs.STATE_UNLOADED_URL, tab.url);
      } else {
        gsUtils.log(
          tab.id,
          'Ignoring beforeUnload as tab is not currently focused.',
        );
      }
    });
  }

  function setUnsuspendTabHandlers(_document, tab) {
    const unsuspendTabHandler = buildUnsuspendTabHandler(_document, tab);
    _document.querySelector('#gsTopBarUrl').addEventListener('click', unsuspendTabHandler);
    _document.querySelector('#gsTopBar').addEventListener('mousedown', unsuspendTabHandler);
    _document.querySelector('#suspendedMsg').addEventListener('click', unsuspendTabHandler);
  }

  function buildUnsuspendTabHandler(_document, tab) {
    return function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.id === 'setKeyboardShortcut') {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      } else if (e.which === 1) {
        showUnsuspendAnimation(_document);
        tgs.unsuspendTab(tab);
      }
    };
  }

  function showUnsuspendAnimation(_document) {
    if (_document.body.classList.contains('img-preview-mode')) {
      _document.querySelector('#refreshSpinner').classList.add('spinner');
    } else {
      _document.body.classList.add('waking');
      _document.querySelector('#snoozyImg').src = chrome.extension.getURL(
        'img/snoozy_tab_awake.svg',
      );
      _document.querySelector('#snoozySpinner').classList.add('spinner');
    }
  }

  function loadToastTemplate(_document) {
    const toastEl = _document.createElement('div');
    toastEl.setAttribute('id', 'disconnectedNotice');
    toastEl.classList.add('toast-wrapper');
    toastEl.innerHTML = _document.querySelector('#toastTemplate').innerHTML;
    gsUtils.localiseHtml(toastEl);
    _document.querySelectorAll('body')[0].appendChild(toastEl);
  }

  function cleanUrl(urlStr) {
    // remove scheme
    if (urlStr.indexOf('//') > 0) {
      urlStr = urlStr.substring(urlStr.indexOf('//') + 2);
    }
    // remove query string
    let match = urlStr.match(/\/?[?#]+/);
    if (match) {
      urlStr = urlStr.substring(0, match.index);
    }
    // remove trailing slash
    match = urlStr.match(/\/$/);
    if (match) {
      urlStr = urlStr.substring(0, match.index);
    }
    return urlStr;
  }

  return {
    initTab,
    showNoConnectivityMessage,
    updateCommand,
    updateTheme,
    updatePreviewMode,
  };
})();
