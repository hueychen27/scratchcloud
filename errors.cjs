/**
 * Class for user errors
 */
class UserError extends Error {
    constructor (message) {
        super("User ERROR: " + message);
    }
}

class CloudError extends Error {
    constructor (message) {
        super("Cloud ERROR: " + message);
    }
}

module.exports.UserError = UserError;
module.exports.CloudError = CloudError;