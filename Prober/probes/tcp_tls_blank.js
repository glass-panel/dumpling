import * as tls from "tls";

import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const probe = {
    name: "tls_blank",
    description: "Try to establish tls connection",
    id: "tls_blank",
    tags: ["protocol:tcp"],
    /** @type {(scan_data:ScanData)=>Promise<Buffer>} */
    run: async function(scan_data) {
        let is_tls = false;
        const socket = tls.connect({
            host: scan_data.host_info.ip,
            port: scan_data.host_info.port,
            rejectUnauthorized: false,
        });
        /*socket.on("error", (err)=> {
            console.log("FFFFFFFF",err);
        })*/
        socket.once("secureConnect", ()=>{
            is_tls = true;
        });
        const res = await util.readUntilIdle(socket, 1000, scan_data.host_info.latency*10).catch(()=>Buffer.alloc(0));
        socket.destroy();
        if(is_tls)
            scan_data.tags = util.mergeTags(scan_data.tags, ["protocol:tls"]);
        return res;
    }
};

export default probe;