# Socket Input Params

A Node.js module used to receive input parameters via a Unix domain socket.

## Rationale

This module has been put together to work around a limitation of the [Meteor platform](https://meteor.com) that (as of this
 writing) does not provide a way for input parameters to be passed to the target (server) application.
 
It is also useful for passing sensitive data like passwords to running applications, and avoid them to be accidentally
 disclosed if other, more conventional mechanisms like command line arguments and environment variables are used.
 
## How It Works

The module opens a Unix domain socket named `inputparams` in the current work directory, and waits for data to be
 received through it. The received data is then parsed, and the resulting command line options are returned to the
 calling application.
 
## Installation

```shell
npm install socket-input-params
```

## Usage

### Instantiate the socket input parameters object.

```javascript
const SocketInputParams = require('socket-input-params');

const sockInParams = new SocketInputParams({
    readTimeout: 30000,
    optionDefs: {
        name: 'password',
        alias: 'p'
    }
});
```

#### Constructor options

The following options can be used when instantiating the socket input parameters object:

- **path** \[String\] - (optional, default: <b>*'.'*</b>) Path where the Unix domain socket should be created.
- **socketName** \[String\] - (optional, default: <b>*'inputparams'*</b>) Name of the Unix domain socket to be created.
- **readTimeout** \[Number\] - (optional, default: <b>*60000*</b>) Timeout, in milliseconds, for reading data from the
 Unix domain socket.
- **optionDefs** \[Object\] - Object defining the command line options to be expected as input parameters as defined by
 the ['command-line-args'](https://github.com/75lb/command-line-args) Node.js module.

### Retrieve command line options

#### Using a callback

```javascript
sockInParams.getCommandLineOptions((err, result) => {
    if (err) {
        console.error('Error retrieving command line options', err);
    }
    else {
        console.log('Retrieved command line options', result);
    }
})
```

#### Using promise

```javascript
sockInParams.getCommandLineOptions()
.then(result => {
    console.log('Retrieved command line options', result);
})
.catch(err => {
    console.error('Error retrieving command line options', err);
});
```

#### Sample returned command line options

```javascript
{
    password: '123456'
}
```

> **Note**: for more examples of how command line options are returned, please refer to the ['command-line-args'](https://github.com/75lb/command-line-args)
> Node.js module.

## Passing parameters to the running application

The following is a sample shell script that can be used to pass input parameters (via Unix domain socket) to a running
 application (that makes use of this module).

```shell script
#!/bin/bash
# Script used to send input parameters to running application via Unix domain socket
#
# How to use it:
#  . any parameters to be passed should be preceded by '--'
#  . if no password parameter is passed (-p <psw>) the script will ask for a password to be entered

cd "$APP_DIR"

# Filter internal (before '--') and external (after '--') parameters
idx=0
delimiterFound=0
hasPswOption=0

for arg; do
  if [ $delimiterFound -eq 1 ]; then
    # Save external parameter (to be passed to running application)
    extParams[idx]="$arg"

    if [[ $arg == "-p" || $arg == "--password" ]]; then
      hasPswOption=1
    fi
  else
    if [ $arg == "--" ]; then
      delimiterFound=1
    else
      # Save internal parameter (to be interpreted by this script)
      intParams[idx]="$arg"
    fi
  fi

  ((idx++))
done

if [ $hasPswOption -ne 1 ]; then
  # Request user to enter password (to be passed to running application)
  echo -n "Enter password: "
  read -s psw
  echo

  # Add password to external parameters
  extParams[idx]="-p"
  ((idx++))
  extParams[idx]="$psw"
fi

tmout=60

# Wait for Unix domain socket used to input parameters to be created (by running application)
while [ ! -S ./inputparams ]; do
  if [ $tmout -eq 0 ]; then
    echo "Timeout waiting for input parameters socket"
    exit -1
  fi
  sleep 1
  ((tmout--))
done

extParamsList=""

for param in "${extParams[@]}"; do
  extParamsList="$extParamsList '$param'"
done

# Send external parameters to running application (through open Unix domain socket)
echo -n "$extParamsList" | nc -U ./inputparams
```

> **Note**: it is assumed that the environment variable $APP_DIR contains the path of the directory where the Unix
> domain socket created by the running application is located.

## License

This Node.js module is released under the [MIT License](LICENSE). Feel free to fork, and modify!

Copyright © 2020, Blockchain of Things Inc.