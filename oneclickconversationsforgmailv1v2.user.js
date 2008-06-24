// ==UserScript==
// @name          One Click Conversations for GMail V.1 & V.2
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
		+ Option-clicking the icon searches for all messages from the sender's domain.  This is useful for the pile of old 
		  mailing lists/notifications that come from [random]@domain.com 


###  Features, as of latest release (For Gmail V1 users): --------------------------------------------
   
     + Adds icon just to the left of sender name in list view and in message view
         + Clicking on icon takes you to the recent conversations with that user
         + Rolling over icon pops up menu, as found via the "quick contacts" panel 
     + Adds "Recent Conversations" item to pull down menu in the message view.

   Requirements:
     + GMail view must be set to "standard with chat".

   Testing:
     + Works with Firefox 2.0+ with Greasemonkey and Opera 9+, for Mac and PC. 
     + Definitely doesn't work with Cream Monkey for Safari.



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

*/


const CLOCK_IMAGE = "data:image/gif;base64,R0lGODlhCgAKAKIAADMzM//M/7CwsGZmZv///8fHxwAAAAAAACH5BAEHAAEALAAAAAAKAAoAAAMp" +
"GDo8+kOUItwqJJPioh5ZNWAEmHHjdzKCRrRVAJAn8AASZT/BAACWQAIAOw==";

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
const CONV_ADDRESS_SPAN_CLASS='EP8xU';
const CONV_TO_SPAN_CLASS='HcCDpe';

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
		  for (var xpathNode = xpathIterator.iterateNext(); 
			   xpathNode; 
			   xpathNode = xpathIterator.iterateNext()) {
			results.push(xpathNode);
		  }
			
		  return results;
		}
		
		function addOneClick() {
			/* Calls appropriate functions for adding One Click icon, based on active view */
			$view=gmail.getActiveViewType();
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
		}
	
		function listen(bool) {
			var root=gmail.getActiveViewElement();
			if (bool==true) {		
				root.addEventListener("DOMNodeInserted", addOneClick, false); 		
			}
			if (bool==false) {
				root.removeEventListener("DOMNodeInserted", addOneClick, false); 
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
			var searchterm=this.getAttribute("searchterm");
			
			if (e.altKey) {
				/* if alt/option key is down, search based on domain. */
				var terms=searchterm.split('@');
				if (terms.length>1) {
					var searchterm="*@" + terms[1];
				}
			}
			top.location.hash="#search/" + encodeURIComponent("from:" + searchterm + " OR to:" + searchterm);
			
			/* Cancel the other events after this one.  This prevents gmail from loading a message from our click event. */
			e.preventDefault();
			e.cancelBubble = true;
			if (e.stopPropagation) e.stopPropagation();
			return false;
		}		
		
		function iconMouseOver (e) {
			this.src=PERSON_IMAGE_OVER;
		}
		
		function iconMouseOut (e) {
			this.src=PERSON_IMAGE;
		}
			
		function createClickSpan(searchterm) {
				var TextSpan = document.createElement("span");
				TextSpan.setAttribute("class", "oneclickts");
				TextSpan.style.display='inline';
				TextSpan.style.textAlign='right';
				TextSpan.style.paddingRight='5px';
			
				var Image = document.createElement("img");
				
				Image.width='10';
				Image.height='10';
				Image.src=PERSON_IMAGE;
				Image.title="View Recent Conversations";
				Image.setAttribute('class', 'oneclick');
				Image.setAttribute('searchterm', searchterm);

				Image.addEventListener('mousedown', jumpToConversation, false);
				Image.addEventListener('mouseover', iconMouseOver, false);
				Image.addEventListener('mouseout', iconMouseOut, false);
				TextSpan.appendChild(Image);
				
				return TextSpan;
		}
	
		function modListView() {
			var listroot=gmail.getActiveViewElement();
			var myEmailAddress=getMyEmailAddress();
			
			/* find all message objects, that haven't already been modified */
			var messages = evalXPath("//tr[count(.//img[@class='oneclick'])=0][contains(@class, '" + LIST_TR_CLASS + "')]", listroot); 

			for (i=0; i<messages.length; i++) {	

				/* Check if we have already modified this message.  This is a paranoia check.  Recursion on this thing gets ugly. */
				var inner=messages[i].innerHTML;
				if (!(inner.match(/\<img class=\"oneclick\".+\>/))) {	
					/* find the first email that isn't ours, corresponding to this message */
					var email_address= evalXPath(".//span[@class='" + LIST_EMAIL_SPAN_CLASS + "' or " +	"@class='" + LIST_EMAIL_SPAN_BOLD_CLASS + "'][@email!='" + myEmailAddress + "'][1]/@email", messages[i]);

					var searchterm="";
					try {
						searchterm=email_address[0].nodeValue;	
					} catch (e) {}
					
					if (searchterm == "undefined") {
							//an error occurred, or it was an email to ourselves
							searchterm=myEmailAddress;
					}
					else if (searchterm=="") {
							searchterm=myEmailAddress;
					}
					
					/* Insert the span right before the sender name */		
					messages[i].childNodes[2].firstChild.insertBefore(createClickSpan(searchterm),messages[i].childNodes[2].firstChild.firstChild);			
				}
			}
		}

		function modConversationView() {
			var messageroot=gmail.getActiveViewElement();
			var messages= evalXPath(".//span[@class='" + CONV_ADDRESS_SPAN_CLASS + "']", messageroot);
			for (i=0;i<messages.length;i++) {			
				var searchterm=messages[i].getAttribute('email'); // get email from element
				var messageAlreadyModified = false;
				
				var icons = evalXPath(".//img[@class='oneclick']", messages[i]);
								
				/* Check if we have already modified this message.  If so, skip to next */
				if (icons.length == 0) {
					messages[i].insertBefore(createClickSpan(searchterm),messages[i].childNodes[0]);
				}
			}
		} 
	
  	  gmail.registerViewChangeCallback(addOneClick);
	  listen(true);
	  addOneClick();
    });
  }
