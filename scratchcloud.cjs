const { SessionError, CloudError } = require("./errors.cjs");
const { EventEmitter } = require("events");
const fetch = require("node-fetch");
const { Headers } = require("node-fetch");

const header = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36",
    "x-requested-with": "XMLHttpRequest",
    "referer": "https://scratch.mit.edu"
}
/**
 * User Class for scratchcloud
 * 
 * Note: All methods need authentication unless related to logging in or specified otherwise
 */
class Session {
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
     * If the user is a Scratch team member?
     */
    scratchteam = false
    /**
     * Status of the user (What I'm working on section)
     */
    status = ""
    /**
     * Bio of the user (About me description)
     */
    bio = ""
    /**
     * Specified country of user
     */
    country = ""
    /**
     * Username of the user
     */
    username = ""
    /**
     * Headers for Scratch requests (private property)
     * @type {Headers}
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
     * Reset all properties of the Session class.  
     * This does not log out of Scratch for session so use `logout(false)` to reset variables and log out.
     */
    reset() {
        this.id = 0;
        this.sessionId = "";
        this.csrfToken = "";
        this.banned = false;
        this.xtoken = "";
        this.newScratcher = false;
        this.admin = false;
        this.scratcher = false;
        this.educator = false;
        this.student = false;
        this.dateJoined = "2000-01-01T00:00:00";
        this.thumbnailUrl = "";
        this.scratchteam = false;
        this.status = "";
        this.bio = "";
        this.country = "";
        this.username = "";
        this.#headers = header;
        this.#cookies = "";
        this.#fetchedXtoken = false;
    }

    /**
     * Get URL search parameter from object
     * @param {object} object Object to use for URL search parameter
     * @returns {URLSearchParams} URL search parameter
     */
    searchParams(object) {
        return new URLSearchParams(object);
    } // Credits: https://stackoverflow.com/a/58437909

