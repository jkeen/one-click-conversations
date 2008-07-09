// ==UserScript==
// @name          One Click Conversations for GMail
// @namespace      http://www.jeffreykeen.com/projects/oneclickconversations
// @description   Access recent conversations in one painless click.
// @include        http://mail.gmail.com/*
// @include        https://mail.gmail.com/*
// @include        http://mail.google.com/*
// @include        https://mail.google.com/*
// ==/UserScript==

/* 
### Author: Jeff Keen - http://www.jeffreykeen.com

	This is a hybrid release, meant to function during the transition from Gmail V1 -> Gmail V2.  As of 12/14/07, there 
	are still lots of users not using V2, and as far as I know, Google Apps for your Domain hasn't been updated yet to
	support the new Gmail V2 features.
	
###	Features, as of latest release (For Gmail V2 users): ----------------------------------------------

	 + Adds icon just to the left of sender name in list view and in message view
	    + Clicking on icon takes you to the recent conversations with that user	
		+ Option-clicking the icon searches for all messages from the sender's domain.

### Version History:
       1.0   - 12.29.2006 - Initial Release
       1.1.0 - 12.30.2006 - One bug fix turned into major restructuring.  
       1.1.1 - 01.17.2007 - Checks if chat is enabled to prevent icons from showing up without any functionality.
       1.1.2 - 04.06.2007 - I changed the name from Quicker Contacts to One Click Conversations, a name that better describes what the main use of this script is.  
       1.1.3 - 04.19.2007 - The script now alerts you if chat isn't enabled, and provides a link to enable it.
       1.2.0 - 06.20.2007 - Fixed logic after google changed their code.
		                  - Added rollover image to icon as well as tooltip, to make it more obvious that it's clickable.
	   1.2.1 - 07.03.2007 - Fixed slight bug which occurred when clicking "Expand All" in message view.  
	                      - Changed XPath function to allow Opera Support.
						  - Fixed bug (due to changed Google code) so clicking on the icon wouldn't pull up messages to and from yourself in the case of multiple replies.
	   1.2.2 - 08.28.2007 - Added more event listeners to ensure that icons get reapplied after an event (deleting a message, for instance).
	   2.0	 - 12.14.2007 - Rewrote script to add support for GMail V2, using Google's API. 
	   2.1   - 7.4.2008   - Added better cleanup of old event listeners, reduced event listeners by 2/3 which should decrease memory use

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

const MASTHEAD_EMAIL_DIV_CLASS='nQ6QTe';
const LIST_TR_CLASS='xweT7d';
const LIST_EMAIL_SPAN_CLASS='k62PNc';
const LIST_EMAIL_SPAN_BOLD_CLASS='qNUdo';
const LIST_EMAIL_SPAN_TD_CLASS='f66Vyf';
const CONV_FROM_SPAN_CLASS='HcCDpe';
const CONV_IMG_SPAN_CLASS='JDpiNd';
const CONV_TO_SPAN_CLASS='HcCDpe';
const CONV_ADDRESS_TABLE= 'BwDhwd';
const CONV_IMG_ID = 'upi';

var css = "span.oneclick{background: transparent url(" + PERSON_IMAGE + ")  left no-repeat; display:inline-block; text-align:right; padding-right:5px; width:10px; height:10px;} span.oneclick:hover{background: transparent url(" + PERSON_IMAGE_OVER + ")  left no-repeat;}";
if (typeof GM_addStyle != "undefined") {
	GM_addStyle(css);
} else if (typeof addStyle != "undefined") {
	addStyle(css);
} else {
	var heads = document.getElementsByTagName("head");
	if (heads.length > 0) {
		var node = document.createElement("style");
		node.type = "text/css";
		node.appendChild(document.createTextNode(css));
		heads[0].appendChild(node); 
	}
}

var iconListeners=[];
var currentPage;

window.addEventListener('load', function() {
  if (unsafeWindow.gmonkey) {
    unsafeWindow.gmonkey.load('1.0', function(gmail) {	
    
		function evalXPath(expression, rootNode) {
		  try {
			var xpathIterator = rootNode.ownerDocument.evaluate(
			  expression,
			  rootNode,
			  null, // no namespace resolver
			  XPathResult.ORDERED_NODE_ITERATOR_TYPE,
			  null); // no existing results
		  } catch (err) {
			GM_log("Error when evaluating XPath expression '" + expression + "'" +
				   ": " + err);
			return null;
		  }
		  var results = [];
		
		  // Convert result to JS array
		  for (var xpathNode = xpathIterator.iterateNext(); xpathNode; xpathNode = xpathIterator.iterateNext()) {
  			results.push(xpathNode);
		  }
			
		  return results;
		}
		
		function addIcons() {
			/* Calls appropriate functions for adding One Click icon, based on active view */
			var $view=gmail.getActiveViewType();
			if ($view == 'cv') { //conversation view
				listen(false);
				modConversationView();
				listen(true);
			}
			else if ($view == 'tl') { //list view
				listen(false);
				modListView();
				listen(true);
			}
			toggleListeners(gmail.getActiveViewElement());
		}
	
	  function toggleListeners(page) {
	    var view_id = page.getAttribute('view_id');
	    if (currentPage) turnOffListeners(iconListeners[view_id]);
			currentPage = gmail.getActiveViewElement();
			turnOnListeners(iconListeners[view_id]);
			removeOrphans();
	  }
	
		function listen(bool) {
			var root=gmail.getActiveViewElement();
			if (bool==true) {		
				root.addEventListener("DOMNodeInserted", addIcons, false); 		
			}
			if (bool==false) {
				root.removeEventListener("DOMNodeInserted", addIcons, false); 
			}
		}
	
		function getMyEmailAddress() {
			/* get our address, so we don't create link to ourself in the case of conversations */
			try {
				var masthead=gmail.getMastheadElement();		
				var results=evalXPath(".//div[@class='" + MASTHEAD_EMAIL_DIV_CLASS + "']//b",masthead);
				var myAddress=results[0].innerHTML;
			} 
			catch (e) {}
			return myAddress;
		}
			
		function jumpToConversation (e) {
			if (!e) var e = window.event;
			var searchterm=this.getAttribute('searchterm');			

			if (e.altKey) {
				/* if alt/option key is down, search based on domain. */
				var terms=searchterm.split('@');
				if (terms.length>1) {
					searchterm="*@" + terms[1];
				}
			}
			top.location.hash="#search/" + encodeURIComponent("from:" + searchterm + " OR to:" + searchterm);
			
			/* Cancel the other events after this one.  This prevents gmail from loading a message from our click event. */
			e.preventDefault();
			e.cancelBubble = true;
			if (e.stopPropagation) e.stopPropagation();
			return false;
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
		
		function trackIcon(page, element) {
		  var listeners = [];
		  if (key = page.getAttribute('view_id')) {
        listeners = iconListeners[key];
		  }
		  else {
		    key = "vid_" + parseInt(Math.random() * 10000000, 10);
		    page.setAttribute('view_id', key);
		  }
		  listeners.push(element);
		  iconListeners[key] = listeners;
		}
		
		function removeIconListener(element) {
		  element.removeEventListener('mousedown', jumpToConversation, false);
		}
		
		function turnOffListeners(array) {
		  for (var i=0; i < array.length; i++) {
		    array[i].removeEventListener('mousedown', jumpToConversation, false);
		  }
		}
		
		function turnOnListeners(array) {
		  for (var i=0; i < array.length; i++) {
		    array[i].addEventListener('mousedown', jumpToConversation, false);
		  }
		}
		
		function removeOrphans() {
		  for (var id in iconListeners) {
		     if ((document.getElementById('canvas_frame')) && (!document.getElementById('canvas_frame').contentDocument.getElementById(id))) {
		       turnOffListeners(iconListeners[page]);
		       delete iconListeners[page];
		     }
		  }
		}
		
	  function isModified(message) {
			return (message.innerHTML.match(/class=\"oneclick\"/));
	  }
	
		function modListView() {
			var myEmailAddress=getMyEmailAddress();
			var page = gmail.getActiveViewElement();
      /* find all message objects, that haven't already been modified */
			var messages = evalXPath("//tr[count(.//span[@class='oneclick'])=0][contains(@class, '" + LIST_TR_CLASS + "')]", page);
			for (i=0; i<messages.length; i++) {	
				/* Check if we have already modified this message.  This is a paranoia check.  Recursion on this thing gets ugly. */
				if (!isModified(messages[i])) {	
					/* find the first email that isn't ours, corresponding to this message */
					var email_address = evalXPath(".//span[@class='" + LIST_EMAIL_SPAN_CLASS + "' or " +	"@class='" + LIST_EMAIL_SPAN_BOLD_CLASS + "'][@email!='" + myEmailAddress + "'][1]/@email", messages[i]);

					var searchterm="";
					try { searchterm=email_address[0].nodeValue; } catch (e) { }
					
					if (searchterm == "undefined") 	searchterm=myEmailAddress; //an error occurred, or it was an email to ourselves
					else if (searchterm=="") 	searchterm=myEmailAddress;
					
					/* Insert the span right before the sender name */		
					var icon = createClickSpan(searchterm);
					messages[i].childNodes[2].firstChild.insertBefore( icon,  messages[i].childNodes[2].firstChild.firstChild );
					trackIcon(page, icon);
				}
			}
		}

		function modConversationView() {
		  var page = gmail.getActiveViewElement();
			var messages= evalXPath(".//span[@email]", page);
			for (i=0;i<messages.length;i++) {	
				var searchterm=messages[i].getAttribute('email'); // get email from element				
				if (!isModified(messages[i])) {
				  var icon = createClickSpan(searchterm);
				  icon.setAttribute('style', 'padding-right:3px');
					messages[i].insertBefore(icon,messages[i].childNodes[0]);
					trackIcon(page, icon);
				}
			}
			
			
			messages= evalXPath(".//span[@class = '" + CONV_TO_SPAN_CLASS + "'][count(.//span[@class='oneclick'])=0]//span[@class = '" + CONV_IMG_SPAN_CLASS + "']", page);
			for (i=0;i<messages.length;i++) {	
			  
			  ////img[@id = '" + CONV_IMG_ID + "']
			  searchterm=messages[i].childNodes[0].getAttribute('jid');
			  if (searchterm) {
			    var text = messages[i].parentNode.textContent;
          var icon = createClickSpan(searchterm);
          icon.setAttribute('style', 'padding-right:3px');
          messages[i].parentNode.insertBefore(icon, messages[i].nextSibling);
          trackIcon(page, icon);
			  }
		  }
		} 
	
  	gmail.registerViewChangeCallback(addIcons);
	  listen(true);
	  addIcons();
    });
  }
}, true);