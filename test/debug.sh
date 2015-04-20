target=$(while read line; do echo $line; break; done < ./target)
set -x
curl "$target"api/v1/auth/log -k
