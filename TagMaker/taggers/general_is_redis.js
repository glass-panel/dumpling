import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const tagger = {
    name: "general_is_redis",
    description: "check if the response is redis response",
    id: "general_is_redis",
    tags: ["protocol:tcp"],
    /** @type {(response:Buffer, scan_data:ScanData)=>Promise<string[]>} */
    run: async function(response, scan_data) {
        const result = [];
        const response_str = response.toString("ascii");
        const first_line = response_str.split("\r\n")[0];
        const match = first_line.match(/^-ERR unknown command/i);
        if(match) {
            result.push("protocol:redis");
        }
        return result;
    }
};

export default tagger;