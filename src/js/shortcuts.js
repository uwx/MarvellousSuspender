/*global gsUtils, gsStorage */
(function(global) {
  try {
    chrome.extension.getBackgroundPage().tgs.setViewGlobals(global);
  } catch (e) {
    window.setTimeout(() => window.location.reload(), 1000);
    return;
  }

  gsUtils.documentReadyAndLocalisedAsPromised(document).then(function() {
    //Set theme
    document.body.classList.add(gsStorage.getOption(gsStorage.THEME) === 'dark' ? 'dark' : null);

    const shortcutsEl = document.querySelector('#keyboardShortcuts');
    const configureShortcutsEl = document.querySelector('#configureShortcuts');

    const notSetMessage = chrome.i18n.getMessage('js_shortcuts_not_set');
    const groupingKeys = new Set([
      '2-toggle-temp-whitelist-tab',
      '2b-unsuspend-selected-tabs',
      '4-unsuspend-active-window',
    ]);

    //populate keyboard shortcuts
    chrome.commands.getAll(commands => {
      for (const command of commands) {
        if (command.name !== '_execute_browser_action') {
          const shortcut =
            command.shortcut !== ''
              ? gsUtils.formatHotkeyString(command.shortcut)
              : '(' + notSetMessage + ')';
          const addMarginBottom = groupingKeys.has(command.name);
          shortcutsEl.innerHTML += `<div ${
            addMarginBottom ? ' class="bottomMargin"' : ''
          }>${command.description}</div>
            <div class="${command.shortcut ? 'hotkeyCommand' : 'lesserText'}">${shortcut}</div>`;
        }
      }
    });

    //listener for configureShortcuts
    configureShortcutsEl.addEventListener('click', function(e) {
      chrome.tabs.update({ url: 'chrome://extensions/shortcuts' });
    });
  });

})(this);