    /**
     * Setup headers (private method)
     * @param {string} [csrftoken="a"] csrftoken to use for headers in fetch requests (Default: "a")
     * @param {string} [customCookie=null] Custom cookie to use. Value of null sets cookie to `scratchcsrftoken=${csrftoken};scratchlanguage=en;` (Default: null)
     * @param {boolean} [setcsrftoken=true] Set the x-csrftoken header to specified csrftoken? (Default: true)
     */
    #setupHeaders(csrftoken = "a", customCookie = null, setcsrftoken = true) {
        this.#headers = new Headers(header);
        if (setcsrftoken) {
            this.#headers.append("x-csrftoken", csrftoken);
        }
        if (customCookie == null) {
            this.#headers.append("Cookie", `scratchcsrftoken=${csrftoken};scratchlanguage=en;`);
        } else {
            this.#headers.append("Cookie", customCookie);
        }
    }

    /**
     * Wrapper for #setupHeaders private method to setup authenticated headers with CSRF token and session id (private method)
     */
    #setupAuthenticatedHeaders() {
        this.#setupHeaders(this.csrfToken, `scratchsessionsid=${this.sessionId};scratchcsrftoken=${this.csrfToken};scratchlanguage=en;`);
    }

    /**
     * Login with session id (scratchcsrftoken cookie in scratch.mit.edu) and username to Scratch.
     * Note: The CSRF token can be any string.
     * @param {string} [sessionId=""] - Session ID (scratchcsrftoken cookie in scratch.mit.edu) to be used to login to Scratch (Default: "")
     * @param {string} [username=""] - Username to login to Scratch (Default: "")
     * @param {string} [csrftoken="a"] - CSRF token to use for headers in fetch requests (Default: "a")
     * @returns {Promise<Session>}
     */
    async sessionLogin(sessionId = "", username = "", csrftoken = "a") {
        this.sessionId = String(sessionId);
        this.username = username;
        this.#setupHeaders(csrftoken, `scratchsessionsid=${this.sessionId};scratchcsrftoken=${csrftoken};scratchlanguage=en;`);
        this.#cookies = {
            "scratchsessionsid": this.sessionId,
            "scratchcsrftoken": csrftoken,
            "scratchlanguage": "en",
            "accept": "application/json",
            "Content-Type": "application/json",
        }
        if ((sessionId != (undefined || ""))) {
            //! await this.#getCsrfToken(csrftoken); Since CSRF token can be anything, this serves no purpose here
            this.csrfToken = csrftoken;
            if (await this.#getXtoken()) await this.#waitUntilXtokenDone(10000);
        }
        try {
            delete this.#headers.delete("Cookie");
        } catch {

        }
        return this;
    }

    /**
     * Get the user's csrf token (private method)
     * @param {string} csrftoken CSRF token to use
     * @param {boolean} [generateNew=true] Generate a new CSRF token? Value of true ignores csrftoken param (Default: true)
     */
    async #getCsrfToken(csrftoken, generateNew = true) {
        if (generateNew) {
            this.#setupHeaders(undefined, `scratchsessionsid=${this.sessionId};scratchlanguage=en;`);
            const res = await fetch("https://scratch.mit.edu/csrf_token/", {
                method: "GET",
                headers: this.#headers
            })
            this.csrfToken = res.headers.get("set-cookie").split("scratchcsrftoken=")[1].split(";")[0];
        } else {
            this.csrfToken = csrftoken;
        }
        this.#cookies.scratchcsrftoken = this.csrfToken;
    }

    /**
     * Get the Scratch user's xtoken and set user data if possible (private method)
     * @returns {Promise<void>}
     */
    async #getXtoken() {
        try {
            this.#fetchedXtoken = false;
            this.#setupAuthenticatedHeaders();
            const response = await fetch("https://scratch.mit.edu/session", {
                method: "POST",
                headers: this.#headers
            });

            const data = await response.json();
            this.xtoken = data.user.token;
            this.#headers["X-Token"] = this.xtoken;
            this.id = data.user.id;
            this.banned = data.user.banned;
            this.username = data.user.username;
            this.muteStatus = data.permissions.mute_status;
            this.newScratcher = data.permissions.new_scratcher;
            this.admin = data.permissions.admin;
            this.scratcher = data.permissions.scratcher;
            this.educator = data.permissions.educator;
            this.student = data.permissions.student;
            this.dateJoined = data.user.dateJoined;
            this.thumbnailUrl = data.user.thumbnailUrl.replace(/^\/\//, "");
            this.#fetchedXtoken = true;
            await this.getUserData();
            return true;
        } catch (e) {
            if (this.username == undefined) {
                console.warn("Could not fetch xtoken but you are logged in. Features will not work. Error: " + e);
            } else {
                console.warn("Could not fetch xtoken even though you are technically logged in. Error: " + e)
            }
            return false;
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
     * @returns {Promise<Session>}
     */
    async login(username, password) {
        const data = JSON.stringify({ "username": username, "password": password })
        this.#setupHeaders();
        const res = await fetch("https://scratch.mit.edu/login/", {
            method: "POST",
            headers: this.#headers,
            body: data
        });
        let sessionId;
        try {
            this.csrfToken = res.headers.get("set-cookie").match(/scratchcsrftoken=([^;]+)/)[1]; //? Do I need this?
            sessionId = String(res.headers.get("set-cookie").match(/scratchsessionsid=("[^"]+");/)[1]);
        } catch (e) {
            console.error(e);
            throw new SessionError("Could not connect to Scratch. Error: " + e)
        }
        await this.sessionLogin(sessionId, username, this.csrfToken);
        await this.#waitUntilXtokenDone(10000);
        return this;
    }

    /**
     * Logs the user out of Scratch
     * @param {boolean} [keep=false] Keep the static data retrieved from signing in? (Default: false)
     * @returns {Promise<boolean>}
     */
    async logout(keep = false) {
        this.#setupAuthenticatedHeaders();
        const res = await fetch('https://scratch.mit.edu/accounts/logout/', {
            method: 'POST',
            headers: this.#headers,
            csrfmiddlewaretoken: this.csrfToken
        });
        this.csrfToken = "";
        this.sessionId = "";
        if (!keep) {
            this.reset();
        }
        if (res.status == 200) {
            if (!keep) {
                console.log("INFO: The static data retrieved from signing in has been kept. Pass true to the parameter to not keep.");
            }
        } else {
            console.warn("WARN: Error logging out with status: " + res.status)
        };
        return res.status == 200;
    }

    /**
     * Get user data from Scratch: Scratch team, status (What I'm working on), bio (About me), and country along with other properties of the object.
     * @param {string} [username=this.username] Username to use (Default: current username)
     * @returns {Promise<object>}
     */
    async getUserData(username = this.username) {
        this.#setupAuthenticatedHeaders();
        const res = await fetch(`https://api.scratch.mit.edu/users/${username}`, {
            method: "GET",
            headers: this.#headers,
        })
        const data = await res.json();
        this.scratchteam = data.scratchteam;
        this.status = data.profile.status;
        this.bio = data.profile.bio;
        this.country = data.profile.country;
        return data;
    }

    /**
     * Return username's project data (no authentication needed)
     * @param {string} [username=this.username] Username to use (Default: current username)
     * @param {number} [limit=20] Number of projects to return (Default: 20, Max: 40, Min: 0)
     * @param {number} [offset=0] Offset of projects (from newest) to return (Default: 0, Max: Projects user has, Min: 0)
     * @returns {Promise<object[]>} An array with objects in the following format:
```javascript
{
    id: 945784094,
    title: string,
    description: string,
    visibility: string,
    public: boolean,
    comments_allowed: boolean,
    is_published: boolean,
    author: {
        id: number,
        scratchteam: boolean,
        history: [Object: { joined: 'YYYY-MM-DDTHH:MM:SS.000Z' }],
        profile: [Object:
            {
                id: number | null,
                images: {
                    '90x90': 'https://cdn2.scratch.mit.edu/get_image/user/{projectId}_90x90.png?v=',
                    '60x60': 'https://cdn2.scratch.mit.edu/get_image/user/{projectId}_60x60.png?v=',
                    '55x55': 'https://cdn2.scratch.mit.edu/get_image/user/{projectId}_55x55.png?v=',
                    '50x50': 'https://cdn2.scratch.mit.edu/get_image/user/{projectId}_50x50.png?v=',
                    '32x32': 'https://cdn2.scratch.mit.edu/get_image/user/{projectId}_32x32.png?v='
                }
            }]
    },
    image: 'https://cdn2.scratch.mit.edu/get_image/project/{imageId}_480x360.png',
    images: {
        '282x218': 'https://cdn2.scratch.mit.edu/get_image/project/{imageId}_282x218.png?v={number}',
        '216x163': 'https://cdn2.scratch.mit.edu/get_image/project/{imageId}_216x163.png?v={number}',
        '200x200': 'https://cdn2.scratch.mit.edu/get_image/project/{imageId}_200x200.png?v={number}',
        '144x108': 'https://cdn2.scratch.mit.edu/get_image/project/{imageId}_144x108.png?v={number}',
        '135x102': 'https://cdn2.scratch.mit.edu/get_image/project/{imageId}_135x102.png?v={number}',
        '100x80': 'https://cdn2.scratch.mit.edu/get_image/project/{imageId}_100x80.png?v={number}'
    },
    history: {
        created: 'YYYY-MM-DDTHH:MM:SS.000Z',
        modified: 'YYYY-MM-DDTHH:MM:SS.000Z',
        shared: 'YYYY-MM-DDTHH:MM:SS.000Z'
    },
    stats: { views: number, loves: number, favorites: number, remixes: number },
    remix: { parent: projectId | null, root: projectId | null }
}
```
     */
    async getProjectsByUser(username = this.username, offset = 0, limit = 40) {
        const res = await fetch(`https://api.scratch.mit.edu/users/${username}/projects?` + this.searchParams({ offset, limit }), {
            method: "GET"
        })
        const data = await res.json();
        return data;
    }

    /**
     * Returns the user's "My stuff" projects
     * @param {number} [page=1] Page number of "My stuff" section on Scratch (Default: 1)
     * @param {string} [sortMethod=""] Sort method to use:
     * - "" - based on last modified
     * - "view_count" - based on number of views
     * - "love_count" - based on number of loves
     * - "remixers_count" - based on number of remixers
     * - "title" - based on title of projects (Default: "")
     * @param {string} [type=""] Type of projects to return:
     * - "all" - all projects
     * - "shared" - only shared projects
     * - "unshared" - only unshared projects
     * - "trashed" - only projects in the Trash section (Default: "")
     * @param {boolean} [descending=true] Should the sort method be descending? (Default: true)
     * @returns {Promise<object[]>} An array with objects in the following format:
     * ```javascript
{
    fields: {
        view_count: number,
        favorite_count: number,
        remixers_count: number,
        creator: {
            username: string,
            pk: number,
            thumbnail_url: '//uploads.scratch.mit.edu/users/avatars/{projectId}.png',
            admin: boolean
        },
        title: string,
        isPublished: boolean,
        datetime_created: 'YYYY-MM-DDTHH:MM:SS',
        thumbnail_url: '//uploads.scratch.mit.edu/projects/thumbnails/{projectId}.png',
        visibility: string,
        love_count: number,
        datetime_modified: 'YYYY-MM-DDTHH:MM:SS',
        uncached_thumbnail_url: '//cdn2.scratch.mit.edu/get_image/project/{projectId}_100x80.png',
        thumbnail: '{projectId}.png',
        datetime_shared: 'YYYY-MM-DDTHH:MM:SS',
        commenters_count: number
    },
    model: string,
    pk: number
}
```
     */
    async getMyStuffProjects(page = 1, sortMethod = "", type = "", descending = true) {
        this.#setupAuthenticatedHeaders();
        console.log(`https://scratch.mit.edu/site-api/projects/${type}?` + this.searchParams({ page, ascsort: !descending ? sortMethod : "", descsort: descending ? sortMethod : "" }))
        const res = await fetch(`https://scratch.mit.edu/site-api/projects/${type}?` + this.searchParams({ page, ascsort: !descending ? sortMethod : "", descsort: descending ? sortMethod : "" }), {
            method: "GET",
            headers: this.#headers
        })
        const data = await res.json();
        return data; // TODO: Make data interactable to the Scratch servers
    }
}

class Cloud extends EventEmitter {
    constructor () {
        super();
    }
    // TODO: Add cloud functionality here
}
module.exports.Session = Session;
module.exports.Cloud = Cloud;