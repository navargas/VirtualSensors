$(function() {
  var SelectTemplate = $('select#selectdevice');
  var SelectVariable = $('select#selectvar');
  var SyntaxBox = $('textarea#syntaxbox');
  var RemoveTemplateButton = $('#removetemplate');
  var NewTemplateButton = $('#newtemplate');
  var NewVariableButton = $('#newvariable');
  var SaveTemplateButton = $('#savetemplate, #savetemplatevar');
  var VariableTab = $('#vartab');
  var VarTypeRadio = $('input[type=radio][name=vartype]');
  var RadioForm = $('#vartypeform');
  var ScriptPane = $('#scriptpane');
  var CustomPane = $('#custompane');
  var RandomPane = $('#rnumpane');
  var cache = {};
  function initUI(data, initialName) {
    if (!data) {
      data = cache;
    } else {
      cache = data;
    }
    if (!initialName) initialName = Object.keys(data)[0];
    console.log("ini name", initialName);
    var initial = data[initialName];
    if (!initial) {
      RemoveTemplateButton.css('display', 'none');
      SyntaxBox.prop('disabled', true);
      VariableTab.prop('disabled', true);
      NewTemplateButton.text('new template');
      SelectTemplate.html('<option>(new)</option>');
      return;
    } else {
      RemoveTemplateButton.css('display', 'inline');
      SyntaxBox.removeAttr('disabled');
      VariableTab.removeAttr('disabled');
      NewTemplateButton.text('make copy');
    }
    console.log('Loading', initial);
    SyntaxBox.val(initial.syntax);
    SelectTemplate.html('');
    for (option in data) {
      if (!data.hasOwnProperty(option)) continue;
      SelectTemplate.append($('<option>', {
          value: option,
          text: option
      }));
    }
    SelectTemplate.val(initial.name);
    loadVariables(initial.name);
  }
  /* Load in profiles */
  $.get('/api/v1/sensors/profiles', function(data, httpstat) {
    /* Errors */
    if (!data) {
      alert('API not available. Please log in again.'); return;
    } else if (data.error) {
      alert(data.error); return;
    }
    initUI(data, null);
  });
  function loadVariables(name, show) {
    var templateObj = cache[name];
    SelectVariable.html('');
    for (variable in templateObj.variables) {
      if (!templateObj.variables.hasOwnProperty(variable)) continue;
      SelectVariable.append($('<option>', {
          value: variable,
          text: variable
      }));
    }
    if (!show) show = Object.keys(templateObj.variables)[0];
    if (show) {
      SelectVariable.val(show);
      RadioForm.css('display','inline');
    } else {
      RadioForm.css('display','none');
    }
  }
  function sendTemplate(name) {
    profileobj = {};
    profileobj.name = name;
    profileobj.variables = {};
    if (cache[name] && cache[name].variables)
      profileobj.variables = cache[name].variables;
    profileobj.syntax = SyntaxBox.val();
    console.log('Uploading', profileobj);
    $.post('/api/v1/sensors/profiles', {"profile":profileobj},
      function(data, httpstat) {
        console.log(data, name);
        initUI(data, name);
      }
    );
  }
  SaveTemplateButton.click(function() {
    sendTemplate(SelectTemplate.val());
    return false;
  });
  NewTemplateButton.click(function() {
    var name = prompt('Please enter template name');
    if (!name) return false;
    sendTemplate(name);
    return false;
  });
  RemoveTemplateButton.click(function() {
    var cmd = {"cmd":"delete", "profilename":SelectTemplate.val()};
    $.post('/api/v1/sensors/profiles', cmd,
      function(data, httpstat) {
        initUI(data, null);
      }
    );
  });
  NewVariableButton.click(function() {
    var name = prompt('Please enter variable name');
    if (!name) return false;
    console.log(name);
    var defaultvar = {"type":"none"};
    var template = SelectTemplate.val();
    console.log('Var,', template, defaultvar, cache[template]);
    cache[template].variables[name] = defaultvar;
    loadVariables(template, name);
    return false;
  });
  VarTypeRadio.change(function() {
    console.log('radio', this.value);
    if (this.value == 'script') {
      RandomPane.css('display', 'none');
      CustomPane.css('display', 'none');
      ScriptPane.css('display', 'block');
    } else if (this.value == 'rnum') {
      RandomPane.css('display', 'block');
      CustomPane.css('display', 'none');
      ScriptPane.css('display', 'none');
    } else {
      RandomPane.css('display', 'none');
      CustomPane.css('display', 'block');
      ScriptPane.css('display', 'none');
    }
  });
  /* Select Box */
  SelectTemplate.change(function() {
    var option = $(this).children(":selected").html();
    initUI(null, option);
  });
  SelectVariable.change(function() {
    var option = $(this).children(":selected").html();
    loadVariableConf(option);
  });
  function loadVariableConf(variable) {
    console.log('Loaded', variable); 
  }
});
