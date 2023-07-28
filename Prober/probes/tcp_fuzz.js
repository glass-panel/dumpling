import * as net from "net";
import * as crypto from "crypto";
import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const probe = {
    name: "tcp_fuzz",
    description: "Just send random data to the port and see what happens",
    id: "tcp_fuzz",
    tags: ["protocol:tcp"],
    /** @type {(scan_data:ScanData)=>Promise<Buffer>} */
    run: async function(scan_data) {
        const socket = net.createConnection({
            host: scan_data.host_info.ip,
            port: scan_data.host_info.port,
        });
        const promise = util.readUntilIdle(socket, 1000, scan_data.host_info.latency*10).catch(()=>Buffer.alloc(0));
        socket.write(Buffer.from(crypto.randomBytes(1024)));
        socket.write("\r\n\r\n");
        socket.write(Buffer.from(crypto.randomBytes(1024)));
        socket.write("\r\n\r\n");
        const res = await promise;
        socket.destroy();
        return res;
    }
};

export default probe;