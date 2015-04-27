target=$(while read line; do echo $line; break; done < ./target)
set -x
curl "$target"api/v1/sensors/ -k -X GET -d '{"token":"'$1'"}' -H 'Content-type: application/json'