else {
	/* 	- Code For The Old Gmail 
		- This, like all things, will die someday.  But as of 12/1/07, the old version of Gmail is still widely in use.
		- So for now, it should stay.
	*/
	
	function evaluateXPath(aNode, aExpr) {
	  var results = document.evaluate(aExpr, document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null );
	  
	  var found = [];
	  var res;
	  var i=0;
	  while (res = results.iterateNext() ){
		found.push(res);
	  }
		
	  return found;
	}
	
	function chatEnabled() {
		var chat=document.getElementById("nvq");
		if (chat) { 
			return true; 
		}
		else { 
			return false; 
		}
	}
	
	function listenToList(bool) {
		/* adds/removes event listener to the list view */
		var list=document.getElementById("co");
		if (list) { 
			if (bool==true) {
				list.addEventListener("DOMNodeInserted", modListView, false); 
				list.addEventListener("DOMAttrModified", modListView, false); 
				list.addEventListener("DOMSubtreeModified", modListView, false); 
			}
			if (bool==false) {
				list.removeEventListener("DOMNodeInserted", modListView, false); 
				list.removeEventListener("DOMAttrModified", modListView, false); 
				list.removeEventListener("DOMSubtreeModified", modListView, false); 
			}
		}
	}
	
	function listenToMessages(bool) {
		/* adds/removes event listener to the message view */
		var msgs=document.getElementById("msgs");
		if (msgs) { 
			if (bool==true) {		
				msgs.addEventListener("DOMNodeInserted", modMessageView, false); 
				//msgs.addEventListener("DOMAttrModified", modMessageView, false); 
				msgs.addEventListener("DOMSubtreeModified", modMessageView, false);			
			}
			if (bool==false) {
				msgs.removeEventListener("DOMNodeInserted", modMessageView, false); 
				//msgs.removeEventListener("DOMAttrModified", modMessageView, false); 
				msgs.removeEventListener("DOMSubtreeModified", modMessageView, false);
			}
		}
	}
	
	function IsMessageView() {
		var query="//div[@id='fic']";
		var result=evaluateXPath(document,query);
	
		return (result.length > 0 ? true : false);
	}
	
	function IsListView() {
		var query="//div[@id='tbd']";
		var result=evaluateXPath(document,query);
	
		return (result.length > 0 ? true : false);
	}
	
	function OKToModList() {
		if (IsListView() == true) {
			/* make sure we're haven't already made our mod */
			var query="//div[@id='tbd']//img[contains(@id,'_pro')]";
			var icons=evaluateXPath(document, query);
			return (icons.length > 0 ? false : true);
		}
		else {
			return false;
		}
	}
	
	function modListView() {
		if (OKToModList() == true) {
			/* Remove event listener to prevent unnecessary recursion */
			listenToList(false);
			
					
			/* get our address, so we don't create quick link to ourself in the case of conversations */
			var myAddressNode=evaluateXPath(document, "//div[@id='guser']//b");
			
			if (myAddressNode.length > 0 ) {
				var myAddress=myAddressNode[0].innerHTML;
			}
			
			/* find all message objects */
			var msgs = evaluateXPath(document, "//tr[contains(@id, 'w_')]"); 
			for (i=0;i<msgs.length;i++) {
				var message=msgs[i];
			
				/* Check if we have already modified this message.  If so, skip to next */
				var exists = evaluateXPath(document, "//tr[@id ='" + message.id + "']//span[contains(@id, 'pastc_')]");
				if (exists.length > 0) { continue;}
				
				/* find email addresses corresponding to this message */
				var query="//tr[contains(@id, '" + message.id + "')]//span[contains(@id, '_upro')]";
				var email= evaluateXPath(document, query);
	
				/* get the first address that isn't ours */
				var searchterm="";
				for (j=0; j< email.length; j++) {
					searchterm=email[j].id.substring(6,email[j].id.length);
					if (searchterm != myAddress) {
						break;
					}
				}
	
				if (searchterm == "") {
					/* 
					   This was put in because Google changed their code in May 2007 and removed the vital 
					   <span id="_upro_username@gmail.com">Sender Name</span> that let this script
					   know the email address of the message.  Now that it's gone this script searches by name when in list view, 
					   instead of by email address, as it used to.  Also, since the email address isn't available, the pop-up 
					   functionality on the front page won't work either unless the sender's name is an email address.
					   
					   Message view was unaffected by the Google code change, and I've left the code in place so original functionality
					   will be restored to message view if Google listens to my pleas and puts back in that tiny piece of code.
					*/
				
					var searchterms=msgs[i].childNodes[2].firstChild.textContent;
	
					/* cut out the message count if it's present.  i.e. Jeff (3) will yield just 'Jeff' */
					searchterms=searchterms.replace(/\(\d+\)/g,'');
	
					/* search for the first name that isn't 'me' */
					var search_array=searchterms.split(",");
					for (k=0; k< search_array.length; k++) {
						searchterm=search_array[k];
						if (searchterm != "me") {
							break;
						}
					}							
				}
	
				var TextSpan = document.createElement("span");
				/* Gmail will add click to search functionality to id's beginning with "pastc_" */
				TextSpan.id="pastc_" + searchterm;
				TextSpan.style.display='inline';
				TextSpan.style.textAlign='right';
				TextSpan.style.paddingRight='5px';
	
				var reg = new RegExp("@");
				var Image = document.createElement("img");
				if (reg.exec(searchterm)) {
					/* Gmail will add a rollover popup to id's beginning with "_pro_" */
					Image.id="_pro_" + searchterm;
				}
				else {
					/* This id should begin with _pro so OkToModList() still functions, but shouldn't 
					   be _pro_ so an invalid popup doesn't show up.
					*/
					Image.title="View Recent Conversations";
					Image.id= "_prox_" + searchterm;;
				}
	
				Image.width='10';
				Image.height='10';
				Image.src=PERSON_IMAGE;
				Image.setAttribute('onmouseover', "javascript: this.setAttribute('src', '" +  PERSON_IMAGE_OVER + "')");
				Image.setAttribute('onmouseout', "javascript: this.setAttribute('src', '" +  PERSON_IMAGE + "')");
	
				TextSpan.appendChild(Image);
	
				/* Insert the span right before the sender name */
				msgs[i].childNodes[2].insertBefore(TextSpan,msgs[i].childNodes[2].firstChild);
			}
			
			/* Listen for changes, again */
			
			listenToList(true);
		}
	}
	
	
	function modMessageView() {
		if (IsMessageView() == true) {
			/* Remove event listener to prevent unnecessary recursion */
			listenToMessages(false);
			
			var menus = evaluateXPath(document, "//div[@class='om']"); // find all menu objects
			var results= evaluateXPath(document, "//td//span[contains(@id, '_user_')]"); // find all address objects
	
			for (i=0;i<results.length;i++) {
				
				/* Check if we have already modified this message.  If so, skip to next */
				var address=results[i].id.substring(6,results[i].id.length); // get email from _user_blah@email.com
				var messageAlreadyModified = false;
				for (j=0;j<results[i].childNodes.length;j++) {
					if (results[i].childNodes[j].id == "pastc_" + address) {
						messageAlreadyModified= true;
					}
				}
			
				if (messageAlreadyModified==true) { continue; }
				
				/* add recent conversations item to menu, if menu exists */
				if (menus) {
					if (i < menus.length) {
						var len = menus[i].id.length;
						var menuNum=menus[i].id.substring(len-1,len); // get the actual menu number. i.e. the 3 from "om_3"
						var index=menuNum-1;
						if ((index <= results.length) && (index > -1)) { 
							var email=results[index].id.substring(6,results[index].id.length); // get email from _user_blah@email.com
			
							var Span = document.createElement("span");
							var TextSpan = document.createElement("span");
							Span.className='oi cbut h';
							Span.id="omi_" + menuNum;
			
							TextSpan.id="pastc_" + email;
							TextSpan.style.display='block';
							TextSpan.innerHTML="<img width='10' height='10' style='padding-right:3px; padding-left:2px; padding-top:5px; padding-bottom:0px;' src='" + CLOCK_IMAGE + "' />&nbsp;Recent conversations";
			
							Span.appendChild(TextSpan);
							menus[i].appendChild(Span);
						}
					}
				}
				
				var TextSpan = document.createElement("span");
				TextSpan.id="pastc_" + address;
				TextSpan.style.display='inline';
				TextSpan.style.textAlign='right';
				TextSpan.style.paddingRight='5px';
			
				var Image = document.createElement("img");
				Image.id="_pro_" + address;
				Image.width='10';
				Image.height='10';
				Image.src=PERSON_IMAGE;
				Image.setAttribute('onmouseover', "javascript: this.setAttribute('src', '" +  PERSON_IMAGE_OVER + "')");
				Image.setAttribute('onmouseout', "javascript: this.setAttribute('src', '" +  PERSON_IMAGE + "')");
		
				TextSpan.appendChild(Image);
	
				/* we need to insert our image in a slightly different place if the message details are showing */
				if (results[i].parentNode.className == "au") {
					results[i].insertBefore(TextSpan,results[i].childNodes[1]);
				}
				else {
					results[i].insertBefore(TextSpan,results[i].childNodes[0]);
				}
			}
			
			/* Listen for changes, again */
			listenToMessages(true);
		}
	}
	
	if (chatEnabled()==true) {
		modListView();
		modMessageView();
	}
	
	
	else if ((IsListView() == true) || (IsMessageView() == true)) { 
		// Must be in ListView or MessageView so we don't pop up a message while Gmail is loading.
		
		// Alert user that chat is not enabled
		var icon="<img src='" + PERSON_IMAGE + "' width='10' height='10' style='padding-right:5px; position:relative; top:0px;'/>";
	
		var messageText="<b>One Click Conversations</b> needs to enable Gmail chat in order to function.";
		var msghtml='<table width="100%" cellspacing="0" cellpadding="4" border="0" style="background-color:rgb(255,255,230); border-bottom:1px solid gray; font-size:11px; font-family:Arial; height:25px; padding-left:5px; margin-bottom:5px;"><tbody><tr><td>' + icon + unescape (messageText) + '<b><a href="javascript:// Don&apos;t worry, you don&apos;t have to talk to anyone." title="Don&apos;t worry, you don&apos;t have to talk to anyone." onclick="top.js._Main_DisableChat(false)" style="color: rgb(0, 0, 204); margin-left:10px;">Enable Gmail Chat</a></b></td></tr></tbody></table>';
	
		var body = document.getElementsByTagName("body")[0];
		body.innerHTML=msghtml + body.innerHTML;
	}

}}, true);