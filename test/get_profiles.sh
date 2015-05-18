target=$(while read line; do echo $line; break; done < ./target)
set -x
curl "$target"api/v1/sensors/profiles -k -X GET --cookie "token=$1" -H 'Content-type: application/json'
