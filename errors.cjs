/**
 * Class for user errors
 */
class SessionError extends Error {
    constructor (message) {
        super("Session ERROR: " + message);
    }
}

class CloudError extends Error {
    constructor (message) {
        super("Cloud ERROR: " + message);
    }
}

module.exports.SessionError = SessionError;
module.exports.CloudError = CloudError;