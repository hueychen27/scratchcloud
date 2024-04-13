const Scratch = require("../scratchcloud.cjs");
const creds = require("./credentials.json");
const cloud = new Scratch.User();
(async () => {
    const user = await cloud.login(creds.username, creds.password);
    console.log(user.csrfToken);
    console.log(user.dateJoined);
    console.log(user.xtoken);
    console.log(user.csrfToken);
    user.logout(true);
})()