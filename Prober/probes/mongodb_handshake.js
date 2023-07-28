import * as net from "net";

import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

const payload = Buffer.from(
    "EAEAAAEAAAAAAAAA1AcAAAAAAABhZG1pbi4kY21kAAAAAAABAAAA6QAAAAhpc21hc3RlcgABA2NsaWVudAC/AAAAA2RyaXZlcgApAAAAAm5hbWUABwAAAG5vZGVqcwACdmVyc2lvbgAGAAAAMy42LjAAAANvcwBYAAAAAnR5cGUACwAAAFdpbmRvd3NfTlQAAm5hbWUABgAAAHdpbjMyAAJhcmNoaXRlY3R1cmUABAAAAHg2NAACdmVyc2lvbgALAAAAMTAuMC4xOTA0NQAAAnBsYXRmb3JtAB8AAAAnTm9kZS5qcyB2MTYuMTkuMSwgTEUgKGxlZ2FjeSkAAARjb21wcmVzc2lvbgAFAAAAAAA=", 
    "base64"
);

const probe = {
    name: "mongodb_handshake",
    description: "Try to handshake with mongodb",
    id: "mongodb_handshake",
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
        if(response_string.match(/minWireVersion/) && response_string.match(/maxBsonObjectSize/))
            scan_data.tags = util.mergeTags(scan_data.tags, ["protocol:mongodb", "server:mongodb"]);
        return Buffer.alloc(0);
    }
};

export default probe;