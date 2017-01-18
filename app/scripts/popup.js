'use strict';

var app = angular.module('Popup', ['ui.bootstrap','ui.bootstrap.popover']);
function updateBadge(r){
  if (r)
    chrome.browserAction.setBadgeText({text:'R'});
  else
    chrome.browserAction.setBadgeText({text:''});
}

app.filter('decodeURIComponent', function() {
  return window.decodeURIComponent;
});

app.controller('BaconCtrl', ['$scope', '$filter',function ($scope, $filter) {
  window.scope=$scope;
  $scope.extensionId=chrome.runtime.id;
  $scope.isRecording=false;
  $scope.selectedRequestIds=[];

  chrome.tabs.query({currentWindow:true, active:true}, function(tab){
    $scope.$apply(function(s){s.curTab = tab});
  });

  chrome.storage.local.get('isRecording', function(result){
    $scope.$apply(function(s){s.isRecording = result.isRecording});
    updateBadge($scope.isRecording);
  });

  chrome.storage.local.get(['har'], function(result) {
    $scope.$apply(function(s){
      s.har=result.har||[];
    });
  });

  chrome.storage.onChanged.addListener(function(changes){
    $scope.$apply(function(s){
      if (changes.har && changes.har.newValue)
      s.har=changes.har.newValue;
    });
  });

  $scope.clear = function () {
    var r = confirm('Are you sure?');
    if (r == true) {
      chrome.storage.local.clear();
      delete $scope.isRecording;
      delete $scope.har;
      delete $scope.curTab;
      updateBadge($scope.isRecording);
    }
  };

  $scope.recordToggle = function () {
    $scope.isRecording = !$scope.isRecording;
    chrome.storage.local.set({isRecording: $scope.isRecording});
    updateBadge($scope.isRecording);
  };

  $scope.toggleSelect = function(requestId){
    console.log('clicked');
    console.log(requestId);
    var idx=-1;
    if ( (idx=$scope.selectedRequestIds.indexOf(requestId))>-1){
      $scope.selectedRequestIds.splice(idx,1);
    }else{
      $scope.selectedRequestIds.push(requestId);
    }
  };

  $scope.diff = function(tabId){
    chrome.tabs.create(
      {
        'url': 'chrome-extension://'+ chrome.runtime.id +'/diff.html?' +
        'requestIds=' +$scope.selectedRequestIds.toString()+
        '&tabId=' +tabId
      },
      function(tab){
        console.log(tab.windowId);
        chrome.windows.update(tab.windowId, {focused:true})
      }
    );
  };

  $scope.goToHelpPage = function(){
    chrome.tabs.create(
      {
        'url': 'chrome-extension://'+ chrome.runtime.id +'/help.html'
      },
      function(tab){
        chrome.windows.update(tab.windowId, {focused:true})
      }
    );
  };
}]);