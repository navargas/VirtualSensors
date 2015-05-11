exports.demap = function(map) {
  var array_keys = new Array();
  var array_values = new Array();
  for (var key in map) {
    array_keys.push(key);
    array_values.push(map[key]);
  }
  return {keys:array_keys, values:array_values};
};
