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
  var BackButton = $('.backbutton');
  var DisplayUIButton = $('.useui');
  var VariableMinInput = $('#varmin');
  var VariableMaxInput = $('#varmax');
  var cache = {};
  function getCookieValue(a, b) {
    b = document.cookie.match('(^|;)\\s*' + a + '\\s*=\\s*([^;]+)');
    return b ? b.pop() : '';
  }
  function initUI(data, initialName) {
    if (!data) {
      data = cache;
    } else {
      cache = data;
    }
    if (!initialName) {
      var templatecookie = getCookieValue('template');
      if (data[templatecookie])
        initialName = templatecookie;
      else
        initialName = Object.keys(data)[0];
    }
    console.log("ini name", initialName);
    var initial = data[initialName];
    if (!initial) {
      RemoveTemplateButton.css('display', 'none');
      SyntaxBox.prop('disabled', true);
      VariableTab.prop('disabled', true);
      SelectTemplate.html('<option>(new)</option>');
      return;
    } else {
      RemoveTemplateButton.css('display', 'inline');
      SyntaxBox.removeAttr('disabled');
      VariableTab.removeAttr('disabled');
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
  function checkOverwrite() {
    var template = SelectTemplate.val();
    var hasChange = false;
    if (cache[template] && SyntaxBox.val() !== cache[template].syntax) {
      hasChange = true;
    }
    if (hasChange) {
      var resp = confirm('There are unsaved changes. ' +
                         'Are you sure you wish to continue?');
      return resp;
    }
    return true;
  }
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
      var varType = templateObj.variables[show].type;
      console.log('Setting radio to', varType);
      VarTypeRadio.val([varType])
      setVarRadio(varType);
      RadioForm.css('display','inline');
    } else {
      RadioForm.css('display','none');
    }
  }
  function sendTemplate(name, syntax, variables) {
    profileobj = {};
    profileobj.name = name;
    profileobj.variables = {};
    if (cache[name] && cache[name].variables)
      profileobj.variables = cache[name].variables;
    profileobj.syntax = SyntaxBox.val();
    if (syntax !== undefined)
      profileobj.syntax = syntax;
    if (variables !== undefined)
      profileobj.variables = variables;
    console.log('Uploading', profileobj);
    $.post('/api/v1/sensors/profiles', {"profile":profileobj},
      function(data, httpstat) {
        console.log(data, name);
        initUI(data, name);
      }
    );
  }
  DisplayUIButton.click(function() {
    var template = SelectTemplate.val();
    var onVar = SelectVariable.val();
    var variables = cache[template].variables;
    for (variable in variables) {
      if (!variables.hasOwnProperty(variable)) continue;
      var vObj = variables[variable];
      if (variable == onVar) {
        vObj.display = 'yes';
      } else {
        vObj.display = 'no';
      }
    }
    return false;
  });
  SaveTemplateButton.click(function() {
    saveVarState();
    sendTemplate(SelectTemplate.val());
    return false;
  });
  NewTemplateButton.click(function() {
    if (!checkOverwrite()) return false;
    var name = prompt('Please enter template name');
    if (!name) return false;
    SyntaxBox.val('');
    sendTemplate(name);
    return false;
  });
  RemoveTemplateButton.click(function() {
    var cmd = {"cmd":"delete", "profilename":SelectTemplate.val()};
    confirm('Are you sure you wish to delete?');
    $.post('/api/v1/sensors/profiles', cmd,
      function(data, httpstat) {
        initUI(data, null);
      }
    );
    return false;
  });
  NewVariableButton.click(function() {
    var name = prompt('Please enter variable name');
    if (!name) return false;
    console.log(name);
    var defaultvar = {"type":"static"};
    var template = SelectTemplate.val();
    console.log('Var,', template, defaultvar, cache[template]);
    cache[template].variables[name] = defaultvar;
    loadVariables(template, name);
    return false;
  });
  VarTypeRadio.change(function() {
    setVarRadio(this.value);
  });
  function setVarRadio(value) {
    console.log('radio', value);
    var template = SelectTemplate.val();
    var variable = SelectVariable.val();
    var vObj = cache[template].variables[variable];
    if (value == 'script') {
      RandomPane.css('display', 'none');
      CustomPane.css('display', 'none');
      ScriptPane.css('display', 'block');
    } else if (value == 'random') {
      RandomPane.css('display', 'block');
      CustomPane.css('display', 'none');
      ScriptPane.css('display', 'none');
      VariableMinInput.val(vObj.min || 0);
      VariableMaxInput.val(vObj.max || 10);
    } else {
      RandomPane.css('display', 'none');
      CustomPane.css('display', 'block');
      ScriptPane.css('display', 'none');
    }
  }
  function saveVarState() {
    var template = SelectTemplate.val();
    var variable = SelectVariable.val();
    if (!variable) return;
    var vartype = VarTypeRadio.filter(':checked').val();
    var vObj = cache[template].variables[variable];
    vObj.type = vartype;
    if (vartype == 'random') {
      vObj.max = parseInt(VariableMaxInput.val());
      vObj.min = parseInt(VariableMinInput.val());
    }
  }
  BackButton.click(function() {
    if (!checkOverwrite()) return false;
    window.location.href = '/newdevice';
    return false;
  });
  /* Select Box */
  SelectTemplate.change(function() {
    var option = $(this).children(":selected").html();
    initUI(null, option);
  });
  SelectVariable.change(function() {
    var option = $(this).children(":selected").html();
    loadVariables(SelectTemplate.val(), option);
  });
});
