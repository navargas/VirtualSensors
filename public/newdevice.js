$(function() {
  var SelectTemplate = $('#devicetemplateselect');
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
  var currentTemplate = $('#currenttemplate').html();
});
