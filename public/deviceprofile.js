$(function() {
  var SelectTemplate = $('select#selectdevice');
  var SelectVariable = $('select#selectvar');
  var SyntaxBox = $('#livesyntax');
  var RemoveTemplateButton = $('#removetemplate');
  var NewTemplateButton = $('#newtemplate');
  var NewVariableButton = $('#newvariable');
  var DeleteVariableButton = $('#removevariable');
  var SaveTemplateButton = $('#savetemplate');
  var SaveVariableButton = $('#savetemplatevar');
  var VariableTab = $('#vartab');
  var VarTypeRadio = $('input[type=radio][name=vartype]');
  var RadioForm = $('#vartypeform');
  var ScriptPane = $('#scriptpane');
  var CustomPane = $('#custompane');
  var RandomPane = $('#rnumpane');
  var BackButton = $('#syntaxback');
  var VarBackButton = $('#varback');
  var DisplayUIButton = $('.useui');
  var VariableMinInput = $('#varmin');
  var VariableMaxInput = $('#varmax');
  var ScriptBox = $('#scriptbox');
  var cache = {};
  var varDoubleClickTime = {"value":undefined, "time":0};
  var editor = ace.edit('livesyntax');
  editor.$blockScrolling = Infinity;
  //editor.renderer.setShowGutter(false)
  editor.getSession().setMode("ace/mode/json");
  function editorClick(e) {
    var editor = e.editor;
    var pos = editor.getCursorPosition();
    var token = editor.session.getTokenAt(pos.row, pos.column);
    if (token.value == varDoubleClickTime.value) {
      if (Date.now() - varDoubleClickTime.time < 200) {
        varDoubleClickTime.value = undefined;
        console.log('Dob trigger');
      } else {
        varDoubleClickTime.value = token.value;
        varDoubleClickTime.time = Date.now();
        console.log('too slow');
        return;
      }
    } else {
      varDoubleClickTime.value = token.value;
      varDoubleClickTime.time = Date.now();
      console.log('Dob set');
      return;
    }
    console.log('Click: ', token);
    //$("vars").tab("show");
    if (token.type == "constant.numeric") {
      loadVariables(SelectTemplate.val(), token.value.slice(2,-2));
      $('#vartab').tab('show');
    }
  }
  editor.on('click', editorClick);

  var variableTypes = {
    "script": ScriptPane,
    "random": RandomPane,
    "static": CustomPane
  };
  
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
      SyntaxBox.val('');
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
    editor.getSession().setValue(initial.syntax);
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
    if (cache[template] && editor.getSession().getValue() !== cache[template].syntax) {
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
    if (!name) name = SelectTemplate.val();
    console.log('Cache=', cache, 'name', name);
    var templateObj = cache[name];
    if (!templateObj.variables) {
      templateObj.variables = {};
    }
    if (show && !templateObj.variables[show]) {
      console.log('Creating new variable', show);
      var defaultvar = {"type":"static"};
      cache[name].variables[show] = defaultvar;
    }
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
      RandomPane.css('display', 'none');
      CustomPane.css('display', 'none');
      ScriptPane.css('display', 'none');
    }
    var boilerplate =  'var datetime = currentdate.getFullYear() + "-"\n' +
                       '  + (1e15+(currentdate.getMonth()+1)+"").slice(-2) + "-"\n' +
                       '  + (1e15+currentdate.getDate()+"").slice(-2) + " "\n' +
                       '  + (1e15+currentdate.getHours()+"").slice(-2) + ":"\n' +
                       '  + (1e15+currentdate.getMinutes()+"").slice(-2) + ":"\n' +
                       '  + (1e15+currentdate.getSeconds()+"").slice(-2);\n' +
                       'return datetime;';
    ScriptBox.val(boilerplate);
  }
  function sendTemplate(name, syntax, variables) {
    profileobj = {};
    profileobj.name = name;
    profileobj.variables = {};
    if (cache[name] && cache[name].variables)
      profileobj.variables = cache[name].variables;
    profileobj.syntax = editor.getSession().getValue();
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
    window.location.href = '/newdevice';
    return false;
  });
  SaveVariableButton.click(function() {
    saveVarState();
    //sendTemplate(SelectTemplate.val());
    $('#templatetab').tab('show');
    return false;
  });
  NewTemplateButton.click(function() {
    if (!checkOverwrite()) return false;
    var name = prompt('Please enter template name');
    if (!name) return false;
    editor.getSession().setValue('');
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
  DeleteVariableButton.click(function() {
    var template = SelectTemplate.val();
    var variable = SelectVariable.val();
    delete cache[template].variables[variable];
    loadVariables();
    return false;
  });
  VarTypeRadio.change(function() {
    setVarRadio(this.value);
  });
  function setVarDisplay(value) {
    for (varkey in variableTypes) {
      if (!variableTypes.hasOwnProperty(varkey)) continue;
      if (varkey == value) {
        variableTypes[varkey].css('display', 'block');
      } else {
        variableTypes[varkey].css('display', 'none');
      }
    }
  }
  function setVarRadio(value) {
    console.log('radio', value);
    var template = SelectTemplate.val();
    var variable = SelectVariable.val();
    if (!cache[template]) return;
    var vObj = cache[template].variables[variable];
    setVarDisplay(value);
    if (value == 'random') {
      VariableMinInput.val(vObj.min || 0);
      VariableMaxInput.val(vObj.max || 10);
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
  VarBackButton.click(function() {
    saveVarState();
    $('#templatetab').tab('show');
    return false;
  });
  BackButton.click(function() {
    if (!checkOverwrite()) return false;
    var onTemplate = SelectTemplate.val();
    if (onTemplate) document.cookie = 'template=' + onTemplate + ';path=/';
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
