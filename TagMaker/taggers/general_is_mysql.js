import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const tagger = {
    name: "general_is_mysql",
    description: "check if the response is mysql response",
    id: "general_is_mysql",
    tags: ["protocol:tcp"],
    /** @type {(response:Buffer)=>Promise<string[]>} */
    run: async function(response) {
        const response_str = response.toString("ascii");
        const match = !!response_str.match(/^(\d)+(\.\d+)+(.|\n|\r)*(caching_sha2_password)|(mysql_native_password)/im);
        const block_match = !!response_str.match(/connection/i) && !!response_str.match(/mysqladmin/i);
        const block_match2 = !!response_str.match(/not allowed to connect/i) && !!response_str.match(/MySQL server/i);
        if(match || block_match || block_match2) {
            const result = ["protocol:mysql"];
            const mysql_version = response_str.match(/^(\d)+(\.\d+)+/im)?.[0];
            if(mysql_version)
                result.push(`mysql_version:${mysql_version}`);
            return result;
        } else
            return [];
    }
};

export default tagger;