import * as net from "net";

import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const probe = {
    name: "tcp_blank",
    description: "Just connect to the port and see what happens",
    id: "tcp_blank",
    tags: [],
    /** @type {(scan_data:ScanData)=>Promise<Buffer>} */
    run: async function(scan_data) {
        const socket = net.createConnection({
            host: scan_data.host_info.ip,
            port: scan_data.host_info.port,
        });
        socket.once("connect", ()=> {
            scan_data.tags = util.mergeTags(scan_data.tags, ["protocol:tcp"]);
        });
        const res = await util.readUntilIdle(socket, 1000, scan_data.host_info.latency*10).catch(()=>Buffer.alloc(0));
        socket.destroy();
        return res;
    }
};

export default probe;