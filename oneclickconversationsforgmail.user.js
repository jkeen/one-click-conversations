// ==UserScript==
// @name           One Click Conversations for GMail
// @namespace      http://www.jeffreykeen.com/projects/oneclickconversations
// @description    Access recent conversations in one painless click.
// @include        http://mail.gmail.com/*
// @include        https://mail.gmail.com/*
// @include        http://mail.google.com/*
// @include        https://mail.google.com/*
// ==/UserScript==

/*

### Author: Jeff Keen - http://www.jeffreykeen.com
	
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
   2.1   - 7.4.2008   - Added better cleanup of old event listeners, and reduced use of event listeners dramatically, which improves memory usage.  Added more icons in more places.
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

const DEBUG = true;
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

window.OneClickConversations = { 
    iconListeners: [],
    currentPage: null,
    gmail:null,
		evalXPath: function(expression, rootNode) {
		  try {
			var xpathIterator = rootNode.ownerDocument.evaluate(
			  expression,
			  rootNode,
			  null, // no namespace resolver
			  XPathResult.ORDERED_NODE_ITERATOR_TYPE,
			  null); // no existing results
		  } catch (err) {
			GM_log("Error when evaluating XPath expression '" + expression + "'" + ": " + err);
			return null;
		  }
		  var results = [];
		
		  // Convert result to JS array
		  for (var xpathNode = xpathIterator.iterateNext(); xpathNode; xpathNode = xpathIterator.iterateNext()) {
  			results.push(xpathNode);
		  }
			
		  return results;
		},
	
		listen: function(bool) { 
		  if (DEBUG) { GM_log("<listen bool = " + bool + ">"); }
			var root=this.gmail.getActiveViewElement();
			if (bool)	root.addEventListener("DOMNodeInserted", this.addIcons, false); 		
			else root.removeEventListener("DOMNodeInserted", this.addIcons, false);
  		if (DEBUG) { GM_log("</listen>"); } 
		},
	
	  toggleListeners: function(page) {
	    var view_id = page.getAttribute('view_id');
	    if (this.currentPage) this.turnOffListeners(this.iconListeners[view_id]);
			currentPage = this.gmail.getActiveViewElement();
			this.turnOnListeners(this.iconListeners[view_id]);
			this.removeOrphans();
	  },
		
		turnOffListeners: function(array) {
		  for (var i=0; i < array.length; i++) {
		    array[i].removeEventListener('mousedown', this.jumpToConversation, false);
		  }
		},
		
		turnOnListeners: function(array) {
		  for (var i=0; i < array.length; i++) {
		    array[i].addEventListener('mousedown', this.jumpToConversation, false);
		  }
		},
		
		removeIconListener: function(element) {
		  element.removeEventListener('mousedown', this.jumpToConversation, false);
		},
				
		removeOrphans: function() {
		  for (var id in this.iconListeners) {
		     if ((document.getElementById('canvas_frame')) && (!document.getElementById('canvas_frame').contentDocument.getElementById(id))) {
		       this.turnOffListeners(this.iconListeners[page]);
		       delete this.iconListeners[page];
		     }
		  }
		},
		
		trackIcon: function(page, element) {
		  /* keep track of icons per page, so we can add/remove listeners effectively */
		  var listeners = [];
		  if (key = page.getAttribute('view_id')) {
        listeners = this.iconListeners[key];
		  }
		  else {
		    key = "vid_" + parseInt(Math.random() * 10000000, 10);
		    page.setAttribute('view_id', key);
		  }
		  listeners.push(element);
		  this.iconListeners[key] = listeners;
		},
		
	  isModified: function(message) {
			return (message.innerHTML.match(/class=\"oneclick\"/));
	  },
			
		getMyEmailAddress: function() {
			/* get our address, so we don't create link to ourself in the case of conversations */
			try {
				var masthead=this.gmail.getMastheadElement();		
				var results=this.evalXPath(".//div[@class='" + MASTHEAD_EMAIL_DIV_CLASS + "']//b",masthead);
				var myAddress=results[0].innerHTML;
			} 
			catch (e) {}
			return myAddress;
		},
			
		jumpToConversation : function(e) {
			if (!e) var e = window.event;
			var searchterm=this.getAttribute('searchterm');			

			if (e.altKey) {
				/* if alt/option key is down, search based on domain. */
				var terms=searchterm.split('@');
				if (terms.length>1) {
					searchterm="*@" + terms[1];
				}
			}
			top.location.hash="#search/" + "from%3A" + encodeURIComponent(searchterm) + "+OR+to%3A" + encodeURIComponent(searchterm);
			
			/* Cancel the other events after this one.  This prevents gmail from loading a message from our click event. */
			e.preventDefault();
			e.cancelBubble = true;
			if (e.stopPropagation) e.stopPropagation();
			return false;
		},	
			
		createClickSpan: function(searchterm) {
      var clickSpan = document.createElement("span");
    
      clickSpan.setAttribute("class", "oneclick");  
      clickSpan.setAttribute("title", "View Recent Conversations");
      clickSpan.setAttribute('searchterm', searchterm); 
      clickSpan.setAttribute('id', "occ_" + parseInt(Math.random() * 10000000, 10));
      clickSpan.textContent = " ";
      return clickSpan;
		},
			
		addIcons: function() {
			/* Calls appropriate functions for adding One Click icon, based on active view */
			if (DEBUG) { GM_log("<addIcons>"); }
			var view = this.gmail.getActiveViewType();
			if (view == 'cv') { //conversation view
				this.listen(false);
				this.modConversationView();
				this.listen(true);
			}
			else if (view == 'tl') { //list view
				this.listen(false);
				this.modListView();
				this.listen(true);
			}
			this.toggleListeners(this.gmail.getActiveViewElement());
  		if (DEBUG) { GM_log("</addIcons>"); }			
		},
			
		modListView: function() {
		  if (DEBUG) { GM_log("<modListView>"); }
			var myEmailAddress=this.getMyEmailAddress();
			var page = this.gmail.getActiveViewElement();
			
      /* find all message objects, that haven't already been modified */
			var messages = this.evalXPath("//tr[count(.//span[@class='oneclick'])=0][contains(@class, '" + LIST_TR_CLASS + "')]", page);
			for (i=0; i<messages.length; i++) {	
				/* Check if we have already modified this message.  This is a paranoia check.  Recursion on this thing gets ugly. */
				if (!this.isModified(messages[i])) {	
				  try {
				   	/* find the first email that isn't ours, corresponding to this message */
  					var email_address = this.evalXPath(".//span[@class='" + LIST_EMAIL_SPAN_CLASS + "' or " +	"@class='" + LIST_EMAIL_SPAN_BOLD_CLASS + "'][@email!='" + myEmailAddress + "'][1]/@email", messages[i]);

  					var searchterm="";
  					try { searchterm=email_address[0].nodeValue; } catch (e) { }

  					if (searchterm == "undefined") 	searchterm=myEmailAddress; //an error occurred, or it was an email to ourselves
  					else if (searchterm=="") 	searchterm=myEmailAddress;

  					/* Insert the span right before the sender name */		
  					var icon = this.createClickSpan(searchterm);
  					messages[i].childNodes[2].firstChild.insertBefore( icon,  messages[i].childNodes[2].firstChild.firstChild );
  					this.trackIcon(page, icon); 
				  }
				  catch(e) {
				    GM_log(e);
				  }

				}
			}
			if (DEBUG) { GM_log("</modListView>"); }
		},

		modConversationView: function() {
		  if (DEBUG) { GM_log("<modConversationView>"); }  	  
		  var myEmail = this.getMyEmailAddress();
		  var page = this.gmail.getActiveViewElement();
			var messages= this.evalXPath(".//span[@email]", page);
			for (i=0;i<messages.length;i++) {	
				var searchterm=messages[i].getAttribute('email'); // get email from element				
				if (!this.isModified(messages[i]) && searchterm!=myEmail) {
				  var icon = this.createClickSpan(searchterm);
				  icon.setAttribute('style', 'padding-right:3px');
					messages[i].insertBefore(icon,messages[i].childNodes[0]);
					this.trackIcon(page, icon);
				}
			}
			
			//this isn't working quite right
			messages= this.evalXPath(".//span[@class = '" + CONV_TO_SPAN_CLASS + "'][count(.//span[@class='oneclick'])=0]//span[@class = '" + CONV_IMG_SPAN_CLASS + "']", page);
			for (i=0;i<messages.length;i++) {	
			  searchterm=messages[i].childNodes[0].getAttribute('jid');
			  if (searchterm) {
			    var text = messages[i].parentNode.textContent;
          var icon = this.createClickSpan(searchterm);
          icon.setAttribute('style', 'padding-right:3px');
          messages[i].parentNode.insertBefore(icon, messages[i].nextSibling);
          this.trackIcon(page, icon);
			  }
		  }
		  if (DEBUG) { GM_log("</modConversationView>"); }
		}
};

window.addEventListener('load', function() {
  if (unsafeWindow.gmonkey) {
    unsafeWindow.gmonkey.load('1.0', function(g) {	
	    OneClickConversations.gmail = g;
	    OneClickConversations.gmail.registerViewChangeCallback(function()
    			{
    				OneClickConversations.addIcons();
    			});
      });
  }
}, true);