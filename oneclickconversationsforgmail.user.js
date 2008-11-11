// ==UserScript==
// @name           One Click Conversations for GMail
// @namespace      http://www.jeffreykeen.com/projects/oneclickconversations
// @description    Access recent conversations in one painless click.
// @include       http://mail.google.com/*
// @include       https://mail.google.com/*
// ==/UserScript==
/*

### Author: Jeff Keen - http://www.jeffreykeen.com
	
###	Features, as of latest release (For Gmail V2 users): ----------------------------------------------

  + Adds icon just to the left of sender name in list view and in message view
    + Clicking on icon takes you to the recent conversations with that user	
  + Option-clicking the icon searches for all messages from the sender's domain.
  
### Testing
  + Works in Firefox 2 & 3 (with greasemonkey), and Safari (with greasekit)

### Version History:
   2.0	 - 12.14.2007 - Rewrote script to add support for GMail V2, using Google's API. 
   2.1   - 9.8.2008   - Added better cleanup of old event listeners, and reduced use of event listeners dramatically, which improves memory usage
                      - Added support for Greasekit/Safari, and even aligned some misaligned elements in gmail while I was in there
                      - Fixed 'back button' bug, and at a minimum improved matters regarding the Remember The Milk conflict
*/
const CLOCK_IMAGE = "data:image/gif;base64,R0lGODlhCgAKAKIAADMzM//M/7CwsGZmZv///8fHxwAAAAAAACH5BAEHAAEALAAAAAAKAAoAAAMpGDo8+kOUItwqJJPioh5ZNWAEmHHjdzKCRrRVAJAn8AASZT/BAACWQAIAOw==";
const PERSON_IMAGE_OVER = "data:image/gif;base64,R0lGODlhCgAKALMAADMzM//M/9LS0mZmZrm5ue7u7v///+rq6t3d3QAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAACH5BAEHAAEALAAAAAAKAAoAAAQpMMhBh7xDGCMsPtvhTaAhXkF2HB2aEsQ4ITQyDkWNFB5e" +
"/D8PYEgcBiIAOw==";
const PERSON_IMAGE = "data:image/gif;base64,R0lGODlhCgAKAPcAAAAAAKzT/gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAAP8ALAAAAAAKAAoA" +
"AAgkAP8JDEAwgMCDBhEe/Jdw4MKGDB9KnAgxokKHCy1W1Fiw47+AADs=";

const MASTHEAD_EMAIL_DIV_CLASS = 'nQ6QTe';
const LIST_TR_CLASS = 'xweT7d';
const LIST_EMAIL_SPAN_CLASS = 'k62PNc';
const LIST_EMAIL_SPAN_BOLD_CLASS = 'qNUdo';
const LIST_EMAIL_SPAN_TD_CLASS = 'f66Vyf';
const CONV_FROM_SPAN_CLASS = 'HcCDpe';
const CONV_IMG_SPAN_CLASS = 'JDpiNd';
const CONV_TO_SPAN_CLASS = 'HcCDpe';
const CONV_ADDRESS_TABLE = 'BwDhwd';
const CONV_IMG_ID = 'upi';

const FIREFOX_3_STYLE =
"span.oneclick{background: transparent url(" + PERSON_IMAGE + ") left no-repeat; display:inline-block; text-align:right; padding-right:5px; width:10px; height:10px;}" +
"span.oneclick:hover{background: transparent url(" + PERSON_IMAGE_OVER + ")  left no-repeat;}";

const FIREFOX_2_STYLE =
"span.oneclick{background: transparent url(" + PERSON_IMAGE + ") left no-repeat; display:inline-block; text-align:right; padding-right:15px!important; padding-top:1px; width:10px!important; height:10px;}" +
"span.oneclick:hover{background: transparent url(" + PERSON_IMAGE_OVER + ")  left no-repeat;}" +
"h3.EP8xU span.oneclick, span.EP8xU span.oneclick {padding-top:1px; padding-right:10px!important;}" +
"table.BwDhwd tr td.sA2K5 span.oneclick {padding-top:1px; padding-right:10px!important;}";

