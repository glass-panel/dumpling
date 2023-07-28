import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const tagger = {
    name: "general_is_ssh",
    description: "check if the response is ssh response",
    id: "general_is_ssh",
    tags: ["protocol:tcp"],
    /** @type {(response:Buffer)=>Promise<string[]>} */
    run: async function(response) {
        const response_str = response.toString("ascii");
        const match = response_str.match(/^SSH-/im);
        if(match) {
            // "SSH-2.0-OpenSSH_8.4"
            const [ ssh_protocol, ssh_protocol_version ] = response_str.match(/^SSH-(\d\.\d)/im);
            // [ "SSH-2.0", "2.0" ]
            const server_software = response_str.match(new RegExp(`^${ssh_protocol}-(.+)`, 'im'))[1];
            // "OpenSSH_8.4"
            const [ server_name, version_info ] = server_software.split("-")[0].split("_");
            const server_version = version_info?.split(" ")[0];
            const system = version_info?.split(" ")[1];
            // [ "OpenSSH", "8.4" ]
            const result = ["protocol:ssh"]
                .concat(ssh_protocol_version? [`ssh_version:${ssh_protocol_version}`]: [])
                .concat(server_name? [`ssh_server:${server_name.toLowerCase()}`]: [])
                .concat(server_version? [`${server_name.toLowerCase()}_version:${server_version}`]: [])
                .concat(system? [`system:${system.toLowerCase()}`]: []);
            return result;
        }
        else
            return [];
    }
};

export default tagger;