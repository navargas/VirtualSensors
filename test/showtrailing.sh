find -iname '*.js' | grep -v 'node_modules/\|./lib/IoTAppClient.js\|bluemix-settings.js' | xargs egrep '*. +$'