const SAFARI_STYLE =
"span.oneclick { background: transparent url(" + PERSON_IMAGE + ") top left no-repeat;}" +
"span.oneclick:hover { background: transparent url(" + PERSON_IMAGE_OVER + ")  left no-repeat;}" +
"span.oneclick{ padding-right:5px; display:inline-block; text-align:right; width:10px; height:10px;}" +
"h3.EP8xU span.oneclick{position:relative; top:0px; }" +
/* title 'from' */
"span.tQWRdd span.oneclick{position:relative; top:-4px; }" +
/* title 'to' */
"table.BwDhwd tr td.sA2K5 span.HcCDpe {position:relative; top:-4px; }" +
/* shift information up (shifts icons up too) */
"table.BwDhwd tr td.sA2K5 span.JDpiNd {position:relative; top:3px;}" +
/* shift online icon down */
"table.BwDhwd tr td.sA2K5 span.oneclick {position:relative; top:0px;}";
/* shift oneclick icon down */

const DEBUG = true;
const LOG_ERRORS = true;

var iconListeners = [];
var currentPage = null;
var gmail = null;
 
var BrowserDetect={init:function(){this.browser=this.searchString(this.dataBrowser)||"An unknown browser";this.version=this.searchVersion(navigator.userAgent)||this.searchVersion(navigator.appVersion)||"an unknown version";this.OS=this.searchString(this.dataOS)||"an unknown OS"},searchString:function(data){for(var i=0;i<data.length;i++){var dataString=data[i].string;var dataProp=data[i].prop;this.versionSearchString=data[i].versionSearch||data[i].identity;if(dataString){if(dataString.indexOf(data[i].subString)!=-1)return data[i].identity}else if(dataProp)return data[i].identity}},searchVersion:function(dataString){var index=dataString.indexOf(this.versionSearchString);if(index==-1)return;return parseFloat(dataString.substring(index+this.versionSearchString.length+1))},dataBrowser:[{string:navigator.userAgent,subString:"OmniWeb",versionSearch:"OmniWeb/",identity:"OmniWeb"},{string:navigator.vendor,subString:"Apple",identity:"Safari"},{prop:window.opera,identity:"Opera"},{string:navigator.vendor,subString:"iCab",identity:"iCab"},{string:navigator.vendor,subString:"KDE",identity:"Konqueror"},{string:navigator.userAgent,subString:"Firefox",identity:"Firefox"},{string:navigator.vendor,subString:"Camino",identity:"Camino"},{string:navigator.userAgent,subString:"Netscape",identity:"Netscape"},{string:navigator.userAgent,subString:"MSIE",identity:"Explorer",versionSearch:"MSIE"},{string:navigator.userAgent,subString:"Gecko",identity:"Mozilla",versionSearch:"rv"},{string:navigator.userAgent,subString:"Mozilla",identity:"Netscape",versionSearch:"Mozilla"}],dataOS:[{string:navigator.platform,subString:"Win",identity:"Windows"},{string:navigator.platform,subString:"Mac",identity:"Mac"},{string:navigator.platform,subString:"Linux",identity:"Linux"}]};
BrowserDetect.init();
  
if (typeof GM_log === "undefined") {
  function GM_log(log) {
    if (console) console.log(log);
    else alert(log);
  }
}

function debug(msg) {  if (DEBUG) GM_log(msg); }
function error(msg) {  if (LOG_ERRORS) GM_log("ERROR:" + msg); }

/* Add Styles */
var browser = [BrowserDetect.browser, BrowserDetect.version, BrowserDetect.os]
var occStyle;

if ((browser[0] == "Firefox") && (browser[1] == "3")) occStyle=FIREFOX_3_STYLE;
else if ((browser[0] == "Firefox") && (browser[1] == "2")) occStyle=FIREFOX_2_STYLE;
else if (browser[0] == "Safari") occStyle=SAFARI_STYLE;
else occStyle=FIREFOX_3_STYLE;

if (typeof GM_addStyle != "undefined") { GM_addStyle(occStyle); } 
else if (typeof addStyle != "undefined") { addStyle(occStyle); } 
else {
  var heads = document.getElementsByTagName("head");
  if (heads.length > 0) {
    var node = document.createElement("style");
    node.type = "text/css";
    node.appendChild(document.createTextNode(occStyle));
    heads[0].appendChild(node);
  }
}

function getViewElement() {
  try {
     return gmail.getActiveViewElement();
   }
   catch(e) {
     error("gmail.getActiveViewType() returned an error: " + e);
   }
}

function getViewType() {
  try {
    return gmail.getActiveViewType();
  }
  catch(e) {
    error("gmail.getActiveViewType() returned an error: " + e);
  }
}
  
