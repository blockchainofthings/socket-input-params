const net = require('net');
const fs = require('fs');
const expect = require('chai').expect;
const SocketInputParams = require('../index');

describe('Socket Input Parameters', function () {
    describe('Create new SocketInputParams instance', function () {
        it('should throw if no parameter is passed', function () {
            expect(() => {
                new SocketInputParams();
            }).to.throw(TypeError, 'SocketInputParams constructor: missing or invalid parameter \'opts\'');
        });

        it('should throw if a parameter of an inconsistent type is passed', function () {
            expect(() => {
                new SocketInputParams(0);
            }).to.throw(TypeError, 'SocketInputParams constructor: missing or invalid parameter \'opts\'');
        });

        it('should throw if options parameter does not contain required property', function () {
            expect(() => {
                new SocketInputParams({});
            }).to.throw(TypeError, 'SocketInputParams constructor: missing or invalid options property \'optionDefs\'');
        });

        it('should throw if property \'optionDefs\' of options parameter has an inconsistent type', function () {
            expect(() => {
                new SocketInputParams({optionDefs: 0});
            }).to.throw(TypeError, 'SocketInputParams constructor: missing or invalid options property \'optionDefs\'');
        });

        it('should succeed if only the required options are passed', function () {
            const sockInParams = new SocketInputParams({
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            expect(sockInParams.socketPath).to.equal('inputparams');
            expect(sockInParams.readTimeout).to.equal(60000);
        })

        it('should succeed when custom options are passed', function () {
            const sockInParams = new SocketInputParams({
                path: 'dir1/dir2',
                socketName: 'mysocket',
                readTimeout: 30000,
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            expect(sockInParams.socketPath).to.equal('dir1/dir2/mysocket');
            expect(sockInParams.readTimeout).to.equal(30000);
        })
    });

    describe('Receive input parameters (using callback)', function () {
        it('should throw if and invalid path is specified', function (done) {
            const sockInParams = new SocketInputParams({
                path: 'bla/bla/bla',
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            sockInParams.getCommandLineOptions((err, result) => {
                let error;

                try {
                    expect(result).to.not.exist;
                    expect(err).to.be.an.instanceOf(Error);
                    expect(err.message).to.match(/^Error reading data from Unix domain socket: /);
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });
        })

        it('should throw if received parameters do not match options definition', function (done) {
            const sockInParams = new SocketInputParams({
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            sockInParams.getCommandLineOptions((err, result) => {
                let error;

                try {
                    expect(result).to.not.exist;
                    expect(err).to.be.an.instanceOf(Error);
                    expect(err.message).to.match(/^Error parsing received input parameters: UNKNOWN_OPTION:/);
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });

            // Simulate passage of input parameters (with invalid option)
            net.createConnection(sockInParams.socketPath).end('-x');
        })

        it('should receive no input parameters if socket read times out', function (done) {
            const sockInParams = new SocketInputParams({
                readTimeout: 500,   // 500 ms
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            sockInParams.getCommandLineOptions((err, result) => {
                let error;

                try {
                    expect(err).to.not.exist;
                    expect(result).to.deep.equal({});
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });
        });

        it('should successfully retrieve command line options', function (done) {
            const sockInParams = new SocketInputParams({
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            sockInParams.getCommandLineOptions((err, result) => {
                let error;

                try {
                    expect(err).to.not.exist;
                    expect(result).to.deep.equal({
                        password: '123456'
                    });
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });

            // Simulate passage of input parameters
            net.createConnection(sockInParams.socketPath).end('-p 123456');
        });

        it('should succeed even if socket filename already exists', function (done) {
            const sockInParams = new SocketInputParams({
                readTimeout: 500,   // 500 ms
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            // Simulate existence of socket filename
            fs.writeFileSync(sockInParams.socketPath, '');

            sockInParams.getCommandLineOptions((err, result) => {
                let error;

                try {
                    expect(err).to.not.exist;
                    expect(result).to.deep.equal({
                        password: '123456'
                    });
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });

            setTimeout(() => {
                // Simulate passage of input parameters
                net.createConnection(sockInParams.socketPath).end('-p 123456');
            }, 100);
        });
    });

    describe('Receive input parameters (using promise)', function () {
        it('should throw if and invalid path is specified', function (done) {
            const sockInParams = new SocketInputParams({
                path: 'bla/bla/bla',
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            sockInParams.getCommandLineOptions()
            .then(result => {
                let error;

                try {
                    expect.fail('Function should not have succeeded');
                }
                catch (err) {
                    error = err;
                }

                done(error);
            })
            .catch(err => {
                let error;

                try {
                    expect(err).to.be.an.instanceOf(Error);
                    expect(err.message).to.match(/^Error reading data from Unix domain socket: /);
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });
        })

        it('should throw if received parameters do not match options definition', function (done) {
            const sockInParams = new SocketInputParams({
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            sockInParams.getCommandLineOptions()
            .then(result => {
                let error;

                try {
                    expect.fail('Function should not have succeeded');
                }
                catch (err) {
                    error = err;
                }

                done(error);
            })
            .catch(err => {
                let error;

                try {
                    expect(err).to.be.an.instanceOf(Error);
                    expect(err.message).to.match(/^Error parsing received input parameters: UNKNOWN_OPTION:/);
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });

            // Simulate passage of input parameters (with invalid option)
            net.createConnection(sockInParams.socketPath).end('-x');
        })

        it('should receive no input parameters if socket read times out', function (done) {
            const sockInParams = new SocketInputParams({
                readTimeout: 500,   // 500 ms
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });


            sockInParams.getCommandLineOptions()
            .then(result => {
                let error;

                try {
                    expect(result).to.deep.equal({});
                }
                catch (err) {
                    error = err;
                }

                done(error);
            })
            .catch(err => {
                let error;

                try {
                    expect.fail('Function should not have failed. Returned error: ' + err.toString());
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });
        });

        it('should successfully retrieve command line options', function (done) {
            const sockInParams = new SocketInputParams({
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            sockInParams.getCommandLineOptions()
            .then(result => {
                let error;

                try {
                    expect(result).to.deep.equal({
                        password: '123456'
                    });
                }
                catch (err) {
                    error = err;
                }

                done(error);
            })
            .catch(err => {
                let error;

                try {
                    expect.fail('Function should not have failed. Returned error: ' + err.toString());
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });

            // Simulate passage of input parameters
            net.createConnection(sockInParams.socketPath).end('-p 123456');
        });

        it('should succeed even if socket filename already exists', function (done) {
            const sockInParams = new SocketInputParams({
                readTimeout: 500,   // 500 ms
                optionDefs: {
                    name:'password',
                    alias: 'p'
                }
            });

            // Simulate existence of socket filename
            fs.writeFileSync(sockInParams.socketPath, '');

            sockInParams.getCommandLineOptions()
            .then(result => {
                let error;

                try {
                    expect(result).to.deep.equal({
                        password: '123456'
                    });
                }
                catch (err) {
                    error = err;
                }

                done(error);
            })
            .catch(err => {
                let error;

                try {
                    expect.fail('Function should not have failed. Returned error: ' + err.toString());
                }
                catch (err) {
                    error = err;
                }

                done(error);
            });

            setTimeout(() => {
                // Simulate passage of input parameters
                net.createConnection(sockInParams.socketPath).end('-p 123456');
            }, 100);
        });
    });
});