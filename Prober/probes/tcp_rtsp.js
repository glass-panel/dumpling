import * as net from "net";
import * as crypto from "crypto";
import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const probe = {
    name: "tcp_rtsp",
    description: "try to send a OPTIONS request to the port and see if it responds with RTSP",
    id: "tcp_rtsp",
    tags: ["protocol:tcp"],
    /** @type {(scan_data:ScanData)=>Promise<Buffer>} */
    run: async function(scan_data) {
        const socket = net.createConnection({
            host: scan_data.host_info.ip,
            port: scan_data.host_info.port,
        });
        const promise = util.readUntilIdle(socket, 1000, scan_data.host_info.latency*10).catch(()=>Buffer.alloc(0));
        const request = `OPTIONS * RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: LibVLC/3.0.11 (LIVE555 Streaming Media v2020.04.08)\r\n\r\n`;
        socket.write(request);
        const res = await promise;
        socket.destroy();
        const response_str = res.toString("ascii");
        const first_line = response_str.split("\r\n")[0];
        const match = first_line.match(/^RTSP\/\d\.\d (\d{3})/);
        if(match) {
            util.mergeTags(scan_data.tags, ["protocol:rtsp"]);
        }
        return Buffer.alloc(0);
    }
};

export default probe;