function evalXPath(expression, rootNode) {
  debug("<evalXPath expression = " + expression + " rootNode=" + rootNode + ">");
  try {
      var xpathIterator = rootNode.ownerDocument.evaluate(expression, rootNode, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
  } 
  catch(e) {
      error("evalXPath errored: '" + expression + "'" + ": " + e);
      return null;
  }
  var results = [];

  // Convert result to JS array
  for (var xpathNode = xpathIterator.iterateNext(); xpathNode; xpathNode = xpathIterator.iterateNext()) {
      results.push(xpathNode);
  }

  debug("</evalXPath>");
  return results;
}

function listen(bool) {
  debug("<listen bool = " + bool + ">");
  var root = getViewElement();
  if (bool) root.addEventListener("DOMNodeInserted", addIcons, false);
  else root.removeEventListener("DOMNodeInserted", addIcons, false);
  debug("</listen>");
}

function toggleListeners(page) {
   debug("<toggleListeners page = " + page + ">");
   try {
    if (page) {
      var view_id = page.getAttribute('view_id');
      if (currentPage) turnOffListeners(iconListeners[view_id]);
      currentPage = getViewElement();
      turnOnListeners(iconListeners[view_id]);
      removeOrphans();
    }
    else {
      debug("page was null");
    }

  }
  catch(e) {
    error("toggleListeners errored: " + e);
  }
  debug("</toggleListeners>");                
}

function turnOffListeners(array) {
  debug("<turnOffListeners>");              
  try {
    for (var i = 0; i < array.length; i++) {
        array[i].removeEventListener('mousedown', jumpToConversation, true);
    }
  }
  catch(e) {
    error("turnOffListeners errored: " + e);
  }
  debug("</turnOffListeners>");
}

function turnOnListeners(array) {
    debug("<turnOnListeners>");
    try {
      for (var i = 0; i < array.length; i++) {
          array[i].addEventListener('mousedown', jumpToConversation, true);
      }
    }
    catch(e) {
      error("turnOnListeners errored: " + e);
    }
    debug("</turnOnListeners>");  
}

function removeIconListener(element) {
    element.removeEventListener('mousedown', jumpToConversation, true);
}

function removeOrphans() {
    debug("<removeOrphans>");
     try {
      for (var id in iconListeners) {
        var query = evalXPath("//div[@vid='" + id + "']", gmail.getCanvasElement());
        if (!query) {
          error("can't find vid=" + id);
          turnOffListeners(iconListeners[id]);
          delete iconListeners[id];
        }
      }
    }
    catch(e) {
      error("removeOrphans errored: " + e);
    }
    debug("</removeOrphans>");
}

function trackIcon(page, element) {
    debug("<trackIcon page = " + page + " element = " + element + ">");
    try {
        /* keep track of icons per page, so we can add/remove listeners effectively */
      var listeners = [];
      if (key = page.getAttribute('view_id')) {
        listeners = (iconListeners[key] || []);
      }
      else {
        key = "vid_" + parseInt(Math.random() * 10000000, 10);
        page.setAttribute('view_id', key);
      }
      listeners.push(element);
      iconListeners[key] = listeners;
      debug("iconListeners[" + key + "] = " + listeners);
    }
    catch(e) {
        error("trackIcon errored: " + e);
    }
    debug("</trackIcon>");
}

function isModified(message) {
    return (message.innerHTML.match(/class="oneclick"/));
}

function getMyEmailAddress() {
    debug("<getMyEmailAddress>");
    try {
      /* get our address, so we don't create link to ourself in the case of conversations */
      try {
          var masthead = gmail.getMastheadElement();
          var results = evalXPath(".//div[@class='" + MASTHEAD_EMAIL_DIV_CLASS + "']//b", masthead);
          var myAddress = results[0].innerHTML;
      }
      catch(e) {
        error("getMyEmailAddress errored: " + e);
      }
      return myAddress;              
    }
    catch(e) {
      error("getMyEmailAddress errored: " + e);
    }
    debug("</getMyEmailAddress>");   
}

function jumpToConversation(e) {
    debug("<jumpToConversation>");
    try {
      if (!e) var e = window.event;
      var searchterm = this.getAttribute('searchterm');
      debug("found search term = " + searchterm);
      if (e.altKey) {
          /* if alt/option key is down, search based on domain. */
          var terms = searchterm.split('@');
          if (terms.length > 1) {
              searchterm = "*@" + terms[1];
          }
      }
      top.location.hash = "#search/" + "from%3A" + encodeURIComponent(searchterm) + "+OR+to%3A" + encodeURIComponent(searchterm);

      /* Cancel the other events after this one.  This prevents gmail from loading a message from our click event. */
      e.preventDefault();
      e.cancelBubble = true;
      if (e.stopPropagation) e.stopPropagation();
      return false;
    }
    catch(e) {
      error("jumpToConversation errored: " + e);
    }
    debug("</jumpToConversation>");
}

function createClickSpan(searchterm) {
    var clickSpan = document.createElement("span");

    clickSpan.setAttribute("class", "oneclick");
    clickSpan.setAttribute("title", "View Recent Conversations");
    clickSpan.setAttribute('searchterm', searchterm);
    clickSpan.setAttribute('id', "occ_" + parseInt(Math.random() * 10000000, 10));
    clickSpan.textContent = " ";
    return clickSpan;
}

function addIcons() {
    debug("<addIcons>");
    try {
        /* Calls appropriate functions for adding One Click icon, based on active view */
        var type = getViewType();
        var view = getViewElement();
        if (type == 'cv') {
            //conversation view
            listen(false);
            modConversationView();
            listen(true);
        }
        else if (type == 'tl') {
            //list view
            listen(false);
            modListView();
            listen(true);
        }
        toggleListeners(view);
    }
    catch(e) {   
        error("addIcons errored: " + e);
    }
    debug("</addIcons>");
}

function modListView() {
    debug("<modListView>");                
    var myEmailAddress = getMyEmailAddress();
    var page = getViewElement();
    /* find all message objects, that haven't already been modified */
    var messages = evalXPath("//tr[count(.//span[@class='oneclick'])=0][contains(@class, '" + LIST_TR_CLASS + "')]", page);
    for (i = 0; i < messages.length; i++) {
        /* Check if we have already modified this message.  This is a paranoia check.  Recursion on this thing gets ugly. */
        if (!isModified(messages[i])) {
            /* find the first email that isn't ours, corresponding to this message */
            var email_address = evalXPath(".//span[@class='" + LIST_EMAIL_SPAN_CLASS + "' or " + "@class='" + LIST_EMAIL_SPAN_BOLD_CLASS + "'][@email!='" + myEmailAddress + "'][1]/@email", messages[i]);

            var searchterm = "";
            try {
                searchterm = email_address[0].nodeValue;
            } catch(e) {}

            if (searchterm == "undefined") searchterm = myEmailAddress;
            //an error occurred, or it was an email to ourselves
            else if (searchterm == "") searchterm = myEmailAddress;

            /* Insert the span right before the sender name */
            var icon = createClickSpan(searchterm);
            messages[i].childNodes[2].firstChild.insertBefore(icon, messages[i].childNodes[2].firstChild.firstChild);
            trackIcon(page, icon);
        }
    }
    debug("</modListView>");
}

function modConversationView() {
    debug("<modConversationView>");

    var myEmail = getMyEmailAddress();
    var page = getViewElement();

    var messages = evalXPath(".//span[@email]", page);
    for (i = 0; i < messages.length; i++) {
        var searchterm = messages[i].getAttribute('email');
        // get email from element				
        if (!isModified(messages[i])) {
            var icon = createClickSpan(searchterm);
            icon.setAttribute('style', 'padding-right:3px');
            messages[i].insertBefore(icon, messages[i].childNodes[0]);
            trackIcon(page, icon);
        }
    }

    messages = evalXPath(".//span[@class = '" + CONV_TO_SPAN_CLASS + "'][count(.//span[@class='oneclick'])=0]//span[@class = '" + CONV_IMG_SPAN_CLASS + "']", page);
    for (i = 0; i < messages.length; i++) {
        searchterm = messages[i].childNodes[0].getAttribute('jid');
        if (searchterm) {
            var text = messages[i].parentNode.textContent;
            var icon = createClickSpan(searchterm);
            icon.setAttribute('style', 'padding-right:3px');
            messages[i].parentNode.insertBefore(icon, messages[i].nextSibling);
            trackIcon(page, icon);
        }
    }
    debug("</modConversationView>");
}

var loadPoller;
function loader() {
    clearTimeout(loadPoller); 
    var api = typeof unsafeWindow != "undefined" && unsafeWindow.gmonkey || (frames.js ? frames.js.gmonkey : null);
    if (api) {
      debug("got gmonkey handle");
      api.load("1.0", function(g) {
        debug("api is loaded");
        gmail = g;
        g.registerViewChangeCallback(addIcons);
        addIcons();
      });
    }
    else {
      // Sometimes some shit goes down, and we need to prepare for it
      debug("OCC didn't load, will try again");
      if (!loadPoller) loadPoller = window.setTimeout(loader, 500);
    }
}
document.addEventListener("load", function() { window.setTimeout(loader, 500); loader(); }, true);
window.addEventListener("load", function() { window.setTimeout(loader, 500); loader(); }, true);