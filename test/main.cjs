const Scratch = require("../scratchcloud.cjs");
const creds = require("./credentials.json");
const cloud = new Scratch.User();
(async () => {
    const user = await cloud.login(creds.username, creds.password);
    console.log(user.id);
    await user.logout();
    console.log(user.id)
})()