'use strict';

var app = angular.module('Diff', ['ui.bootstrap', 'ui.bootstrap.popover']);

Array.prototype.unique = function () {
  var arr = [];
  for (var i = 0; i < this.length; i++) {
    if (arr.indexOf(this[i]) < 0) {
      arr.push(this[i]);
    }
  }
  return arr;
};

function parseUrl(url) {
  try {
    var urlObject = new URL(url);
  } catch (e) {
    return {};
  }
  var r = {};
  r.origin = urlObject.origin;
  var pathname = urlObject.pathname;
  var pathnameParts = pathname.split('/');
  r.reportSuites = pathnameParts[3];
  r.visitorIdMethod = pathnameParts[4];
  r.libraryVersion = pathnameParts[5];
  r.uniqueNumber = pathnameParts[6];

  var searchString = ( urlObject.search );
  var contextString =  searchString.match(/&c\.(.+)&\.c/)?searchString.match(/&c\.(.+)&\.c/)[1]:'';
  searchString = searchString.replace(/&c\..+&\.c/, '');

  var contextParts = contextString.split('&');
  for (var i = 1; i < contextParts.length; i++) {
    var pair = contextParts[i].split('=');
    r['context_' + pair[0]] = decodeURIComponent(pair[1]);
  }

  var searchParts = searchString.split('&');
  for (i = 0; i < searchParts.length; i++) {
    pair = searchParts[i].split('=');
    if (!pair[0] || pair[0].length < 1) continue;

    if (pair[0].match(/l\d+/)) {
      var listValues = decodeURIComponent(pair[1]).split(',');
      for (var j = 0; j < listValues.length; j++) {
        r[pair[0] + '_' + j] = listValues[j];
      }
    } else {
      r[pair[0]] = decodeURIComponent(pair[1]);
    }
  }
  return r;
}

function updateDiffData($scope, requestIds) {
  var batch = [];
  requestIds = requestIds || $scope.requestIds;
  $scope.diffData = [];
  $scope.diffKeys = [];
  $scope.requestMap = {};
  $scope.tabIds = [];
  var requests = $scope.requests = [];

  for (var i = 0; i < ($scope.har || []).length; i++) {
    requests = requests.concat($scope.har[i]);
  }

  for (i = 0; i < requests.length; i++) {
    $scope.requestMap[requests[i].requestId] = requests[i];
    $scope.tabIds.push(requests[i].tabId);

    if (requestIds.indexOf(requests[i].requestId) > -1) {
      console.log(requests[i].requestId);
      var parsed = parseUrl(requests[i].url);
      parsed._requestId = requests[i].requestId;
      $scope.diffData.push(parsed);
      $scope.diffKeys = $scope.diffKeys.concat(Object.keys(parsed));
    }
  }


  $scope.tabIds = $scope.tabIds.unique();
  $scope.requests = requests;
  $scope.diffKeys = $scope.diffKeys.unique().sort();
}

app.filter('decodeURIComponent', function () {
  return window.decodeURIComponent;
});

app.controller('DiffCtrl', ['$scope', '$filter', '$location', function ($scope, $filter, $location) {
  window.scope = $scope;
  $scope.diffKeys = [];
  $scope.diffData = [];
  $scope.tabUrl = [];
  $scope.tabId = (window.location.search.match(/tabId=(\d*)/) || [-1, -1])[1];
  $scope.requestIds = window.location.search.match(/requestIds=((\d*,?)+)/)[1].split(',');
  $scope.parseUrl = parseUrl;

  $scope.aaKeys = {
    uniqueNumber: {description: 'Prevents caching issues.', volatile: true},
    visitorIdMethod: {description: 'Shows what number is in this part of the string: /b/ss/RSID/[here]/, which determines if the user is coming from Mobile, Javascript, XML... See Adobe help for more info.'},
    AQB: {description: 'Indicates the beginning of an image request.'},
    ndh: {description: 'Indicates whether the image request originated from JS file (1 or 0).'},
    pf: {description: 'Purpose unknown'},
    t: {description: 'Timestamp', volatile: true},
    mid: {description: 'Identification taken from the Visitor ID service API.'},
    aamlh: {description: 'Has to do with Audience Manager integration.'},
    ce: {description: 'The character encoding of the image request.'},
    ns: {description: 'May specify what domain the cookies are set on, depending on other settings.'},
    pageName: {description: 'The identifier for the pageView, as seen in \'Pages\' reports.'},
    g: {description: 'The URL for the current page. By default, this does not feed directly into any report.'},
    cc: {description: 'The type of currency used on the site.'},
    ch: {description: 'The site section.'},
    aamb: {description: 'Used with the Audience Manager integration.'},
    s: {description: 'Screen resolution (width x height)'},
    c: {description: 'Color quality (in bits)'},
    j: {description: 'Shows the current Javascript version installed (generally 1.x)'},
    v: {description: 'JavaScript enabled (Y or N)'},
    k: {description: 'Are cookies supported in the browser (Y, N or U)'},
    bw: {description: 'Browser window width (in pixels)'},
    bh: {description: 'Browser window height (in pixels)'},
    AQE: {description: 'Indicates the end of an image request.'}
  };

  chrome.storage.local.get(['har'], function (result) {
    $scope.$apply(function (s) {
      s.har = result.har || [];
      updateDiffData($scope);
    });
  });

  $scope.$watchCollection('requestIds', function (updatedIds, oldIds) {
    updateDiffData($scope, updatedIds);
  });

  $scope.compareRows = function (key) {
    var diffData = $scope.diffData;
    var equals = true;
    var val;
    for (var i = 0; i < diffData.length; i++) {
      if ($scope.aaKeys[key] && $scope.aaKeys[key].volatile) return true;
      if (diffData[i] !== null && i > 0) {
        equals = equals && val === diffData[i][key];
      }
      val = diffData[i][key];
    }
    return equals;
  };

  $scope.updateTabUrl = function () {
    var tabId = $scope.tabId;
    if (!tabId || !(typeof tabId !== 'string' || typeof tabId !== 'number')) {
      $scope.tabUrl = 'N/A';
      return;
    }
    tabId = typeof tabId == 'string' ? Number.parseInt(tabId) : tabId;
    chrome.tabs.get(tabId, function (tab) {
      if (chrome.runtime.lastError) {
        $scope.$apply(function (s) {
          s.tabUrl = 'Tab no longer available';
          s.tabObject = null;
        });
        return;
      }
      console.log(tab.url);
      $scope.tabObject = tab;
      $scope.$apply(function (s) {
        s.tabUrl = tab.url + ' - ' + tab.title;
      });
    });
  };
  $scope.updateTabUrl();

  $scope.goToTab = function (tabId) {
    tabId = typeof tabId == 'string' ? Number.parseInt(tabId) : tabId;

    chrome.tabs.update(tabId, {selected: true}, function (tab) {
      if (chrome.runtime.lastError) {
        console.log('tab not found');
        return;
      }
      chrome.windows.update(tab.windowId, {focused: true}, function (tab) {

        console.log('success');

      })
    });
  };

  $scope.toggleRequestCb = function (requestId) {
    var idx = -1;
    if ((idx = $scope.requestIds.indexOf(requestId)) > -1) {
      $scope.requestIds.splice(idx, 1);
    } else {
      $scope.requestIds.push(requestId);
    }
  };

}]);