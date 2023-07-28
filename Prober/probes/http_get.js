import fetch from "node-fetch";
import * as https from "https";
import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";
import { responseToRaw } from "../../libs/raw_http.js";

const probe = {
    name: "http_get",
    description: "Just send a simple http request",
    id: "http_get",
    tags: ["protocol:tcp", "protocol:http"],
    /** @type {(scan_data:ScanData)=>Promise<Buffer>} */
    run: async function(scan_data) { 
        return await Promise.race([
            new Promise(res=> setTimeout(()=>{ res(Buffer.alloc(0)) }, scan_data.host_info.latency*10)),
            async ()=> {
                try {
                    if(scan_data.tags.includes("protocol:tls")) {
                        const https_agent = new https.Agent({
                            rejectUnauthorized: false,
                        });
                        const response = await fetch(`https://${scan_data.host_info.ip}:${scan_data.host_info.port}/`, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                            },
                            timeout: scan_data.host_info.latency*10,
                            agent: https_agent,
                        });
                        return await responseToRaw(response);
                    } else {
                        const response = await fetch(`http://${scan_data.host_info.ip}:${scan_data.host_info.port}/`, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                            },
                            timeout: scan_data.host_info.latency*10,
                        });
                        return await responseToRaw(response);
                    }
                } catch(e) {
                    return Buffer.alloc(0);
                }
            }
        ]);
    }
};

export default probe;