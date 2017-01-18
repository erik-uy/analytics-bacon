'use strict';
var isRecording = false;


chrome.storage.local.get('isRecording', function(result){
  isRecording = result.isRecording;
  if (isRecording)
    chrome.browserAction.setBadgeText({text:'R'});
  else
    chrome.browserAction.setBadgeText({text:''});
});

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('previousVersion', details.previousVersion);
});

chrome.browserAction.onClicked.addListener(function (tab) {
  // Send a message to the active tab
  chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {message: 'clicked_browser_action'});
  });
});

chrome.storage.onChanged.addListener(function(changes){
  console.log('change detected');
  if (typeof changes.isRecording !== 'undefined') {
    console.log('isRecording change detected');
    console.log(changes);
    isRecording = changes.isRecording.newValue;
    if (isRecording){
      chrome.storage.local.get(['har'], function (result) {
        var array = result['har'] ? result['har'] : [];
        if(array.length==0 || (array[0] && array[0].length>0)){
          array.unshift([]);
        }
        var jsonObj = {};
        jsonObj['har'] = array;
        chrome.storage.local.set(jsonObj, function (r) {
          console.log('Pushed new network buffer array');
        });
      });
    }
  }
});

chrome.webRequest.onCompleted.addListener(
  function (details) {

    if(!isRecording) return;
    console.log('onBeforeRequest', details);
    var key = 'har';

    chrome.storage.local.get([key], function (result) {
      var array = result[key] ? result[key] : [[]];

      array[0].unshift(details);

      var jsonObj = {};
      jsonObj[key] = array;
      chrome.storage.local.set(jsonObj, function (r) {
        console.log(r);
      });
    });


  },
  {urls: ['*://*/b/ss/*']},
  []
);
