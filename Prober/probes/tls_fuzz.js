import * as net from "net";
import * as tls from "tls";
import * as util from "../../libs/util.js";
import * as crypto from "crypto";
//import { ScanData } from "../../libs/typedef.js";

const probe = {
    name: "tls_fuzz",
    description: "Just send random data to the tls socket and see what happens",
    id: "tls_fuzz",
    tags: ["protocol:tcp", "protocol:tls"],
    /** @type {(scan_data:ScanData)=>Promise<Buffer>} */
    run: async function(scan_data) {
        const socket = tls.connect({
            host: scan_data.host_info.ip,
            port: scan_data.host_info.port,
            rejectUnauthorized: false,
        });
        const promise = util.readUntilIdle(socket, 1000, scan_data.host_info.latency*10).catch(()=>Buffer.alloc(0));
        socket.write(Buffer.from(crypto.randomBytes(1024)));
        socket.write("\r\n\r\n");
        socket.write(Buffer.from(crypto.randomBytes(1024)));
        socket.write("\r\n\r\n");
        const response = await promise;
        socket.destroy();
        return response;
    }
};

export default probe;