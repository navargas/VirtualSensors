target=$(while read line; do echo $line; break; done < ./target)
set -x
curl "$target"api/v1/auth/login -k -X POST -d '{"username":"navargas@us.ibm.com","password":"wrongpass"}' -H 'Content-type: application/json'
