import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const tagger = {
    name: "general_is_ftp",
    description: "check if the response is ftp response",
    id: "general_is_ftp",
    tags: ["protocol:tcp"],
    /** @type {(response:Buffer, scan_data:ScanData)=>Promise<string[]>} */
    run: async function(response, scan_data) {
        const result = [];
        const response_str = response.toString("ascii");
        const first_line = response_str.split("\r\n")[0];
        const match = first_line.match(/^220.*FTP/i);
        if(match) {
            result.push("protocol:ftp");
        }
        return result;
    }
};

export default tagger;