/*global historyItems, historyUtils, gsSession, gsIndexedDb, gsUtils, gsStorage */
(function (global) {
  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(global);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  async function reloadTabs(sessionId, windowId, openTabsAsSuspended) {
    const session = await gsIndexedDb.fetchSessionBySessionId(sessionId);
    if (!session || !session.windows) {
      return;
    }

    gsUtils.removeInternalUrlsFromSession(session);

    //if loading a specific window
    let sessionWindows = [];
    if (windowId) {
      sessionWindows.push(gsUtils.getWindowFromSession(windowId, session));
      //else load all windows from session
    } else {
      sessionWindows = session.windows;
    }

    for (const sessionWindow of sessionWindows) {
      const suspendMode = openTabsAsSuspended ? 1 : 2;
      await gsSession.restoreSessionWindow(sessionWindow, null, suspendMode);
    }
  }

  function deleteSession(sessionId) {
    const result = window.confirm(
      chrome.i18n.getMessage('js_history_confirm_delete'),
    );
    if (result) {
      gsIndexedDb.removeSessionFromHistory(sessionId).then(function () {
        window.location.reload();
      });
    }
  }

  function removeTab(element, sessionId, windowId, tabId) {
    let sessionEl, newSessionEl;

    gsIndexedDb
      .removeTabFromSessionHistory(sessionId, windowId, tabId)
      .then(function (session) {
        gsUtils.removeInternalUrlsFromSession(session);
        //if we have a valid session returned
        if (session) {
          sessionEl = element.parentElement.parentElement;
          newSessionEl = createSessionElement(session);
          sessionEl.parentElement.replaceChild(newSessionEl, sessionEl);
          toggleSession(newSessionEl, session.sessionId); //async. unhandled promise

          //otherwise assume it was the last tab in session and session has been removed
        } else {
          window.location.reload();
        }
      });
  }

  async function toggleSession(element, sessionId) {
    const sessionContentsEl = element.querySelectorAll(
      '.sessionContents',
    )[0];
    const sessionIcon = element.querySelectorAll('.sessionIcon')[0];
    if (sessionIcon.classList.contains('icon-plus-squared-alt')) {
      sessionIcon.classList.remove('icon-plus-squared-alt');
      sessionIcon.classList.add('icon-minus-squared-alt');
    } else {
      sessionIcon.classList.remove('icon-minus-squared-alt');
      sessionIcon.classList.add('icon-plus-squared-alt');
    }

    //if toggled on already, then toggle off
    if (sessionContentsEl.childElementCount > 0) {
      sessionContentsEl.innerHTML = '';
      return;
    }

    gsIndexedDb
      .fetchSessionBySessionId(sessionId)
      .then(async function (curSession) {
        if (!curSession || !curSession.windows) {
          return;
        }
        gsUtils.removeInternalUrlsFromSession(curSession);

        for (const [i, curWindow] of curSession.windows.entries()) {
          curWindow.sessionId = curSession.sessionId;
          sessionContentsEl.append(
            createWindowElement(curSession, curWindow, i),
          );

          const tabPromises = [];
          for (const curTab of curWindow.tabs) {
            curTab.windowId = curWindow.id;
            curTab.sessionId = curSession.sessionId;
            curTab.title = gsUtils.getCleanTabTitle(curTab);
            if (gsUtils.isSuspendedTab(curTab)) {
              curTab.url = gsUtils.getOriginalUrl(curTab.url);
            }
            tabPromises.push(createTabElement(curSession, curWindow, curTab));
          }
          const tabEls = await Promise.all(tabPromises);
          for (const tabEl of tabEls) {
            sessionContentsEl.append(tabEl);
          }
        }
      });
  }

  function addClickListenerToElement(element, func) {
    if (element) {
      element.addEventListener('click', func);
    }
  }

  function createSessionElement(session) {
    const sessionEl = historyItems.createSessionHtml(session, true);

    addClickListenerToElement(
      sessionEl.querySelectorAll('.sessionIcon')[0],
      function () {
        toggleSession(sessionEl, session.sessionId); //async. unhandled promise
      },
    );
    addClickListenerToElement(
      sessionEl.querySelectorAll('.sessionLink')[0],
      function () {
        toggleSession(sessionEl, session.sessionId); //async. unhandled promise
      },
    );
    addClickListenerToElement(
      sessionEl.querySelectorAll('.exportLink')[0],
      function () {
        historyUtils.exportSessionWithId(null, session.sessionId);
      },
    );
    addClickListenerToElement(
      sessionEl.querySelectorAll('.resuspendLink')[0],
      function () {
        reloadTabs(session.sessionId, null, true); // async
      },
    );
    addClickListenerToElement(
      sessionEl.querySelectorAll('.reloadLink')[0],
      function () {
        reloadTabs(session.sessionId, null, false); // async
      },
    );
    addClickListenerToElement(
      sessionEl.querySelectorAll('.saveLink')[0],
      function () {
        historyUtils.saveSession(session.sessionId, null);
      },
    );
    addClickListenerToElement(
      sessionEl.querySelectorAll('.deleteLink')[0],
      function () {
        deleteSession(session.sessionId);
      },
    );
    return sessionEl;
  }

  function createWindowElement(session, window, index) {
    const allowReload = session.sessionId !== gsSession.getSessionId();
    const windowEl = historyItems.createWindowHtml(window, index, allowReload);

    addClickListenerToElement(
      windowEl.querySelectorAll('.resuspendLink')[0],
      function () {
        reloadTabs(session.sessionId, window.id, true); // async
      },
    );
    addClickListenerToElement(
      windowEl.querySelectorAll('.reloadLink')[0],
      function () {
        reloadTabs(session.sessionId, window.id, false); // async
      },
    );
    addClickListenerToElement(
      windowEl.querySelectorAll('.exportLink' + index)[0],
      function () {
        // document.getElementById('debugWindowId').innerText = 'Window ID sent: ' + window.id;
        historyUtils.exportSessionWithId(window.id, session.sessionId);
      },
    );
    addClickListenerToElement(
      windowEl.querySelectorAll('.saveLink' + index)[0],
      function () {
        // document.getElementById('debugWindowId').innerText = 'Window ID sent: ' + window.id;
        historyUtils.saveSession(session.sessionId, window.id);
      },
    );
    return windowEl;
  }

  async function createTabElement(session, window, tab) {
    const allowDelete = session.sessionId !== gsSession.getSessionId();
    const tabEl = await historyItems.createTabHtml(tab, allowDelete);

    addClickListenerToElement(
      tabEl.querySelectorAll('.removeLink')[0],
      function () {
        removeTab(tabEl, session.sessionId, window.id, tab.id);
      },
    );
    return tabEl;
  }

  function render() {
    //Set theme
    document.body.classList.add(gsStorage.getOption(gsStorage.THEME) === 'dark' ? 'dark' : null);

    const currentDiv = document.querySelector('#currentSessions');
    const sessionsDiv = document.querySelector('#recoverySessions');
    const historyDiv = document.querySelector('#historySessions');
    const importSessionEl = document.querySelector('#importSession');
    const importSessionActionEl = document.querySelector('#importSessionAction');
    let firstSession = true;

    currentDiv.innerHTML = '';
    sessionsDiv.innerHTML = '';
    historyDiv.innerHTML = '';

    gsIndexedDb.fetchCurrentSessions().then(function (currentSessions) {
      for (const session of currentSessions) {
        gsUtils.removeInternalUrlsFromSession(session);
        const sessionEl = createSessionElement(session);
        if (firstSession) {
          currentDiv.append(sessionEl);
          firstSession = false;
        } else {
          sessionsDiv.append(sessionEl);
        }
      }
    });

    gsIndexedDb.fetchSavedSessions().then(function (savedSessions) {
      for (const session of savedSessions) {
        gsUtils.removeInternalUrlsFromSession(session);
        const sessionEl = createSessionElement(session);
        historyDiv.append(sessionEl);
      }
    });

    importSessionActionEl.addEventListener(
      'change',
      historyUtils.importSession,
      false,
    );
    importSessionEl.addEventListener('click', function () {
      importSessionActionEl.click();
    });

    const migrateTabsEl = document.querySelector('#migrateTabs');
    migrateTabsEl.addEventListener('click', function () {
      const migrateTabsFromIdEl = document.querySelector('#migrateFromId');
      historyUtils.migrateTabs(migrateTabsFromIdEl.value);
    });

    //hide incompatible sidebar items if in incognito mode
    if (chrome.extension.inIncognitoContext) {
      Array.prototype.forEach.call(
        document.querySelectorAll('.noIncognito'),
        function (el) {
          el.style.display = 'none';
        },
      );
    }
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document).then(function () {
    render();
  });

})(this);
