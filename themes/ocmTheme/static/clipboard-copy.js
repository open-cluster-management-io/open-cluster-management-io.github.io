(function() {
    'use strict';
  
    // if the current brower doesn't copy command, return instantly.
    if(!document.queryCommandSupported('copy')) {
      return;
    }
  
    // showCopyMessage shows copy result
    function showCopyMessage(el, msg) {
      el.textContent = msg;
      setTimeout(function() {
        el.textContent = "Copy";
      }, 1000);
    }
  
    // getText get the code snippet content from hugo compiled html node
    function getText(node) {
      var selection = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
      return selection;
    }

    // addCopyBtn adds copy buton to the highlight code snippet container
    function addCopyBtn(containerElemnt) {
      var copyBtn = document.createElement("button");
      copyBtn.className = "clipboard-copy-btn";
      copyBtn.textContent = "Copy";
  
      var codePreElemnt = containerElemnt.firstElementChild;
      copyBtn.addEventListener('click', function() {
        try {
          var selection = getText(codePreElemnt);
          document.execCommand('copy');
          selection.removeAllRanges();
  
          showCopyMessage(copyBtn, 'Copied!')
        } catch(e) {
          console && console.log(e);
          showCopyMessage(copyBtn, 'Failed!')
        }
      });

      containerElemnt.appendChild(copyBtn);
    }
  
    // get the highlight code snippet containers and add copy button
    var highlightContainers = document.getElementsByClassName('highlight');
    Array.prototype.forEach.call(highlightContainers, addCopyBtn);
  })();
