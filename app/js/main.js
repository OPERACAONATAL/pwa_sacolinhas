import QRReader from './vendor/qrscan.js';
import {snackbar} from './snackbar.js';
import styles from '../css/styles.css';
import isURL from 'is-url';

var host = "http://localhost:3000"

//If service worker is installed, show offline usage notification
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    if (!localStorage.getItem("offline")) {
      localStorage.setItem("offline", true);
      snackbar.show('App is ready for offline usage.', 5000);
    }
  });
}

//To generate sw.js file
if (process.env.NODE_ENV === 'production') {
  require('offline-plugin/runtime').install();
}

window.addEventListener("DOMContentLoaded", () => {
  //To check the device and add iOS support
  window.iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;

  var copiedText = null;
  var frame = null;
  var selectPhotoBtn = document.querySelector('.app__select-photos');
  var dialogElement = document.querySelector('.app__dialog');
  var dialogOverlayElement = document.querySelector('.app__dialog-overlay');
  var dialogOpenBtnElement = document.querySelector('.app__dialog-open');
  var dialogCloseBtnElement = document.querySelector('.app__dialog-close');
  var showCardElement = document.querySelector(".app__showCard");
  var scanningEle = document.querySelector('.custom-scanner');
  var textBoxEle = document.querySelector('#result');
  var helpText = document.querySelector('.app__help-text');
  var infoSvg = document.querySelector('.app__header-icon svg');
  var videoElement = document.querySelector('video');
  window.appOverlay = document.querySelector('.app__overlay');
  
  // Initialize listener for the id button
  selectFromInput();

  //Initializing qr scanner
  window.addEventListener('load', (event) => {
    QRReader.init(); //To initialize QR Scanner
    // Set camera overlay size
    setTimeout(() => { 
      setCameraOverlay();
      if (!window.iOS) {
        scan();
      }
    }, 1000);
  });

  function setCameraOverlay() {
    window.appOverlay.style.borderStyle = 'solid';
    helpText.style.display = 'block';
  }
  
  function createFrame() {
    frame = document.createElement('img');
    frame.src = '';
    frame.id = 'frame';
  }
  
  //Dialog close btn event
  dialogCloseBtnElement.addEventListener('click', hideDialog, false);

  //Scan
  function scan() {
    if (!window.iOS) scanningEle.style.display = 'block';
    QRReader.scan((result) => {
      copiedText = result;
      textBoxEle.value = result;
      textBoxEle.select();
      scanningEle.style.display = 'none';
      if (isURL(result)) {
        dialogOpenBtnElement.style.display = 'inline-block';
      }

      // Check for OPN Ids
      if(result.indexOf("OPN") === -1) {
        alert("Por favor, coloque um qrCode natalino :)");
        scan();
        return;
      }

      var url = host + '/cards/' + result.replace("OPN-","");
      makeAjaxCall(url, "GET", null, null, function(data, textStatus) {
          console.log("Data returned: ");
          console.log(data);
          if(nonExistent(data)) {
            hideDialog();
            return;
          }
          showDialog(data);
      }, 
      function(textStatus, errorThrown) {
          console.log("Error: " + errorThrown);
          console.log("TextStatus: " + textStatus);
      });

    });
  }
  /*
    Makes a generic jquery ajax call
    @params: 
        url: url to make the call to,
        method: http method,
        data: data to be sent,
        dataType: type of content data,
        done: function if success,
        fail: function if fail 
  */
function makeAjaxCall(url, method, data, dataType, done, fail) {
  $.ajax({
      url: url,
      method: method,
      data: data,
      dataType: dataType
  })
  .done(function( data, textStatus, jqXHR ) {
    done(data, textStatus);
  })
  .fail(function( jqXHR, textStatus, errorThrown ) {
      fail(textStatus, errorThrown);
  });
}
/* Function that sends the request for ID from data read from input
  instead of qrCode scan */
function selectFromInput() {
	$(".app__input-submit").on("click", function() {
    var id = $(".app__input-input").val();
    if( id == "") return;
    // Must change address
    var url = host + '/cards/' + id;
    $("#result").val(id);
		makeAjaxCall(url, "GET", null, null, function(data, textStatus) {
		  console.log("Data returned: ");
		  console.log(data);
      if(nonExistent(data)) {
        return;
      }
      showDialog(data);
		}, function(textStatus, errorThrown) {
		  console.log("Error: " + errorThrown);
		  console.log("TextStatus: " + textStatus);
		});
	});
}
  /* Treats the "id not found" error */
  function nonExistent(data) {
    if( data === null) {
      alert("ID não encontrado");
      return true;
    }
    else return false;
  }
  /* Shows the dialog box */
  function showDialog(data) {
    $('#name__api').val(data["nome"]);
    dialogElement.classList.remove('app__dialog--hide');
    dialogOverlayElement.classList.remove('app__dialog--hide');
    $(".app__dialog").fadeIn(100);
    $('.app__dialog-overlay').fadeIn(100, function() {
      $(".app__dialog-open").one("click", function() {
        displayFields(data);
      });
    });
  }
  //Hide dialog
  function hideDialog() {
    copiedText = null;
    textBoxEle.value = "";

    if (window.iOS) {
      frame.src = "";
      frame.className = "";
    }

    $(".app__dialog").fadeOut(100, function() {
      dialogElement.classList.add('app__dialog--hide');
      dialogOverlayElement.classList.add('app__dialog--hide');
      $(".app__showCard").hide(function() {
        $(".app__dialog-open").click(function() {
          $("#submit").empty();
        });
      });
      scan();
    });
  }
  /* Mount the fields to be displayed */
  function displayFields(data) {
    delete data["__v"];
    var id = data["_id"];
    var toAppend = appendValues(data);
    $("#submit").append(toAppend);
    $(".app__showCard").fadeIn(800, function() {
      sendValues(id);
    });

  }
  /* Create the list display for the fields */
  function appendValues(data) {
    var toAppend = ""
    toAppend += "<div class='container'>"
    for( var attr in data) {
      switch(attr) {
        case "_id":
        case "nome":
        case "idade":
          toAppend += 
          "<span class='item header'>" + 
            "<span class='identification'>" + attr + " : " + data[attr] + "</span>" +
            "<input class='hidden' type='checkbox' name=" + attr + " value=" + data[attr] + ">" + 
          "</span><hr>";
          break;
        case "calca":
        case "camiseta":
          toAppend += 
          "<span class='item'>" + 
            "<span class='identification'>" + attr + " : " + data[attr].tamanho + "</span>" +
            "<input type='checkbox' name=" + attr + " value=" + data[attr].existe + ">" + 
          "</span>";
          break;
        case "observacao":
        toAppend += 
        "<div class='item'>" + 
          "<span class='identification'>" + attr + "</span>" +
          "<textarea placeholder='Digite observações sobre a sacolinha' name=" + attr + "></textarea>" + 
        "</div>";
        break;
        default:
          toAppend += 
          "<div class='item'>" + 
            "<span class='identification'>" + attr + "</span>" +
            "<input type='checkbox' name=" + attr + " value=" + data[attr] + ">" + 
          "</div>";
          break;
      }
    }
    toAppend += "</div>"
    toAppend += "<button class='app__input-submit' id='sendBtn' type='submit'>Confirmar</button>"
    return toAppend;
  }

  function sendValues(id) {
    /* Attach a submit handler to the form */
    $("#submit").submit(function( event ) {
      // Stop form from submitting normally
      event.preventDefault();

      // Get some values from elements on the page:
      // get all the inputs into an array.
      var $inputs = $('#submit :input:checked');
      var $textarea = $('textarea');
      var values = {};
      values["_id"] = id;
      $inputs.each(function() {
        var bool = $(this).val() == "false";
        values[this.name] = bool;
      });
      values[$textarea[0].name] = $textarea[0].value;
  
      var url = host + "/cards/"
      makeAjaxCall(url + id, "PUT", values, "json", function(data, textStatus) {
        console.log("Data returned: ");
        console.log(data);
        alert("Sacolinha enviada com sucesso! VAI NATAL!!!");
      }, function(textStatus, errorThrown) {
        console.log("Error: " + errorThrown);
        console.log("TextStatus: " + textStatus);
      });
    });
  }

  // For iOS support
  if (window.iOS) selectFromPhoto();

  function selectFromPhoto() {
    if (videoElement) videoElement.remove(); //removing the video element
    
    //Creating the camera element
    var camera = document.createElement('input');
    camera.setAttribute('type', 'file');
    camera.setAttribute('capture', 'camera');
    camera.id = 'camera';
    helpText.textContent = '';
    helpText.style.color = '#212121';
    helpText.style.bottom = '-60px';
    infoSvg.style.fill = '#212121';
    window.appOverlay.style.borderStyle = '';
    selectPhotoBtn.style.color = "#212121";
    selectPhotoBtn.style.display = 'block';
    createFrame();

    //Add the camera and img element to DOM
    var pageContentElement = document.querySelector('.app__layout-content');
    pageContentElement.appendChild(camera);
    pageContentElement.appendChild(frame);

    //Click of camera fab icon
    selectPhotoBtn.addEventListener('click', () => {
      scanningEle.style.display = 'none';
      document.querySelector("#camera").click();
    });
    
    //On camera change
    camera.addEventListener('change', (event) => {
      if (event.target && event.target.files.length > 0) {
        frame.className = 'app__overlay';
        frame.src = URL.createObjectURL(event.target.files[0]);
        scanningEle.style.display = 'block';
        window.appOverlay.style.borderColor = '#212121';
        scan();
      }
    });
  }
});
