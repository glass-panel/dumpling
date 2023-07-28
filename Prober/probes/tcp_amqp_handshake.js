import * as net from "net";

import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const payload = Buffer.from(
    "QU1RUAAACQE=", "base64"
);

const probe = {
    name: "amqp_handshake",
    description: "Try to handshake with amqp server",
    id: "amqp_handshake",
    tags: ["protocol:tcp"],
    /** @type {(scan_data:ScanData)=>Promise<Buffer>} */
    run: async function(scan_data) {
        const socket = net.createConnection({
            host: scan_data.host_info.ip,
            port: scan_data.host_info.port,
        });
        const promise = util.readUntilIdle(socket, 1000, scan_data.host_info.latency*10).catch(()=>Buffer.alloc(0));
        socket.write(payload);
        const response = await promise;
        socket.destroy();
        const response_string = response.toString("ascii");
        if(response_string.match(/publisher_confirm/) && response_string.match(/version/))
            scan_data.tags = util.mergeTags(scan_data.tags, ["protocol:amqp", "server:amqp"]);
        
        return Buffer.alloc(0);
    }
};

export default probe;