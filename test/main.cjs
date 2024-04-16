const Scratch = require("../scratchcloud.cjs");
const creds = require("./credentials.json");
const cloud = new Scratch.Session();
(async () => {
    const user = await cloud.login(creds.username, creds.password);
    console.log(user.xtoken);
    let data = await user.getMyStuffProjects(1, "love_count", "shared", true)
    console.log(data);
    user.logout(true);
})()