////////////////////////////////////////////////////////////////
// global data

var theContext = {};
var bubbleIndex = 0;
var itemSelectedReceived = false;
var itemConfiguredReceived = false;
var itemLastSelected = null;

////////////////////////////////////////////////////////////////
// startup
//
$(document).ready(function() {

  // retrieve the query params
  var theQuery = $.getQuery();

  // connect the button
  $("#element-list-docs").button().click(onListDocuments);
  $("#element-create-ps").button().click(onCreatePS);
  $("#element-delete-ps").button().click(onDeletePS);
  $("#open-select-item").button().click(onSelectItem);
  $("#close-select-item").button().click(onCloseSelectItem).hide();
  $("#open-configure-item").button().click(onConfigureItem);
  $("#close-configure-item").button().click(onCloseConfigureItem).hide();
  $("#show-message-bubble").button().click(onShowMessageBubble);

  // Hold onto the current session information
  theContext.documentId = theQuery.documentId;
  theContext.workspaceId = theQuery.workspaceId;
  theContext.elementId = theQuery.elementId;
  theContext.verison = 0;
  theContext.microversion = 0;

  refreshContextElements();
});

function onListDocuments() {
  $("#document-list").empty();
  $.ajax('/api/documents', {
    dataType: 'json',
    type: 'GET',
    success: function(data) {
      $("#document-list").append('Got ' + data.items.length + ' documents');
      $("#document-list").append('<br>NOTE: Currently no pagination');
    },
    error: function(data) {
      $("#document-list").append('Got error <pre>' + JSON.stringify(data, null, 2) + '</pre>');
    }
  });
}

function onCreatePS() {
  $("#create-ps").empty();
  $("#create-ps").append('Checking for existing element...');
  $.ajax('/api/elements'+
    "?documentId=" + theContext.documentId +
    "&workspaceId=" + theContext.workspaceId, {
    dataType: 'json',
    type: 'GET',
    success: function(data) {
      for (var i = 0; i < data.length; i++) {
        if (data[i].name == 'QA PartStudio') {
          $("#create-ps").append('<br>Already have QA PartStudio (' + data[i].id + ')');
          return data[i];
        }
      }
      $("#create-ps").append('<br>Creating new QA Partstudio...');
      return $.ajax('/api/newps' +
        "?documentId=" + theContext.documentId +
        "&workspaceId=" + theContext.workspaceId +
        "&name=QA+PartStudio",
        {
          dataType: 'json',
          type: 'GET',
          success: function(data) {
            $("#create-ps").append('<br>Created QA PartStudio (' + data.id + ')');
          },
          error: function(data) {
            $("#create-ps").append('<br>Got error creating partstudio: <pre>' + JSON.stringify(data, null, 2) + '</pre>');
          }
        });
    },
    error: function(data) {
      $("#create-ps").append('<br>Got error checking elements <pre>' + JSON.stringify(data, null, 2) + '</pre>');
    }
  });
}

function onDeletePS() {
  $("#delete-ps").empty();
  $("#delete-ps").append('Checking for existing element...');
  $.ajax('/api/elements'+
    "?documentId=" + theContext.documentId +
    "&workspaceId=" + theContext.workspaceId, {
    dataType: 'json',
    type: 'GET',
    success: function(data) {
      for (var i = 0; i < data.length; i++) {
        if (data[i].name == 'QA PartStudio') {
          $("#delete-ps").append('<br>Found PartStudio... deleting...');
          return $.ajax('/api/delelement' +
            "?documentId=" + theContext.documentId +
            "&workspaceId=" + theContext.workspaceId +
            "&elementId=" + data[i].id,
            {
              dataType: 'json',
              type: 'GET',
              success: function() {
                $("#delete-ps").append('<br>Deleted QA PartStudio');
              },
              error: function(data) {
                $("#delete-ps").append('<br>Got error deleting partstudio: <pre>' + JSON.stringify(data, null, 2) + '</pre>');
              }
            });
        }
      }
      $("#delete-ps").append('<br>No QA PartStudio to delete');
    },
    error: function(data) {
      $("#delete-ps").append('<br>Got error checking elements for deletion<pre>' + JSON.stringify(data, null, 2) + '</pre>');
    }
  });
}

