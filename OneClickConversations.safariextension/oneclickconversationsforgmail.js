/*
### Author: Jeff Keen - http://keen.me

###	Features
  + Adds icon just to the left of sender name in list view and in message view
    + Clicking on icon takes you to the recent conversations with that user	
  + Option-clicking the icon searches for all messages from the sender's domain.

*/
(function() {
  function initialize(frame) {
    var myEmailAddress = frame.getElementById('guser').querySelector('b').innerHTML;
    
    function jumpToConversation(e) {
      if (!e) var e = window.event;       
      var searchterm = e.srcElement.getAttribute('searchterm');
      if (searchterm) {
        /* Cancel the other events after this one.  This prevents gmail from loading a message from our click event. */
        e.preventDefault();
        e.cancelBubble = true;
        if (e.stopPropagation) e.stopPropagation();
        if (e.altKey) {
          /* if alt/option key is down, search based on domain. */
          var terms = searchterm.split('@');
          if (terms.length > 1) {
              searchterm = "*@" + terms[1];
          }
        }
        top.location.hash = "#search/" + "from%3A" + encodeURIComponent(searchterm) + "+OR+to%3A" + encodeURIComponent(searchterm);
        return false;
      }
    }
    
    function urlHash(searchterm) {
      return "#search/" + "from%3A" + encodeURIComponent(searchterm) + "+OR+to%3A" + encodeURIComponent(searchterm);
    }

    function createClickSpan(searchterm) {
      var clickSpan = document.createElement("span");

      clickSpan.setAttribute("class", "oneclick");
      clickSpan.setAttribute("title", "View Recent Conversations With [" + searchterm + "]");
      clickSpan.setAttribute('searchterm', searchterm);
      clickSpan.textContent = " ";
      return clickSpan;
    }

    function addIcons() {
      modConversationView();
      modListView();
    }

    function modListView() {
      /* find all message objects, that haven't already been modified */      
      var messages = frame.querySelectorAll("tr.zA");
      for (i = 0; i < messages.length; i++) {
        /* Check if we have already modified this message.  This is a paranoia check.  Recursion on this thing gets ugly. */
        if (!messages[i].querySelector("span.oneclick")) {
          /* find the first email that isn't ours, corresponding to this message */
          var searchterm = messages[i].querySelector("span:not([email='" + myEmailAddress + "'])").getAttribute("email");
          if (!searchterm) { 
            searchterm = myEmailAddress;
          }

          /* Insert the span right before the sender name */
          var icon = createClickSpan(searchterm);
          var parent = messages[i].querySelector("td.yX div.yW");
          var after = parent.querySelector("span.yP, span.zF");  
          
          if (parent && after) { 
            parent.insertBefore(icon, after);
          }
        }
      }
    }
    
    function modConversationView() {
      var nodes = frame.querySelectorAll("img[jid]");
      for (i = 0; i < nodes.length; i++) {
        var parent = nodes[i].parentNode;

        if (!parent.querySelector("span.oneclick")) {
          var icon = createClickSpan(nodes[i].getAttribute('jid'));
          parent.appendChild(icon);          
        }
      }
    }
    
    addIcons();
    frame.addEventListener("DOMNodeInserted", addIcons, true);
    frame.addEventListener("DOMNodeRemoved", addIcons, true);
    frame.addEventListener("mousedown", jumpToConversation, true);
  };
  
  function initializeOnCanvasLoad() {
    if (document.getElementById("canvas_frame") && document.getElementById("canvas_frame").contentWindow.document.getElementById('guser')) {
      initialize(document.getElementById("canvas_frame").contentWindow.document);
    }
    else {
      // try again
      window.setTimeout(initializeOnCanvasLoad, 100);
    }
  }
  
  initializeOnCanvasLoad();
})();