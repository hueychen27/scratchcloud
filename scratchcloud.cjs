const { UserError, CloudError } = require("./errors.cjs");
const { EventEmitter } = require("events");
const fetch = require("node-fetch");
const { Headers } = require("node-fetch");

const header = {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36',
    "x-csrftoken": "a",
    "x-requested-with": "XMLHttpRequest",
    "referer": "https://scratch.mit.edu"
}
/**
 * User Class for scratchcloud
 */
class User {
    /**
      * User ID for Scratch account
     */
    id = 0
    /**
     * Session ID for Scratch session
     */
    sessionId = ""
    /**
     * CSRF cookie token for Scratch session
     */
    csrfToken = ""
    /**
     * If the user is banned
     */
    banned = false
    /**
     * xtoken for Scratch session to enable access to extra Scratch features
     */
    xtoken = ""
    /**
     * If the user is a new Scratcher
     */
    newScratcher = false
    /**
     * If the user is an admin (Scratch team member)
     */
    admin = false
    /**
     * If the user is a Scratcher
     */
    scratcher = false
    /**
     * If the user is an educator
     */
    educator = false
    /**
     * If the user is a student
     */
    student = false
    /**
     * The data Scratch account joined (Format: YYYY-MM-DDTHH:MM:SS, Example: 2004-11-27T12:36:03)
     */
    dateJoined = "2000-01-01T00:00:00"
    /**
     * The URL of the user's profile picture (low resolution 32x32)
     */
    thumbnailUrl = ""
    /**
     * Username of the user (private property)
     */
    #username = ""
    /**
     * Headers for Scratch requests (private property)
     */
    #headers = header
    /**
     * Cookies to retrieve data about the user (private property)
     */
    #cookies = ""
    /**
     * Completed fetching xtoken (private property)
     */
    #fetchedXtoken = false

    constructor () { }

    /**
     * Login with session id (scratchcsrftoken cookie in scratch.mit.edu) and username to Scratch
     * @param {string} sessionId - Session ID (scratchcsrftoken cookie in scratch.mit.edu) to be used to login to Scratch
     * @param {string} username - Username to login to Scratch
     * @returns {Promise<User>}
     */
    async sessionLogin(sessionId = "", username = "") {
        this.sessionId = String(sessionId);
        this.#username = username;
        this.#cookies = {
            "scratchsessionsid": this.sessionId,
            "scratchcsrftoken": "a",
            "scratchlanguage": "en",
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        if ((sessionId != (undefined || ""))) {
            await this.#getXtoken();
            await this.#waitUntilXtokenDone(10000);
        }
        try {
            delete this.#headers["Cookie"];
        } catch {

        }
        return this;
    }

    /**
     * Get the Scratch user's xtoken and set user data if possible (private method)
     * @returns {Promise<void>}
     */
    async #getXtoken() {
        try {
            this.#fetchedXtoken = false;
            const headers = new Headers(header);
            headers.append("Cookie", `scratchsessionsid=${this.sessionId};scratchcsrftoken=a;scratchlanguage=en;`);
            const response = await fetch("https://scratch.mit.edu/session", {
                method: "POST",
                headers: headers,
                credentials: "include"
            });

            const data = await response.json();
            this.xtoken = data.user.token;
            this.#headers["X-Token"] = this.xtoken;
            this.id = data.user.id;
            this.banned = data.user.banned;
            this.#username = data.user.username;
            this.muteStatus = data.permissions.mute_status;
            this.newScratcher = data.permissions.new_scratcher;
            this.admin = data.permissions.admin;
            this.scratcher = data.permissions.scratcher;
            this.educator = data.permissions.educator;
            this.student = data.permissions.student;
            this.dateJoined = data.user.dateJoined;
            this.thumbnailUrl = data.user.thumbnailUrl.replace(/^\/\//, "");
            this.#fetchedXtoken = true;
        } catch (e) {
            if (this.#username == undefined) {
                console.warn("Could not fetch xtoken but you are logged in. Features will not work. Error: " + e);
            } else {
                console.warn("Could not fetch xtoken even though you are technically logged in. Error: " + e)
            }
        }
    }

    /**
     * Wait until the user's xtoken is done fetching
     * @returns {Promise<void>}
     */
    #waitUntilXtokenDone(timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error("Promise timed out"));
            }, timeout)
            const checkCondition = () => {
                if (this.#fetchedXtoken == true) {
                    clearTimeout(timeoutId);
                    resolve();
                } else {
                    setTimeout(checkCondition, 100);
                }
            };
            checkCondition();
        });
    }

    /**
     * Easy way to login with username and password to Scratch. This return the User object.
     * @param {string} username Username to login to Scratch
     * @param {string} password Password to login to Scratch
     * @returns {Promise<User>}
     */
    async login(username, password) {
        const data = JSON.stringify({ "username": username, "password": password })
        this.#headers = new Headers(header);
        this.#headers.append("Cookie", "scratchcsrftoken=a;scratchlanguage=en;");
        const res = await fetch("https://scratch.mit.edu/login/", {
            method: "POST",
            headers: this.#headers,
            body: data
        });
        let sessionId;
        try {
            this.csrfToken = res.headers.get("set-cookie").match(/scratchcsrftoken=([^;]+)/)[1];
            sessionId = String(res.headers.get("set-cookie").match(/scratchsessionsid=("[^"]+");/)[1]);
        } catch (e) {
            console.error(e);
            throw new UserError("Could not connect to Scratch. Error: " + e)
        }
        await this.sessionLogin(sessionId, username);
        await this.#waitUntilXtokenDone(10000);
        return this;
    }

    /**
     * Logs the user out of Scratch
     * @returns {Promise<boolean>}
     */
    async logout() {
        const res = await fetch('https://scratch.mit.edu/accounts/logout/', {
            method: 'POST',
            headers: this.#headers,
            body: "csrfmiddlewaretoken=a"
        });
        this.#getXtoken();
        if (res.status === 403) console.warn("WARN: Error logging out with status: " + res.status);
        return res.status !== 403;
    }
}

class Cloud extends EventEmitter {
    constructor () {
        super();
    }
}
module.exports.User = User;
module.exports.Cloud = Cloud;