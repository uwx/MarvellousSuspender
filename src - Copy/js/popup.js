/*global tgs, gsStorage, gsSession, gsUtils */
(function (global) {
  chrome.extension.getBackgroundPage().tgs.setViewGlobals(global);

  let globalActionElListener;

  const getTabStatus = function (retriesRemaining, callback) {
    tgs.getActiveTabStatus(function (status) {
      if (
        status !== gsUtils.STATUS_UNKNOWN &&
        status !== gsUtils.STATUS_LOADING
      ) {
        callback(status);
      } else if (retriesRemaining === 0) {
        callback(status);
      } else {
        let timeout = 1000;
        if (!gsSession.isInitialising()) {
          retriesRemaining--;
          timeout = 200;
        }
        setTimeout(function () {
          getTabStatus(retriesRemaining, callback);
        }, timeout);
      }
    });
  };
  function getTabStatusAsPromise(retries, allowTransientStates) {
    return new Promise(function (resolve) {
      getTabStatus(retries, function (status) {
        if (
          !allowTransientStates &&
          (status === gsUtils.STATUS_UNKNOWN ||
            status === gsUtils.STATUS_LOADING)
        ) {
          status = 'error';
        }
        resolve(status);
      });
    });
  }
  function getSelectedTabsAsPromise() {
    return new Promise(function (resolve) {
      chrome.tabs.query(
        { highlighted: true, lastFocusedWindow: true },
        function (tabs) {
          resolve(tabs);
        }
      );
    });
  }

  Promise.all([
    gsUtils.documentReadyAndLocalisedAsPromised(document),
    getTabStatusAsPromise(0, true),
    getSelectedTabsAsPromise(),
  ]).then(function ([domLoadedEvent, initialTabStatus, selectedTabs]) {
    setSuspendSelectedVisibility(selectedTabs);
    setStatus(initialTabStatus);
    showPopupContents();
    addClickHandlers();

    if (
      initialTabStatus === gsUtils.STATUS_UNKNOWN ||
      initialTabStatus === gsUtils.STATUS_LOADING
    ) {
      getTabStatusAsPromise(50, false).then(function (finalTabStatus) {
        setStatus(finalTabStatus);
      });
    }
  });

  function setSuspendCurrentVisibility(tabStatus) {
    const suspendOneVisible = ![
      gsUtils.STATUS_SUSPENDED,
      gsUtils.STATUS_SPECIAL,
      gsUtils.STATUS_BLOCKED_FILE,
      gsUtils.STATUS_UNKNOWN,
    ].includes(tabStatus);

    const whitelistVisible = ![
      gsUtils.STATUS_WHITELISTED,
      gsUtils.STATUS_SPECIAL,
      gsUtils.STATUS_BLOCKED_FILE,
      gsUtils.STATUS_UNKNOWN,
    ].includes(tabStatus);

    const unsuspendVisible = false;

    if (suspendOneVisible) {
      document.querySelector('#suspendOne').style.display = 'block';
    } else {
      document.querySelector('#suspendOne').style.display = 'none';
    }

    if (whitelistVisible) {
      document.querySelector('#whitelistPage').style.display = 'block';
      document.querySelector('#whitelistDomain').style.display = 'block';
    } else {
      document.querySelector('#whitelistPage').style.display = 'none';
      document.querySelector('#whitelistDomain').style.display = 'none';
    }

    if (suspendOneVisible || whitelistVisible) {
      document.querySelector('#optsCurrent').style.display = 'block';
    } else {
      document.querySelector('#optsCurrent').style.display = 'none';
    }

    if (unsuspendVisible) {
      document.querySelector('#unsuspendOne').style.display = 'block';
    } else {
      document.querySelector('#unsuspendOne').style.display = 'none';
    }
  }

  function setSuspendSelectedVisibility(selectedTabs) {
    if (selectedTabs && selectedTabs.length > 1) {
      document.querySelector('#optsSelected').style.display = 'block';
    } else {
      document.querySelector('#optsSelected').style.display = 'none';
    }
  }

  function setStatus(status) {
    setSuspendCurrentVisibility(status);

    let statusDetail = '';
    //  statusIconClass = '';

    // Update status icon and text
    if (status === gsUtils.STATUS_NORMAL || status === gsUtils.STATUS_ACTIVE) {
      statusDetail =
        chrome.i18n.getMessage('js_popup_normal') +
        " <a href='#'>" +
        chrome.i18n.getMessage('js_popup_normal_pause') +
        '</a>';
      //    statusIconClass = 'fa fa-clock-o';
    } else if (status === gsUtils.STATUS_SUSPENDED) {
      // statusDetail =
      //   chrome.i18n.getMessage('js_popup_suspended') +
      //   " <a href='#'>" +
      //   chrome.i18n.getMessage('js_popup_suspended_pause') +
      //   '</a>';
      statusDetail = chrome.i18n.getMessage('js_popup_suspended');
      //    statusIconClass = 'fa fa-pause';
    } else if (status === gsUtils.STATUS_NEVER) {
      statusDetail = chrome.i18n.getMessage('js_popup_never');
      //    statusIconClass = 'fa fa-ban';
    } else if (status === gsUtils.STATUS_SPECIAL) {
      statusDetail = chrome.i18n.getMessage('js_popup_special');
      //    statusIconClass = 'fa fa-remove';
    } else if (status === gsUtils.STATUS_WHITELISTED) {
      statusDetail =
        chrome.i18n.getMessage('js_popup_whitelisted') +
        " <a href='#'>" +
        chrome.i18n.getMessage('js_popup_whitelisted_remove') +
        '</a>';
      //    statusIconClass = 'fa fa-check';
    } else if (status === gsUtils.STATUS_AUDIBLE) {
      statusDetail = chrome.i18n.getMessage('js_popup_audible');
      //    statusIconClass = 'fa fa-volume-up';
    } else if (status === gsUtils.STATUS_FORMINPUT) {
      statusDetail =
        chrome.i18n.getMessage('js_popup_form_input') +
        " <a href='#'>" +
        chrome.i18n.getMessage('js_popup_form_input_unpause') +
        '</a>';
      //    statusIconClass = 'fa fa-edit';
    } else if (status === gsUtils.STATUS_PINNED) {
      statusDetail = chrome.i18n.getMessage('js_popup_pinned'); //  statusIconClass = 'fa fa-thumb-tack';
    } else if (status === gsUtils.STATUS_TEMPWHITELIST) {
      statusDetail =
        chrome.i18n.getMessage('js_popup_temp_whitelist') +
        " <a href='#'>" +
        chrome.i18n.getMessage('js_popup_temp_whitelist_unpause') +
        '</a>';
      //    statusIconClass = 'fa fa-pause';
    } else if (status === gsUtils.STATUS_NOCONNECTIVITY) {
      statusDetail = chrome.i18n.getMessage('js_popup_no_connectivity');
      //    statusIconClass = 'fa fa-plane';
    } else if (status === gsUtils.STATUS_CHARGING) {
      statusDetail = chrome.i18n.getMessage('js_popup_charging');
      //    statusIconClass = 'fa fa-plug';
    } else if (status === gsUtils.STATUS_BLOCKED_FILE) {
      statusDetail =
        chrome.i18n.getMessage('js_popup_blockedFile') +
        " <a href='#'>" +
        chrome.i18n.getMessage('js_popup_blockedFile_enable') +
        '</a>';
      //    statusIconClass = 'fa fa-exclamation-triangle';
    } else if (
      status === gsUtils.STATUS_LOADING ||
      status === gsUtils.STATUS_UNKNOWN
    ) {
      statusDetail = gsSession.isInitialising()
        ? chrome.i18n.getMessage('js_popup_initialising')
        : chrome.i18n.getMessage('js_popup_unknown');
    } else if (status === 'error') {
      statusDetail = chrome.i18n.getMessage('js_popup_error');
      //    statusIconClass = 'fa fa-exclamation-triangle';
    } else {
      gsUtils.warning('popup', 'Could not process tab status of: ' + status);
    }
    document.querySelector('#statusDetail').innerHTML = statusDetail;
    //  document.getElementById('statusIcon').className = statusIconClass;
    // if (status === gsUtils.STATUS_UNKNOWN || status === gsUtils.STATUS_LOADING) {
    //     document.getElementById('statusIcon').classList.add('fa-spin');
    // }

    document.querySelector('#header').classList.remove('willSuspend');
    if (status === gsUtils.STATUS_NORMAL || status === gsUtils.STATUS_ACTIVE) {
      document.querySelector('#header').classList.add('willSuspend');
    }
    if (status === gsUtils.STATUS_BLOCKED_FILE) {
      document.querySelector('#header').classList.add('blockedFile');
    }

    // Update action handler
    const actionEl = document.querySelectorAll('a')[0];
    if (actionEl) {
      let tgsHanderFunc;
      if (
        status === gsUtils.STATUS_NORMAL ||
        status === gsUtils.STATUS_ACTIVE
      ) {
        tgsHanderFunc = tgs.requestToggleTempWhitelistStateOfHighlightedTab;
      } else if (status === gsUtils.STATUS_SUSPENDED) {
        tgsHanderFunc = tgs.requestToggleTempWhitelistStateOfHighlightedTab;
      } else if (status === gsUtils.STATUS_WHITELISTED) {
        tgsHanderFunc = tgs.unwhitelistHighlightedTab;
      } else if (
        status === gsUtils.STATUS_FORMINPUT ||
        status === gsUtils.STATUS_TEMPWHITELIST
      ) {
        tgsHanderFunc = tgs.requestToggleTempWhitelistStateOfHighlightedTab;
      } else if (status === gsUtils.STATUS_BLOCKED_FILE) {
        tgsHanderFunc = tgs.promptForFilePermissions;
      }

      if (globalActionElListener) {
        actionEl.removeEventListener('click', globalActionElListener);
      }
      if (tgsHanderFunc) {
        globalActionElListener = function (e) {
          tgsHanderFunc(function (newTabStatus) {
            setStatus(newTabStatus);
          });
          // window.close();
        };
        actionEl.addEventListener('click', globalActionElListener);
      }
    }
  }

  function showPopupContents() {
    const theme = gsStorage.getOption(gsStorage.THEME);
    if (theme === 'dark') {
      document.body.classList.add('dark');
    }
  }

  function addClickHandlers() {
    document
      .querySelector('#unsuspendOne')
      .addEventListener('click', function (e) {
        tgs.unsuspendHighlightedTab();
        window.close();
      });
    document
      .querySelector('#suspendOne')
      .addEventListener('click', function (e) {
        tgs.suspendHighlightedTab();
        window.close();
      });
    document
      .querySelector('#suspendAll')
      .addEventListener('click', function (e) {
        tgs.suspendAllTabs(false);
        window.close();
      });
    document
      .querySelector('#unsuspendAll')
      .addEventListener('click', function (e) {
        tgs.unsuspendAllTabs();
        window.close();
      });
    document
      .querySelector('#suspendSelected')
      .addEventListener('click', function (e) {
        tgs.suspendSelectedTabs();
        window.close();
      });
    document
      .querySelector('#unsuspendSelected')
      .addEventListener('click', function (e) {
        tgs.unsuspendSelectedTabs();
        window.close();
      });
    document
      .querySelector('#whitelistDomain')
      .addEventListener('click', function (e) {
        tgs.whitelistHighlightedTab(false);
        setStatus(gsUtils.STATUS_WHITELISTED);
        // window.close();
      });
    document
      .querySelector('#whitelistPage')
      .addEventListener('click', function (e) {
        tgs.whitelistHighlightedTab(true);
        setStatus(gsUtils.STATUS_WHITELISTED);
        // window.close();
      });
    document
      .querySelector('#settingsLink')
      .addEventListener('click', function (e) {
        chrome.tabs.create({
          url: chrome.extension.getURL('options.html'),
        });
        window.close();
      });
  }
})(this);
