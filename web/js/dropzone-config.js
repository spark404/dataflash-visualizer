// From http://www.dropzonejs.com/bootstrap.html

var myDropzone = new Dropzone(document.querySelector('#uploadbox'), { 
  url: loadSignedUrl,
  method: 'PUT',
  sending: function(file, xhr) {
    var _send = xhr.send;
    xhr.send = function() {
      _send.call(xhr, file);
    };
  }
});

function loadSignedUrl(files) {
  var result;

  function callBack(data) {
     result = data;
  }

  var filedata = {
    "name": files[0].name,
    "content-type" : "application/macbinary"
  }

  console.log("Requesting upload url for \"" + JSON.stringify(filedata) + "\"")

  $.ajax({
    url: "https://dataflashapi.strocamp.net/uploadurl",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(filedata),
    dataType: "json",
    contentType: "application/json; charset=utf-8",
    processData: false,
    success: callBack,
    async: false
  })

  console.log(result.uploadURL)
  return result.uploadURL;
}