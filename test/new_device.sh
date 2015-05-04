target=$(while read line; do echo $line; break; done < ./target)
set -x
curl "$target"api/v1/sensors -k -X POST -d \
   '{
      "token" :"'$1'",
      "device": {
         "unit":"temperature",
         "name": "testdevice01",
         "min" : 34,
         "max" : 53,
         "interval":2
      }
    }' \
-H 'Content-type: application/json'
