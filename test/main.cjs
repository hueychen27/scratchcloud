const Scratch = require("../scratchcloud.cjs");
const creds = require("./credentials.json");
const cloud = new Scratch.User();
(async () => {
    const user = await cloud.login(creds.username, creds.password);
    await user.waitUntilXtokenDone(10000);
    console.log(user.id)
})()