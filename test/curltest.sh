#!/bin/bash

jq &>/dev/null
if [ $? -eq 127 ]; then
  echo "jq executable not found."
  echo "check yum, apt, or download directly from"
  echo "http://stedolan.github.io/jq/download/"
  exit 1;
fi

#COLORS
black='\E[30m'
red='\E[31m'
green='\E[32m'
yellow='\E[33m'
blue='\E[34m'
magenta='\E[35m'
cyan='\E[36m'
white='\E[37m'
txtrst='\e[0m'
BBlack='\e[1;30m'       # Black
BRed='\e[1;31m'         # Red
BGreen='\e[1;32m'       # Green
BYellow='\e[1;33m'      # Yellow
BBlue='\e[1;34m'        # Blue
BPurple='\e[1;35m'      # Purple
BCyan='\e[1;36m'        # Cyan
BWhite='\e[1;37m'       # White

#CHARACTERS
check='\xE2\x9C\x93'
cross='\xE2\x9C\x97'

fails=0

#http://www.tldp.org/LDP/abs/html/colorizing.html
cecho ()                     # Color-echo.
                             # Argument $1 = message
                             # Argument $2 = color
{
local default_msg="No message passed."
                             # Doesn't really need to be a local variable.

message=${1:-$default_msg}   # Defaults to default message.
color=${2:-$black}           # Defaults to black, if not specified.

  echo -ne "$color"
  echo -e "$message"
  echo -ne "$txtrst"

  return
} 

title () {
  cecho "  $1" $yellow
}

info () {
  cecho "    $1" $BCyan
}

utest () {
  if [ $? -eq 0 ]; then
    cecho "    $check OK" $green
  else
    cecho "    $cross FAIL" $red
    fails=$(( $fails + 1 ))
  fi
  return
}

notnull () {
  [[ $1 != "null" ]]
  return $?;
}

getproperty () {
  prop=$(echo $1 | jq -r '.'"$2" | sed 's/\r//')
  echo $prop;
}

checkstatus () {
  stat=$(echo $1 | jq -r '.status' | sed 's/\r//')
  [[ $stat == ok ]]
  return $?;
}

devicename="testingdevice1"
cecho "Starting tests" $green

title "Create user"
user=$(./create_user.sh 2>/dev/null)
info $user
checkstatus "$user"; utest

title "Login and get token"
login=$(./login.sh 2>/dev/null)
info "$login"
token=$(echo $login | jq -r '.token' | sed 's/\r//')
[[ $token != "null" ]]; utest

title "Create device"
device=$(./new_device.sh $token $devicename 2>/dev/null)
info "$device"
checkstatus "$device"; utest

title "Check for device"
result=$(./get_devices.sh $token 2>/dev/null)
device=$(getproperty $result "$devicename")
short=$(echo $device | cut -c1-71)...
info "$short"
notnull $device ; utest

title "Delete device"
result=$(./delete_device.sh $token $devicename 2>/dev/null)
info "$result"
checkstatus "$result"; utest

if [ $fails -eq 0 ]; then
  cecho "$check Zero failures" $green
elif [ $fails -eq 1 ]; then
  cecho "$cross One failure" $red
else
  cecho "$cross $fails failures" $red
fi

