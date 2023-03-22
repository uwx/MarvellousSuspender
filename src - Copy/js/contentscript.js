/*
 * The Great Suspender
 * Copyright (C) 2017 Dean Oemcke
 * Available under GNU GENERAL PUBLIC LICENSE v2
 * http://github.com/greatsuspender/thegreatsuspender
 * ლ(ಠ益ಠლ)
*/
(function () {
  let isFormListenerInitialised = false;
  let isReceivingFormInput = false;
  let isIgnoreForms = false;
  let tempWhitelist = false;

  function formInputListener(e) {
    if (!isReceivingFormInput && !tempWhitelist && event.keyCode >= 48 && event.keyCode <= 90 && event.target.tagName && (
      event.target.tagName.toUpperCase() === 'INPUT' ||
      event.target.tagName.toUpperCase() === 'TEXTAREA' ||
      event.target.tagName.toUpperCase() === 'FORM' ||
      event.target.isContentEditable === true ||
      event.target.type === 'application/pdf'
    )) {
      isReceivingFormInput = true;
      if (!isBackgroundConnectable()) {
        return false;
      }
      chrome.runtime.sendMessage(buildReportTabStatePayload());
    }
  }

  function initFormInputListener() {
    if (isFormListenerInitialised) {
      return;
    }
    window.addEventListener('keydown', formInputListener);
    isFormListenerInitialised = true;
  }

  function init() {
    //listen for background events
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      if (Object.hasOwn(request, 'action') && request.action === 'requestInfo') {
        sendResponse(buildReportTabStatePayload());
        return false;
      }

      if (Object.hasOwn(request, 'scrollPos') && request.scrollPos !== '' && request.scrollPos !== '0') {
        document.body.scrollTop = request.scrollPos;
        document.documentElement.scrollTop = request.scrollPos;
      }
      if (Object.hasOwn(request, 'ignoreForms')) {
        isIgnoreForms = request.ignoreForms;
        if (isIgnoreForms) {
          initFormInputListener();
        }
        isReceivingFormInput = isReceivingFormInput && isIgnoreForms;
      }
      if (Object.hasOwn(request, 'tempWhitelist')) {
        if (isReceivingFormInput && !request.tempWhitelist) {
          isReceivingFormInput = false;
        }
        tempWhitelist = request.tempWhitelist;
      }
      sendResponse(buildReportTabStatePayload());
      return false;
    });
  }

  function waitForRuntimeReady(retries = 0) {
    return new Promise(r => r(chrome.runtime)).then(chromeRuntime => {
      if (chromeRuntime) {
        return;
      }
      if (retries > 3) {
        throw new Error('Failed waiting for chrome.runtime');
      }
      retries += 1;
      return new Promise(r => window.setTimeout(r, 500)).then(() =>
        waitForRuntimeReady(retries)
      );
    });
  }

  function isBackgroundConnectable() {
    try {
      const port = chrome.runtime.connect();
      if (port) {
        port.disconnect();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function buildReportTabStatePayload() {
    return {
      action: 'reportTabState',
      status:
        isIgnoreForms && isReceivingFormInput
          ? 'formInput'
          : tempWhitelist
            ? 'tempWhitelist'
            : 'normal',
      scrollPos:
        document.body.scrollTop || document.documentElement.scrollTop || 0,
    };
  }

  waitForRuntimeReady()
    .then(init)
    .catch(e => {
      console.error(e);
      setTimeout(() => {
        init();
      }, 200);
    });
})();