function onSelectItem() {
  $("#select-item").empty();
  $("#select-item").append('Opened select item dialog...');
  var msg = { messageName: 'openSelectItemDialog',
              dialogTitle: 'This is my select item dialogue',
              selectBlobs: true,
              selectParts: true,
              selectPartStudios: true,
              selectAssemblies: true,
              selectMultiple: false,
              selectBlobMimeTypes: 'application/dwt,image/jpeg' };

  $("#close-select-item").show();
  itemSelectedReceived = false;
  sendConfigurableMessage(msg);
}

function onItemSelected(msg) {
  $("#select-item").empty();
  $("#select-item").append('<pre>' + JSON.stringify(msg, null, 2) + '</pre>');
  itemSelectedReceived = true;
  lastItemSelected = msg;
  if (lastItemSelected.elementType === 'partstudio') {
    $("#open-configure-item").prop('disabled', false);
    $("#configure-item").empty();
  } else {
    $("#open-configure-item").prop('disabled', true);
  }
}

function onCloseSelectItem() {
  var msg = { messageName: 'closeSelectItemDialog' };
  sendConfigurableMessage(msg);
}

function onSelectItemClosed() {
  $("#close-select-item").hide();
  if (!itemSelectedReceived) {
    $("#select-item").empty();
  }
}

function onConfigureItem() {
  $("#configure-item").empty();
  console.log('last item: ', lastItemSelected);
  if (lastItemSelected) {
    var msg = { messageName: 'openConfigureItemDialog',
                dialogTitle: 'This is my configure item dialogue',
                restrictToDocumentId: lastItemSelected.documentId,
                restrictToMicroversionId: lastItemSelected.documentMicroversionId,
                restrictToVersionId: lastItemSelected.versionId,
                restrictToElementId: lastItemSelected.elementId,
                restrictToIdTag: lastItemSelected.idTag,
                elementConfiguration: lastItemSelected.elementConfiguration,
                selectPartStudios: true,
                selectParts: true };
    $("#configure-item").append('Opened configure item dialog...');
    $("#close-configure-item").show();
    itemConfiguredReceived = false;
    sendConfigurableMessage(msg);
  }
}

function onItemConfigured(msg) {
  $("#configure-item").empty();
  $("#configure-item").append('<pre>' + JSON.stringify(msg, null, 2) + '</pre>');
  itemConfiguredReceived = true;
}

function onCloseConfigureItem() {
  var msg = { messageName: 'closeConfigureItemDialog' };
  sendConfigurableMessage(msg);
}

function onConfigureItemClosed() {
  $("#close-configure-item").hide();
  if (!itemConfiguredReceived) {
    $("#configure-item").empty();
  }
}

function onShowMessageBubble() {
  bubbleIndex++;
  var msg = { messageName: 'showMessageBubble',
              message: 'This is message #' + bubbleIndex };
  sendConfigurableMessage(msg);
}

// Send a simple message to Onshape
function sendMessage(msgName) {
  var msg = {};
  msg['documentId'] = theContext.documentId;
  msg['workspaceId'] = theContext.workspaceId;
  msg['elementId'] =  theContext.elementId;
  msg['messageName'] = msgName;

  parent.postMessage(msg, '*');
}

// Send a configurable message to Onshape
function sendConfigurableMessage(msg) {
  msg['documentId'] = theContext.documentId;
  msg['workspaceId'] = theContext.workspaceId;
  msg['elementId'] =  theContext.elementId;

  parent.postMessage(msg, '*');
}

