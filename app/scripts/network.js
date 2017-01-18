chrome.devtools.network.onRequestFinished.addListener(function(har) {
  if (har.request.url.indexOf('b/ss')<0) return;
  headers = har.response.headers;
  var requestId = headers.find(function(x) { return x.name.toLowerCase() == 'x-request-id' });
  var url = document.createElement('div');
  url.innerHTML=JSON.stringify(decodeURIComponent(har.request.url)+'<br>');
  document.body.appendChild(url);
});