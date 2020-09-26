/**
 * Created by claudio on 2020-09-24
 */

const path = require('path');
const net = require('net');
const fs = require('fs');
const commandLineArgs = require('command-line-args');
const shellParser = require('shell-parser');

/**
 * Unix socket input parameters
 */
class SocketInputParams {
    /**
     * Class constructor
     * @param {Object} opts Options object with the following properties:
     * @param {String} [opts.path] Path where Unix domain socket used to receive parameters should be created.
     *                              If no path is passed, the current directory ('.') is used.
     * @param {String} [opts.socketName] Name of Unix domain socket to be created. If no name is passed, the
     *                                    name 'inputparams' is used.
     * @param {Number} [opts.readTimeout] Timeout, in milliseconds, for reading data from Unix domain socket.
     *                                     If no timeout is passed, a default 60 seconds timeout is used.
     * @param {Object} opts.optionDefs Object defining the options to be expected as input parameters as defined
     *                                  by the 'command-line-args' Node.js module.
     */
    constructor(opts) {
        if (typeof opts !== 'object' || opts === null) {
            throw new TypeError('SocketInputParams constructor: missing or invalid parameter \'opts\'');
        }
        else if (typeof opts.optionDefs !== 'object' || opts.optionDefs === null) {
            throw new TypeError('SocketInputParams constructor: missing or invalid options property \'optionDefs\'');
        }

        this.socketPath = path.join(opts.path || '.', opts.socketName || 'inputparams');

        const readTimeout = Number.parseInt(opts.readTimeout);
        this.readTimeout = !Number.isNaN(readTimeout) ? readTimeout : 60000;

        this.optionsDefs = opts.optionDefs;
    }

    /**
     * Retrieve the command line options sent as input parameters over the Unix domain socket
     *
     * @param {Function} [callback] Callback function
     * @returns {Promise<Object>,undefined} If no callback is passed, a promise is returned. If the function succeeds,
     *                                       an object the properties of which are the parsed command line options
     *                                       is returned.
     */
    getCommandLineOptions(callback) {
        let result;

        // Prepare promise to be returned if no callback passed
        if (typeof callback !== 'function') {
            result = new Promise((resolve, reject) => {
                callback = (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res);
                    }
                }
            });
        }

        // Prepare to receive input parameters
        this._receiveInputParams()
        .then(inputParams => {
            let cmdLineOpts;

            try {
                cmdLineOpts = this._parseInputParams(inputParams);
            }
            catch (err) {
                callback(err);
                return;
            }

            callback(null, cmdLineOpts);
        }, err => {
            callback(err);
        });

        return result;
    }

    async _receiveInputParams() {
        const dataLine = await this._readSocketData();

        if (fs.existsSync(this.socketPath)) {
            // Try to delete input parameters socket
            fs.unlink(this.socketPath, () => {});
        }

        return shellParser(dataLine);
    }

    _readSocketData() {
        return new Promise((resolve, reject) => {
            let readData = Buffer.from('');
            let connSocket;
            let toHandle;

            function returnSuccess() {
                if (toHandle) {
                    // Cancel timeout
                    clearTimeout(toHandle);
                }

                resolve(readData.toString());
            }

            function returnError(err) {
                if (toHandle) {
                    // Cancel timeout
                    clearTimeout(toHandle);
                }

                reject(err);
            }

            const server = net.createServer((socket) => {
                connSocket = socket;

                socket.on('data', (data) => {
                    readData = Buffer.concat([readData, data], readData.length + data.length);
                });

                socket.on('end', () => {
                    // Close server and return
                    server.close();
                    returnSuccess();
                });
            });

            let retry = false;

            server.once('error', (err) => {
                // Error reading from Unix domain socket. Check if socket already exists and
                //  try to delete it if so
                let socketDeleted = false;

                if (fs.existsSync(this.socketPath)) {
                    // Try to delete Unix domain socket
                    try {
                        fs.unlinkSync(this.socketPath);
                        socketDeleted = true;
                    }
                    catch(err) {
                    }
                }

                if (err.code === 'EADDRINUSE' && !retry && socketDeleted) {
                    // Try connecting to Unix domain socket again
                    retry = true;

                    server.close();
                    server.listen(this.socketPath);
                }
                else {
                    // Close connection and return error
                    server.close();
                    returnError(new Error('Error reading data from Unix domain socket: ' + err.toString()));
                }
            })

            server.listen(this.socketPath);

            toHandle = setTimeout(() => {
                toHandle = undefined;

                if (connSocket) {
                    connSocket.destroy();
                }

                // Close connection and return
                server.close();
                returnSuccess();
            }, this.readTimeout);
        });
    }

    _parseInputParams(inputParams) {
        // Save original process arguments list
        const procArgv = process.argv;
        const argv = [
            procArgv[0],
            procArgv[1]
        ];

        inputParams.forEach(param => {argv.push(param)});
        process.argv = argv;

        let cmdLineOpts;

        try {
            cmdLineOpts = commandLineArgs(this.optionsDefs);
        }
        catch (err) {
            throw new Error('Error parsing received input parameters: ' + err.toString());
        }

        // Restore original process arguments list
        process.argv = procArgv;

        return cmdLineOpts;
    }
}

module.exports = SocketInputParams;