//
// Check to see if a model has changed
function checkForChange(resolve, reject, elementId) {
  var params = "?documentId=" + theContext.documentId + "&workspaceId=" + theContext.workspaceId + "&elementId=" + elementId;

  $.ajax('/api/modelchange'+ params, {
    dataType: 'json',
    type: 'GET',
    success: function(data) {
      var objects = data;
      if (objects.change == true && Parts.length > 0) {
        // Show the message to say the QA may be invalid
        var e = document.getElementById("element-model-change-message");
        e.style.display = "initial";
      }
      resolve(1);
    },
    error: function(data) {
      reject(0);
    }
  });
}

//
// Tab is now shown
function onShow() {
  var listPromises = [];
  var selectedIndex = 0;

  // Check to see if any of the assemblies have changed, if so, let the user know
  $('#elt-select option').each(function(index,element){
    listPromises.push(new Promise(function(resolve, reject) { checkForChange(resolve, reject, element.value); }));

    if (element.value == theContext.elementId)
      selectedIndex = index;
  });

  return Promise.all(listPromises).then(function() {
    // Update the assembly list ... it may have changed.
    refreshContextElements(selectedIndex);
  });
}

function onHide() {
  // our tab is hidden
  // take appropriate action
}

function handlePostMessage(e) {
  if (e.data.messageName === 'show') {
    onShow();
  } else if (e.data.messageName === 'hide') {
    onHide();
  } else if (e.data.messageName === 'itemSelectedInSelectItemDialog') {
    onItemSelected(e.data);
  } else if (e.data.messageName === 'itemConfiguredInConfigureItemDialog') {
    onItemConfigured(e.data);
  } else if (e.data.messageName === 'selectItemDialogClosed') {
    onSelectItemClosed();
  } else if (e.data.messageName === 'configureItemDialogClosed') {
    onConfigureItemClosed();
  }
};

// keep Onshape alive if we have an active user
var keepaliveCounter = 5 * 60 * 1000;   // 5 minutes
var timeLastKeepaliveSent;
// User activity detected. Send keepalive if we haven't recently
function keepAlive() {
  var now = new Date().getTime();
  if (now > timeLastKeepaliveSent + keepaliveCounter) {
    sendKeepalive();
  }
}

// Send a keepalive message to Onshape
function sendKeepalive() {
  sendMessage('keepAlive');
  timeLastKeepaliveSent = new Date().getTime();
}

// First message to Onshape tells the Onshape client we can accept messages
function onDomLoaded() {
  // listen for messages from Onshape client
  window.addEventListener('message', handlePostMessage, false);
  timeLastKeepaliveSent = 0;
  document.onmousemove = keepAlive;
  document.onkeypress = keepAlive;
  sendKeepalive();
  return false;
}

// When we are loaded, start the Onshape client messageing
document.addEventListener("DOMContentLoaded", onDomLoaded);

//
// Simple alert infrasturcture
function displayAlert(message) {
  $("#alert_template span").remove();
  $("#alert_template button").after('<span>' + message + '<br></span>');
  $('#alert_template').fadeIn('slow');
  $('#alert_template .close').click(function(ee) {
    $("#alert_template").hide();
    $("#alert_template span").hide();
  });
}

//
// Update the list of elements in the context object
//
function refreshContextElements() {
  // First, show our session info
  $('#session-info').empty();
  $.ajax('/api/session', {
    dataType: 'json',
    type: 'GET',
    // cache: false,
    success: function(data) {
      if (data.email) {
        $('#session-info').append('<b>Got PII Data</b><br>');
      } else {
        $('#session-info').append('<b>*** No PII Data</b><br>');
      }
      $('#session-info').append('<pre>' + JSON.stringify(data, null, 2) + '</pre>');
    },
    error: function(data) {
      displayAlert('Error getting /api/session');
      $('#session-info').append('Error getting session info <pre>' + data + '</pre>');
    }
  });
}


