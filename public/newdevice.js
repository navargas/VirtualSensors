$(function() {
  var SelectTemplate = $('#devicetemplateselect');
  var EditTemplates = $('#edittemplates');
  SelectTemplate.change(function() {
    var option = $(this).children(":selected").val();
    console.log('option', option);
    if (!option) return false;
    if (option == 'modifytemplates') {
      window.location.href = '/public/customdevice.html';
    } else {
      document.cookie = 'template=' + option + ';';
      location.reload();
    }
  });
  EditTemplates.click(function() {
    window.location.href = '/public/customdevice.html';
    return false;
  });
  var currentTemplate = $('#currenttemplate').html();
});
