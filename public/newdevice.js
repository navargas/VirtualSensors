$(function() {
  var SelectTemplate = $('#devicetemplateselect');
  var EditTemplates = $('#edittemplates');
  var NewTemplate = $('#addnewtemplate');
  var DeleteTemplate = $('#deletetemplate');
  var Back = $('#backbutton');
  SelectTemplate.change(function() {
    var option = $(this).children(":selected").val();
    console.log('option', option);
    if (!option) return false;
    if (option == 'modifytemplates') {
      // deprecated
      window.location.href = '/public/customdevice.html';
    } else {
      document.cookie = 'template=' + option + ';';
      location.reload();
    }
  });
  Back.click(function() {
    window.location.href = '/';
    return false;
  });
  EditTemplates.click(function() {
    window.location.href = '/public/customdevice.html';
    return false;
  });
  DeleteTemplate.click(function() {
    var cmd = {"cmd":"delete", "profilename":SelectTemplate.val()};
    var yn = confirm('Are you sure you wish to delete ' + SelectTemplate.val() + '?');
    if (!yn) return false;
    $.post('/api/v1/sensors/profiles', cmd,
      function(data, httpstat) {
        document.cookie = 'template=;';
        location.reload();
      }
    );
    return false;
  });
  NewTemplate.click(function() {
    var name = prompt('Please enter new device type name');
    console.log(name);
    if (name === null) {
      return false;
    }
    if (!name) {
      alert('Invalid Device Type Name');
      return false;
    }
    var profileobj = {
      "name":name,
      "variables":{},
      "syntax":""
    };
    $.post('/api/v1/sensors/profiles', {"profile":profileobj},
      function(data, httpstat) {
        document.cookie = 'template=' + name + ';';
        location.reload();
      }
    );
    console.log('returning false');
    return false;
  });
  var currentTemplate = $('#currenttemplate').html();
});
