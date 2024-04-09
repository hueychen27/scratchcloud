const Scratch = require("../scratchcloud.cjs");
const creds = require("./credentials.json");
(async () => {
    const user = await new Scratch.User().login(creds.username, creds.password);
    // await user.waitUntilXtokenDone(10000);
    // console.log(user.id)
})()