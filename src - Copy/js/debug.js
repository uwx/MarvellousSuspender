/*global tgs, gsUtils, gsFavicon, gsStorage, gsChrome */
(function (global) {
  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(global);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  const currentTabs = {};

  function generateTabInfo(info) {
    // console.log(info.tabId, info);
    const timerStr =
      info && info.timerUp && info && info.timerUp !== '-'
        ? new Date(info.timerUp).toLocaleString()
        : '-';
    let html = '';
    const windowId = info && info.windowId ? info.windowId : '?';
    const tabId = info && info.tabId ? info.tabId : '?';
    const tabIndex = info && info.tab ? info.tab.index : '?';
    let favicon = info && info.tab ? info.tab.favIconUrl : '';
    const tabTitle = info && info.tab ? gsUtils.htmlEncode(info.tab.title) : '?';
    const tabTimer = timerStr;
    const tabStatus = info ? info.status : '?';

    favicon =
      favicon && favicon.indexOf('data') === 0
        ? favicon
        : gsFavicon.generateChromeFavIconUrlFromUrl(info.tab.url);

    html += '<tr>';
    html += '<td>' + windowId + '</td>';
    html += '<td>' + tabId + '</td>';
    html += '<td>' + tabIndex + '</td>';
    html += '<td><img src=' + favicon + '></td>';
    html += '<td>' + tabTitle + '</td>';
    html += '<td>' + tabTimer + '</td>';
    html += '<td>' + tabStatus + '</td>';
    html += '</tr>';

    return html;
  }

  async function fetchInfo() {
    const tabs = await gsChrome.tabsQuery();
    const debugInfoPromises = [];
    for (const [i, curTab] of tabs.entries()) {
      currentTabs[tabs[i].id] = tabs[i];
      debugInfoPromises.push(
        new Promise(r =>
          tgs.getDebugInfo(curTab.id, o => {
            o.tab = curTab;
            r(o);
          })
        )
      );
    }
    const debugInfos = await Promise.all(debugInfoPromises);
    for (const debugInfo of debugInfos) {
      const tableEl = document.querySelector('#gsProfilerBody');
      const html = generateTabInfo(debugInfo);
      tableEl.innerHTML = tableEl.innerHTML + html;
    }
  }

  function addFlagHtml(elementId, getterFn, setterFn) {
    document.getElementById(elementId).innerHTML = getterFn();
    document.getElementById(elementId).addEventListener('click', function (e) {
      const newVal = !getterFn();
      setterFn(newVal);
      document.getElementById(elementId).innerHTML = newVal;
    });
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document).then(async function () {
    //Set theme
    document.body.classList.add(gsStorage.getOption(gsStorage.THEME) === 'dark' ? 'dark' : null);
    await fetchInfo();
    addFlagHtml(
      'toggleDebugInfo',
      () => gsUtils.isDebugInfo(),
      newVal => gsUtils.setDebugInfo(newVal)
    );
    addFlagHtml(
      'toggleDebugError',
      () => gsUtils.isDebugError(),
      newVal => gsUtils.setDebugError(newVal)
    );
    addFlagHtml(
      'toggleDiscardInPlaceOfSuspend',
      () => gsStorage.getOption(gsStorage.DISCARD_IN_PLACE_OF_SUSPEND),
      newVal => {
        gsStorage.setOptionAndSync(
          gsStorage.DISCARD_IN_PLACE_OF_SUSPEND,
          newVal
        );
      }
    );
    document.querySelector('#claimSuspendedTabs').addEventListener('click', async function (e) {
      const tabs = await gsChrome.tabsQuery();
      for (const tab of tabs) {
        if (
          gsUtils.isSuspendedTab(tab, true) &&
          !tab.url.includes(chrome.runtime.id)
        ) {
          const newUrl = tab.url.replace(
            gsUtils.getRootUrl(tab.url),
            chrome.runtime.id
          );
          await gsChrome.tabsUpdate(tab.id, { url: newUrl });
        }
      }
    });

    const extensionsUrl = `chrome://extensions/?id=${chrome.runtime.id}`;
    document
      .querySelector('#backgroundPage')
      .setAttribute('href', extensionsUrl);
    document.querySelector('#backgroundPage').addEventListener('click', function () {
      chrome.tabs.create({ url: extensionsUrl });
    });

    /*
        chrome.processes.onUpdatedWithMemory.addListener(function (processes) {
            chrome.tabs.query({}, function (tabs) {
                var html = '';
                html += generateMemStats(processes);
                html += '<br />';
                html += generateTabStats(tabs);
                document.getElementById('gsProfiler').innerHTML = html;
            });
        });
        */
  });
})(this);
