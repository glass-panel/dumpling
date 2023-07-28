import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const tagger = {
    name: "general_is_http",
    description: "check if the response is http response",
    id: "general_is_http",
    tags: ["protocol:tcp"],
    /** @type {(response:Buffer, scan_data:ScanData)=>Promise<string[]>} */
    run: async function(response, scan_data) {
        const result = [];
        const response_str = response.toString("ascii");
        const first_line = response_str.split("\r\n")[0];
        const match = first_line.match(/^HTTP\/\d\.\d (\d{3})/);
        if(match) {
            result.push("protocol:http");
            if(scan_data.tags.includes("protocol:tls"))
                result.push("protocol:https");
        }
        return result;
    }
};

export default tagger;